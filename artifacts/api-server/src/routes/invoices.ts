import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable, invoiceItemsTable } from "@workspace/db/schema";
import { eq, like, or, desc, and, sql } from "drizzle-orm";

const router = Router();

function generateInvoiceNumber(count: number): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const seq = String(count + 1).padStart(3, "0");
  return `AZ-${yy}${mm}-${seq}`;
}

type ParsedItem = { qty: number; price: number; discount: number; discountType: string };

function computeLineTotal(item: ParsedItem): number {
  const gross = item.qty * item.price;
  if (item.discountType === "amount") {
    return Math.max(0, gross - item.discount);
  }
  return gross * (1 - item.discount / 100);
}

function computeTotals(items: ParsedItem[]) {
  let subtotal = 0;
  let grandTotal = 0;
  for (const item of items) {
    subtotal += item.qty * item.price;
    grandTotal += computeLineTotal(item);
  }
  return { subtotal, grandTotal };
}

async function getInvoiceWithItems(id: number) {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!invoice) return null;
  const rawItems = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));
  return {
    ...invoice,
    subtotal: parseFloat(String(invoice.subtotal)),
    grandTotal: parseFloat(String(invoice.grandTotal)),
    items: rawItems.map((item) => ({
      ...item,
      qty: parseFloat(String(item.qty)),
      price: parseFloat(String(item.price)),
      discount: parseFloat(String(item.discount)),
      discountType: (item.discountType ?? "percent") as "percent" | "amount",
      total: parseFloat(String(item.total)),
    })),
  };
}

router.get("/invoices/next-number", async (_req, res) => {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `AZ-${yy}${mm}-`;
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(invoicesTable)
    .where(like(invoicesTable.invoiceNumber, `${prefix}%`));
  const count = result[0]?.count ?? 0;
  res.json({ invoiceNumber: generateInvoiceNumber(count) });
});

router.get("/invoices", async (req, res) => {
  const search = req.query.search as string | undefined;
  let invoices;
  if (search) {
    invoices = await db
      .select()
      .from(invoicesTable)
      .where(
        or(
          like(invoicesTable.invoiceNumber, `%${search}%`),
          like(invoicesTable.customerName, `%${search}%`)
        )
      )
      .orderBy(desc(invoicesTable.createdAt));
  } else {
    invoices = await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt));
  }

  const invoicesWithItems = await Promise.all(
    invoices.map(async (inv) => {
      const items = await db.select().from(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, inv.id));
      return {
        ...inv,
        subtotal: parseFloat(inv.subtotal as string),
        grandTotal: parseFloat(inv.grandTotal as string),
        items: items.map((item) => ({
          ...item,
          qty: parseFloat(item.qty as string),
          price: parseFloat(item.price as string),
          discount: parseFloat(item.discount as string),
          discountType: (item.discountType ?? "percent") as "percent" | "amount",
          total: parseFloat(item.total as string),
        })),
      };
    })
  );

  res.json(invoicesWithItems);
});

router.post("/invoices", async (req, res) => {
  const { invoiceNumber, date, customerName, customerAddress, isDraft, status, items } = req.body;

  if (!invoiceNumber || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const parsedItems: (ParsedItem & { itemName: string })[] = (items ?? []).map((item: { itemName: string; qty: number; price: number; discount: number; discountType?: string }) => ({
    itemName: item.itemName,
    qty: item.qty,
    price: item.price,
    discount: item.discount,
    discountType: item.discountType === "amount" ? "amount" : "percent",
  }));

  const { subtotal, grandTotal } = computeTotals(parsedItems);

  const resolvedStatus = status ?? (isDraft ? "draft" : "unpaid");

  const [invoice] = await db
    .insert(invoicesTable)
    .values({
      invoiceNumber,
      date,
      customerName,
      customerAddress: customerAddress ?? "",
      subtotal: String(subtotal),
      grandTotal: String(grandTotal),
      isDraft: isDraft ?? true,
      status: resolvedStatus,
    })
    .returning();

  if (parsedItems.length > 0) {
    await db.insert(invoiceItemsTable).values(
      parsedItems.map((item) => ({
        invoiceId: invoice.id,
        itemName: item.itemName,
        qty: String(item.qty),
        price: String(item.price),
        discount: String(item.discount),
        discountType: item.discountType,
        total: String(computeLineTotal(item)),
      }))
    );
  }

  const result = await getInvoiceWithItems(invoice.id);
  res.status(201).json(result);
});

router.get("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const invoice = await getInvoiceWithItems(id);
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json(invoice);
});

router.put("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { invoiceNumber, date, customerName, customerAddress, isDraft, status, items } = req.body;

  const existing = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
  if (!existing[0]) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }

  const parsedItems: (ParsedItem & { itemName: string })[] = (items ?? []).map((item: { itemName: string; qty: number; price: number; discount: number; discountType?: string }) => ({
    itemName: item.itemName,
    qty: item.qty,
    price: item.price,
    discount: item.discount,
    discountType: item.discountType === "amount" ? "amount" : "percent",
  }));

  const { subtotal, grandTotal } = computeTotals(parsedItems);

  const resolvedIsDraft = isDraft ?? false;
  const resolvedStatus = status ?? (resolvedIsDraft ? "draft" : existing[0].status ?? "unpaid");

  await db
    .update(invoicesTable)
    .set({
      invoiceNumber,
      date,
      customerName,
      customerAddress: customerAddress ?? "",
      subtotal: String(subtotal),
      grandTotal: String(grandTotal),
      isDraft: resolvedIsDraft,
      status: resolvedStatus,
    })
    .where(eq(invoicesTable.id, id));

  await db.delete(invoiceItemsTable).where(eq(invoiceItemsTable.invoiceId, id));

  if (parsedItems.length > 0) {
    await db.insert(invoiceItemsTable).values(
      parsedItems.map((item) => ({
        invoiceId: id,
        itemName: item.itemName,
        qty: String(item.qty),
        price: String(item.price),
        discount: String(item.discount),
        discountType: item.discountType,
        total: String(computeLineTotal(item)),
      }))
    );
  }

  const result = await getInvoiceWithItems(id);
  res.json(result);
});

router.delete("/invoices/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [invoice] = await db.delete(invoicesTable).where(eq(invoicesTable.id, id)).returning();
  if (!invoice) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.status(204).send();
});

export default router;
