from fastapi import FastAPI, APIRouter, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import os
import re
import logging
from pathlib import Path
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ────────────────────────────────────────────────────────────────

async def get_next_id(collection_name: str) -> int:
    result = await db.counters.find_one_and_update(
        {"_id": collection_name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return result["seq"]


def serialize(doc: dict) -> dict:
    if doc is None:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    name: str
    address: str = ""


class ProductCreate(BaseModel):
    name: str
    defaultPrice: float = 0.0


class InvoiceItemIn(BaseModel):
    itemName: str = ""
    qty: float = 1
    price: float = 0
    discount: float = 0
    discountType: str = "percent"


class InvoiceCreate(BaseModel):
    invoiceNumber: str
    date: str
    dueDate: Optional[str] = None
    customerName: str = ""
    customerAddress: str = ""
    isDraft: bool = True
    status: str = "draft"
    items: List[InvoiceItemIn] = []


class BulkStatusUpdate(BaseModel):
    ids: List[int]
    status: str


class BulkDelete(BaseModel):
    ids: List[int]


# ─── Business Logic ──────────────────────────────────────────────────────────

def compute_line_total(item: dict) -> float:
    gross = item["qty"] * item["price"]
    if item.get("discountType") == "amount":
        return max(0.0, gross - item.get("discount", 0))
    return gross * (1 - item.get("discount", 0) / 100)


def compute_totals(items: list) -> tuple:
    subtotal = sum(i["qty"] * i["price"] for i in items)
    grand_total = sum(compute_line_total(i) for i in items)
    return subtotal, grand_total


def generate_invoice_number(count: int) -> str:
    now = datetime.now(timezone.utc)
    yy = str(now.year)[2:]
    mm = str(now.month).zfill(2)
    seq = str(count + 1).zfill(3)
    return f"AZ-{yy}{mm}-{seq}"


def serialize_invoice(doc: dict) -> dict:
    if not doc:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    doc["subtotal"] = float(doc.get("subtotal", 0))
    doc["grandTotal"] = float(doc.get("grandTotal", 0))
    doc.setdefault("dueDate", None)
    items = doc.get("items", [])
    for item in items:
        item["qty"] = float(item.get("qty", 0))
        item["price"] = float(item.get("price", 0))
        item["discount"] = float(item.get("discount", 0))
        item["total"] = float(item.get("total", 0))
        item.setdefault("discountType", "percent")
    doc["items"] = items
    return doc


VALID_STATUSES = {"draft", "unpaid", "paid", "overdue"}
DATE_REGEX = re.compile(r"^\d{4}-\d{2}-\d{2}$")

NET_DAYS = 30  # Invoices are due NET-30


async def mark_overdue_invoices():
    """Update unpaid invoices past their due date (or date+30 days fallback) to overdue."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    fallback_cutoff = (datetime.now(timezone.utc) - timedelta(days=NET_DAYS)).strftime("%Y-%m-%d")

    # Invoices with explicit dueDate set
    r1 = await db.invoices.update_many(
        {"status": "unpaid", "dueDate": {"$exists": True, "$ne": None, "$lte": today}},
        {"$set": {"status": "overdue", "isDraft": False}},
    )
    # Invoices without dueDate – use invoice date + NET_DAYS
    r2 = await db.invoices.update_many(
        {"status": "unpaid", "$or": [{"dueDate": None}, {"dueDate": {"$exists": False}}], "date": {"$lte": fallback_cutoff}},
        {"$set": {"status": "overdue", "isDraft": False}},
    )
    total = r1.modified_count + r2.modified_count
    if total:
        logger.info(f"Marked {total} invoice(s) as overdue")


# ─── Customers Routes ────────────────────────────────────────────────────────

@api_router.get("/customers")
async def list_customers():
    docs = await db.customers.find({}, {"_id": 0}).sort("createdAt", 1).to_list(1000)
    return docs


@api_router.post("/customers", status_code=201)
async def create_customer(body: CustomerCreate):
    cid = await get_next_id("customers")
    doc = {
        "id": cid,
        "name": body.name.strip(),
        "address": body.address.strip(),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.customers.insert_one(doc)
    return serialize(doc)


@api_router.put("/customers/{cid}")
async def update_customer(cid: int, body: CustomerCreate):
    doc = await db.customers.find_one_and_update(
        {"id": cid},
        {"$set": {"name": body.name.strip(), "address": body.address.strip()}},
        return_document=True
    )
    if not doc:
        raise HTTPException(404, "Customer not found")
    return serialize(doc)


@api_router.delete("/customers/{cid}", status_code=204)
async def delete_customer(cid: int):
    result = await db.customers.delete_one({"id": cid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Customer not found")


# ─── Products Routes ─────────────────────────────────────────────────────────

@api_router.get("/products")
async def list_products():
    docs = await db.products.find({}, {"_id": 0}).sort("createdAt", 1).to_list(1000)
    for d in docs:
        d["defaultPrice"] = float(d.get("defaultPrice", 0))
    return docs


@api_router.post("/products", status_code=201)
async def create_product(body: ProductCreate):
    pid = await get_next_id("products")
    doc = {
        "id": pid,
        "name": body.name.strip(),
        "defaultPrice": float(body.defaultPrice),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    await db.products.insert_one(doc)
    return serialize(doc)


@api_router.put("/products/{pid}")
async def update_product(pid: int, body: ProductCreate):
    doc = await db.products.find_one_and_update(
        {"id": pid},
        {"$set": {"name": body.name.strip(), "defaultPrice": float(body.defaultPrice)}},
        return_document=True
    )
    if not doc:
        raise HTTPException(404, "Product not found")
    result = serialize(doc)
    result["defaultPrice"] = float(result.get("defaultPrice", 0))
    return result


@api_router.delete("/products/{pid}", status_code=204)
async def delete_product(pid: int):
    result = await db.products.delete_one({"id": pid})
    if result.deleted_count == 0:
        raise HTTPException(404, "Product not found")


# ─── Invoices Routes ─────────────────────────────────────────────────────────

@api_router.patch("/invoices/bulk-status")
async def bulk_update_status(body: BulkStatusUpdate):
    if body.status not in VALID_STATUSES:
        raise HTTPException(400, f"Invalid status. Valid: {VALID_STATUSES}")
    result = await db.invoices.update_many(
        {"id": {"$in": body.ids}},
        {"$set": {"status": body.status, "isDraft": body.status == "draft"}}
    )
    return {"updated": result.modified_count}


@api_router.post("/invoices/bulk-delete")
async def bulk_delete_invoices(body: BulkDelete):
    result = await db.invoices.delete_many({"id": {"$in": body.ids}})
    return {"deleted": result.deleted_count}


@api_router.get("/invoices/next-number")
async def get_next_invoice_number():
    now = datetime.now(timezone.utc)
    yy = str(now.year)[2:]
    mm = str(now.month).zfill(2)
    prefix = f"AZ-{yy}{mm}-"
    count = await db.invoices.count_documents({"invoiceNumber": {"$regex": f"^{re.escape(prefix)}"}})
    return {"invoiceNumber": generate_invoice_number(count)}


@api_router.get("/invoices")
async def list_invoices(
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
):
    await mark_overdue_invoices()

    query = {}
    conditions = []

    if search:
        conditions.append({
            "$or": [
                {"invoiceNumber": {"$regex": search, "$options": "i"}},
                {"customerName": {"$regex": search, "$options": "i"}},
            ]
        })

    if status and status in VALID_STATUSES:
        conditions.append({"status": status})

    if dateFrom and DATE_REGEX.match(dateFrom):
        conditions.append({"date": {"$gte": dateFrom}})

    if dateTo and DATE_REGEX.match(dateTo):
        conditions.append({"date": {"$lte": dateTo}})

    if conditions:
        query = {"$and": conditions}

    docs = await db.invoices.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return [serialize_invoice(d) for d in docs]


@api_router.post("/invoices", status_code=201)
async def create_invoice(body: InvoiceCreate):
    if not body.invoiceNumber or not body.date:
        raise HTTPException(400, "invoiceNumber and date are required")

    items = [i.model_dump() for i in body.items]
    subtotal, grand_total = compute_totals(items)
    resolved_status = body.status if body.status in VALID_STATUSES else ("draft" if body.isDraft else "unpaid")

    # Default due date: invoice date + NET_DAYS if not provided
    due_date = body.dueDate
    if not due_date and DATE_REGEX.match(body.date):
        invoice_date = datetime.strptime(body.date, "%Y-%m-%d")
        due_date = (invoice_date + timedelta(days=NET_DAYS)).strftime("%Y-%m-%d")

    inv_id = await get_next_id("invoices")
    doc = {
        "id": inv_id,
        "invoiceNumber": body.invoiceNumber,
        "date": body.date,
        "dueDate": due_date,
        "customerName": body.customerName,
        "customerAddress": body.customerAddress,
        "subtotal": subtotal,
        "grandTotal": grand_total,
        "isDraft": body.isDraft,
        "status": resolved_status,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "items": [{**i, "total": compute_line_total(i)} for i in items],
    }
    await db.invoices.insert_one(doc)
    return serialize_invoice(doc)


@api_router.get("/invoices/{inv_id}")
async def get_invoice(inv_id: int):
    doc = await db.invoices.find_one({"id": inv_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Invoice not found")
    return serialize_invoice(doc)


@api_router.put("/invoices/{inv_id}")
async def update_invoice(inv_id: int, body: InvoiceCreate):
    existing = await db.invoices.find_one({"id": inv_id})
    if not existing:
        raise HTTPException(404, "Invoice not found")

    items = [i.model_dump() for i in body.items]
    subtotal, grand_total = compute_totals(items)
    resolved_status = body.status if body.status in VALID_STATUSES else existing.get("status", "draft")

    due_date = body.dueDate
    if not due_date and DATE_REGEX.match(body.date):
        invoice_date = datetime.strptime(body.date, "%Y-%m-%d")
        due_date = (invoice_date + timedelta(days=NET_DAYS)).strftime("%Y-%m-%d")

    update_data = {
        "invoiceNumber": body.invoiceNumber,
        "date": body.date,
        "dueDate": due_date,
        "customerName": body.customerName,
        "customerAddress": body.customerAddress,
        "subtotal": subtotal,
        "grandTotal": grand_total,
        "isDraft": body.isDraft,
        "status": resolved_status,
        "items": [{**i, "total": compute_line_total(i)} for i in items],
    }

    doc = await db.invoices.find_one_and_update(
        {"id": inv_id},
        {"$set": update_data},
        return_document=True
    )
    return serialize_invoice(doc)


@api_router.delete("/invoices/{inv_id}", status_code=204)
async def delete_invoice(inv_id: int):
    result = await db.invoices.delete_one({"id": inv_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Invoice not found")


# ─── Dashboard ───────────────────────────────────────────────────────────────

@api_router.get("/dashboard")
async def get_dashboard():
    await mark_overdue_invoices()

    all_invoices = await db.invoices.find({}, {"_id": 0}).to_list(5000)

    total_revenue = sum(inv.get("grandTotal", 0) for inv in all_invoices if inv.get("status") == "paid")
    outstanding = sum(inv.get("grandTotal", 0) for inv in all_invoices if inv.get("status") in ("unpaid", "overdue"))

    now = datetime.now(timezone.utc)
    this_month_str = f"{now.year}-{str(now.month).zfill(2)}"
    this_month_revenue = sum(
        inv.get("grandTotal", 0)
        for inv in all_invoices
        if inv.get("status") == "paid" and inv.get("date", "")[:7] == this_month_str
    )

    # Status counts
    status_counts = {"draft": 0, "unpaid": 0, "paid": 0, "overdue": 0}
    for inv in all_invoices:
        s = inv.get("status", "draft")
        if s in status_counts:
            status_counts[s] += 1

    # Monthly revenue — last 6 months
    monthly_data = defaultdict(lambda: {"revenue": 0.0, "count": 0})
    for inv in all_invoices:
        if inv.get("status") == "paid" and inv.get("date"):
            month_key = inv["date"][:7]  # YYYY-MM
            monthly_data[month_key]["revenue"] += float(inv.get("grandTotal", 0))
            monthly_data[month_key]["count"] += 1

    # Build last 6 months list
    months = []
    for i in range(5, -1, -1):
        d = datetime(now.year, now.month, 1) - timedelta(days=i * 30)
        key = f"{d.year}-{str(d.month).zfill(2)}"
        label = d.strftime("%b %Y")
        months.append({
            "month": label,
            "key": key,
            "revenue": round(monthly_data[key]["revenue"]),
            "count": monthly_data[key]["count"],
        })

    # Recent invoices — last 5
    recent = sorted(all_invoices, key=lambda x: x.get("createdAt", ""), reverse=True)[:5]
    recent_serialized = [serialize_invoice(dict(inv)) for inv in recent]

    return {
        "totalRevenue": round(total_revenue),
        "outstanding": round(outstanding),
        "thisMonthRevenue": round(this_month_revenue),
        "invoiceCount": len(all_invoices),
        "statusCounts": status_counts,
        "monthlyRevenue": months,
        "recentInvoices": recent_serialized,
    }


# ─── Health ──────────────────────────────────────────────────────────────────

@api_router.get("/")
async def root():
    return {"message": "AZ Distribution Invoice Manager API"}


# ─── Seed Data ───────────────────────────────────────────────────────────────

async def seed_data():
    customer_count = await db.customers.count_documents({})
    if customer_count == 0:
        customers = [
            {"name": "Shoaib Hardware Store", "address": "Main Bazaar, Mirpur AK"},
            {"name": "Ali Electronics", "address": "New Town, Mirpur AK"},
            {"name": "Bilal Traders", "address": "Chakswari Road, Mirpur AK"},
        ]
        for c in customers:
            cid = await get_next_id("customers")
            await db.customers.insert_one({
                "id": cid,
                "name": c["name"],
                "address": c["address"],
                "createdAt": datetime.now(timezone.utc).isoformat(),
            })
        logger.info("Seeded 3 customers")

    product_count = await db.products.count_documents({})
    if product_count == 0:
        products = [
            {"name": "Wall Paint 10L", "defaultPrice": 3500},
            {"name": "Paint Brush Set", "defaultPrice": 450},
            {"name": "Masking Tape", "defaultPrice": 120},
            {"name": "Roller Set", "defaultPrice": 650},
            {"name": "Paint Thinner 5L", "defaultPrice": 800},
        ]
        for p in products:
            pid = await get_next_id("products")
            await db.products.insert_one({
                "id": pid,
                "name": p["name"],
                "defaultPrice": float(p["defaultPrice"]),
                "createdAt": datetime.now(timezone.utc).isoformat(),
            })
        logger.info("Seeded 5 products")


app.include_router(api_router)


@app.on_event("startup")
async def startup():
    await seed_data()
    await mark_overdue_invoices()


@app.on_event("shutdown")
async def shutdown():
    client.close()
