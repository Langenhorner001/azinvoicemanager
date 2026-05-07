"""Tests for new features: Invoice Due Date and Bulk Status/Delete"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDueDate:
    """Invoice Due Date field tests"""

    def test_create_invoice_with_due_date(self):
        payload = {
            "invoiceNumber": "AZ-DUE-001",
            "date": "2026-02-01",
            "dueDate": "2026-03-03",
            "customerName": "TEST_DueDate",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 500, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        assert r.status_code == 201
        data = r.json()
        assert data["dueDate"] == "2026-03-03", f"Expected 2026-03-03, got {data.get('dueDate')}"
        # cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{data['id']}")

    def test_create_invoice_without_due_date_defaults_none(self):
        payload = {
            "invoiceNumber": "AZ-DUE-002",
            "date": "2026-02-01",
            "customerName": "TEST_DueDate",
            "customerAddress": "",
            "isDraft": False,
            "status": "draft",
            "items": [{"itemName": "Item", "qty": 1, "price": 100, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        assert r.status_code == 201
        data = r.json()
        # dueDate should be None or not present if not provided
        assert data.get("dueDate") is None
        requests.delete(f"{BASE_URL}/api/invoices/{data['id']}")

    def test_due_date_in_get_invoice(self):
        payload = {
            "invoiceNumber": "AZ-DUE-003",
            "date": "2026-02-01",
            "dueDate": "2026-06-06",
            "customerName": "TEST_DueDate",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 200, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.status_code == 200
        assert r2.json()["dueDate"] == "2026-06-06"
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_overdue_logic_uses_due_date(self):
        """Unpaid invoice with past dueDate should become overdue"""
        payload = {
            "invoiceNumber": "AZ-DUE-004",
            "date": "2026-01-01",
            "dueDate": "2026-01-15",  # past due date
            "customerName": "TEST_DueDate",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 100, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        # Trigger overdue logic
        requests.get(f"{BASE_URL}/api/invoices")

        r2 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.json()["status"] == "overdue", f"Expected overdue, got {r2.json()['status']}"
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_due_date_in_list_invoices(self):
        """dueDate should appear in list invoices response"""
        payload = {
            "invoiceNumber": "AZ-DUE-005",
            "date": "2026-02-01",
            "dueDate": "2026-03-03",
            "customerName": "TEST_DueDate",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 300, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/invoices")
        invoices = r2.json()
        matching = [i for i in invoices if i["id"] == inv_id]
        assert len(matching) == 1
        assert matching[0]["dueDate"] == "2026-03-03"
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")


class TestBulkStatus:
    """Bulk status update endpoint tests"""

    def test_bulk_update_status_to_paid(self):
        # Create 2 invoices
        ids = []
        for i in range(2):
            r = requests.post(f"{BASE_URL}/api/invoices", json={
                "invoiceNumber": f"AZ-BULK-{i:03d}",
                "date": "2026-02-01",
                "customerName": "TEST_Bulk",
                "customerAddress": "",
                "isDraft": False,
                "status": "unpaid",
                "items": [{"itemName": "Item", "qty": 1, "price": 100, "discount": 0, "discountType": "percent"}]
            })
            assert r.status_code == 201
            ids.append(r.json()["id"])

        r2 = requests.patch(f"{BASE_URL}/api/invoices/bulk-status", json={"ids": ids, "status": "paid"})
        assert r2.status_code == 200
        data = r2.json()
        assert data["updated"] == 2

        # Verify both are now paid
        for inv_id in ids:
            r3 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
            assert r3.json()["status"] == "paid"
            requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_bulk_update_status_to_draft(self):
        r = requests.post(f"{BASE_URL}/api/invoices", json={
            "invoiceNumber": "AZ-BULK-DRAFT",
            "date": "2026-02-01",
            "customerName": "TEST_Bulk",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 100, "discount": 0, "discountType": "percent"}]
        })
        inv_id = r.json()["id"]

        r2 = requests.patch(f"{BASE_URL}/api/invoices/bulk-status", json={"ids": [inv_id], "status": "draft"})
        assert r2.status_code == 200
        assert r2.json()["updated"] == 1

        r3 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r3.json()["status"] == "draft"
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_bulk_update_status_empty_ids(self):
        r = requests.patch(f"{BASE_URL}/api/invoices/bulk-status", json={"ids": [], "status": "paid"})
        assert r.status_code == 200
        assert r.json()["updated"] == 0

    def test_bulk_update_invalid_status(self):
        r = requests.patch(f"{BASE_URL}/api/invoices/bulk-status", json={"ids": [1], "status": "invalid_status"})
        assert r.status_code == 422  # validation error


class TestBulkDelete:
    """Bulk delete endpoint tests"""

    def test_bulk_delete_invoices(self):
        ids = []
        for i in range(3):
            r = requests.post(f"{BASE_URL}/api/invoices", json={
                "invoiceNumber": f"AZ-BDEL-{i:03d}",
                "date": "2026-02-01",
                "customerName": "TEST_BulkDel",
                "customerAddress": "",
                "isDraft": True,
                "status": "draft",
                "items": [{"itemName": "Item", "qty": 1, "price": 50, "discount": 0, "discountType": "percent"}]
            })
            assert r.status_code == 201
            ids.append(r.json()["id"])

        r2 = requests.post(f"{BASE_URL}/api/invoices/bulk-delete", json={"ids": ids})
        assert r2.status_code == 200
        data = r2.json()
        assert data["deleted"] == 3

        # Verify all deleted
        for inv_id in ids:
            r3 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
            assert r3.status_code == 404

    def test_bulk_delete_empty_ids(self):
        r = requests.post(f"{BASE_URL}/api/invoices/bulk-delete", json={"ids": []})
        assert r.status_code == 200
        assert r.json()["deleted"] == 0

    def test_bulk_delete_nonexistent_ids(self):
        r = requests.post(f"{BASE_URL}/api/invoices/bulk-delete", json={"ids": [999999, 999998]})
        assert r.status_code == 200
        assert r.json()["deleted"] == 0
