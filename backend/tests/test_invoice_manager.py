"""Backend tests for AZ Distribution Invoice Manager"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


# ─── Customers ───────────────────────────────────────────────────────────────

class TestCustomers:
    """Customer CRUD tests"""

    def test_list_customers_returns_3_seeded(self):
        r = requests.get(f"{BASE_URL}/api/customers")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 3
        names = [c["name"] for c in data]
        assert "Shoaib Hardware Store" in names
        assert "Ali Electronics" in names
        assert "Bilal Traders" in names

    def test_create_customer(self):
        payload = {"name": "TEST_New Customer", "address": "Test Address 123"}
        r = requests.post(f"{BASE_URL}/api/customers", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "TEST_New Customer"
        assert "id" in data
        # cleanup
        requests.delete(f"{BASE_URL}/api/customers/{data['id']}")

    def test_update_customer(self):
        # create first
        r = requests.post(f"{BASE_URL}/api/customers", json={"name": "TEST_Update Me", "address": "Old"})
        cid = r.json()["id"]
        # update
        r2 = requests.put(f"{BASE_URL}/api/customers/{cid}", json={"name": "TEST_Updated", "address": "New"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "TEST_Updated"
        # cleanup
        requests.delete(f"{BASE_URL}/api/customers/{cid}")

    def test_delete_customer(self):
        r = requests.post(f"{BASE_URL}/api/customers", json={"name": "TEST_Delete Me"})
        cid = r.json()["id"]
        r2 = requests.delete(f"{BASE_URL}/api/customers/{cid}")
        assert r2.status_code == 204


# ─── Products ────────────────────────────────────────────────────────────────

class TestProducts:
    """Product CRUD tests"""

    def test_list_products_returns_5_seeded(self):
        r = requests.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 5
        names = [p["name"] for p in data]
        assert "Wall Paint 10L" in names
        assert "Paint Brush Set" in names
        assert "Masking Tape" in names
        assert "Roller Set" in names
        assert "Paint Thinner 5L" in names

    def test_product_has_default_price(self):
        r = requests.get(f"{BASE_URL}/api/products")
        data = r.json()
        wall_paint = next((p for p in data if p["name"] == "Wall Paint 10L"), None)
        assert wall_paint is not None
        assert wall_paint["defaultPrice"] == 3500.0

    def test_create_product(self):
        r = requests.post(f"{BASE_URL}/api/products", json={"name": "TEST_Product", "defaultPrice": 999.0})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "TEST_Product"
        assert data["defaultPrice"] == 999.0
        requests.delete(f"{BASE_URL}/api/products/{data['id']}")

    def test_update_product(self):
        r = requests.post(f"{BASE_URL}/api/products", json={"name": "TEST_Update Product", "defaultPrice": 100})
        pid = r.json()["id"]
        r2 = requests.put(f"{BASE_URL}/api/products/{pid}", json={"name": "TEST_Updated Product", "defaultPrice": 200})
        assert r2.status_code == 200
        assert r2.json()["defaultPrice"] == 200.0
        requests.delete(f"{BASE_URL}/api/products/{pid}")

    def test_delete_product(self):
        r = requests.post(f"{BASE_URL}/api/products", json={"name": "TEST_Delete Product", "defaultPrice": 50})
        pid = r.json()["id"]
        r2 = requests.delete(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 204


# ─── Invoices ────────────────────────────────────────────────────────────────

class TestInvoices:
    """Invoice CRUD tests"""

    def test_get_next_invoice_number(self):
        r = requests.get(f"{BASE_URL}/api/invoices/next-number")
        assert r.status_code == 200
        data = r.json()
        assert "invoiceNumber" in data
        import re
        assert re.match(r"AZ-\d{4}-\d{3}", data["invoiceNumber"]), f"Invalid format: {data['invoiceNumber']}"

    def test_list_invoices(self):
        r = requests.get(f"{BASE_URL}/api/invoices")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_invoice(self):
        payload = {
            "invoiceNumber": "AZ-TEST-001",
            "date": "2026-02-01",
            "customerName": "TEST_Customer",
            "customerAddress": "Test Street",
            "isDraft": False,
            "status": "unpaid",
            "items": [
                {"itemName": "Test Item", "qty": 2, "price": 500, "discount": 0, "discountType": "percent"}
            ]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["invoiceNumber"] == "AZ-TEST-001"
        assert data["grandTotal"] == 1000.0
        assert data["status"] == "unpaid"
        inv_id = data["id"]
        # verify persistence
        r2 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.status_code == 200
        assert r2.json()["customerName"] == "TEST_Customer"
        # cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_update_invoice(self):
        # create
        payload = {
            "invoiceNumber": "AZ-TEST-002",
            "date": "2026-02-01",
            "customerName": "TEST_Update Invoice",
            "customerAddress": "",
            "isDraft": True,
            "status": "draft",
            "items": []
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]
        # update
        payload["status"] = "paid"
        payload["customerName"] = "TEST_Updated Customer"
        r2 = requests.put(f"{BASE_URL}/api/invoices/{inv_id}", json=payload)
        assert r2.status_code == 200
        assert r2.json()["status"] == "paid"
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_delete_invoice(self):
        payload = {
            "invoiceNumber": "AZ-TEST-003",
            "date": "2026-02-01",
            "customerName": "TEST",
            "customerAddress": "",
            "isDraft": True,
            "status": "draft",
            "items": []
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]
        r2 = requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.status_code == 204
        r3 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r3.status_code == 404

    def test_filter_by_status(self):
        r = requests.get(f"{BASE_URL}/api/invoices?status=draft")
        assert r.status_code == 200
        data = r.json()
        for inv in data:
            assert inv["status"] == "draft"

    def test_search_by_customer_name(self):
        # create invoice first
        payload = {
            "invoiceNumber": "AZ-SEARCH-001",
            "date": "2026-02-01",
            "customerName": "UniqueSearchCustomerXYZ",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": []
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]
        # search
        r2 = requests.get(f"{BASE_URL}/api/invoices?search=UniqueSearchCustomerXYZ")
        assert r2.status_code == 200
        data = r2.json()
        assert any(i["customerName"] == "UniqueSearchCustomerXYZ" for i in data)
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")
