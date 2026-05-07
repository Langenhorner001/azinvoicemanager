"""Tests for new features: Dashboard, Auto-Overdue, Customer Invoice History"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDashboard:
    """Dashboard endpoint tests"""

    def test_get_dashboard_status(self):
        r = requests.get(f"{BASE_URL}/api/dashboard")
        assert r.status_code == 200

    def test_get_dashboard_fields(self):
        r = requests.get(f"{BASE_URL}/api/dashboard")
        data = r.json()
        assert "totalRevenue" in data
        assert "outstanding" in data
        assert "thisMonthRevenue" in data
        assert "invoiceCount" in data
        assert "statusCounts" in data
        assert "monthlyRevenue" in data
        assert "recentInvoices" in data

    def test_dashboard_status_counts(self):
        r = requests.get(f"{BASE_URL}/api/dashboard")
        data = r.json()
        sc = data["statusCounts"]
        assert "paid" in sc
        assert "unpaid" in sc
        assert "overdue" in sc
        assert "draft" in sc

    def test_dashboard_monthly_revenue_6_months(self):
        r = requests.get(f"{BASE_URL}/api/dashboard")
        data = r.json()
        assert len(data["monthlyRevenue"]) == 6
        for m in data["monthlyRevenue"]:
            assert "month" in m
            assert "revenue" in m
            assert "count" in m

    def test_dashboard_recent_invoices_max_5(self):
        r = requests.get(f"{BASE_URL}/api/dashboard")
        data = r.json()
        assert len(data["recentInvoices"]) <= 5

    def test_dashboard_total_revenue_only_paid(self):
        """Create a paid invoice and verify totalRevenue includes it"""
        payload = {
            "invoiceNumber": "AZ-DASH-001",
            "date": "2026-02-01",
            "customerName": "TEST_Dashboard",
            "customerAddress": "",
            "isDraft": False,
            "status": "paid",
            "items": [{"itemName": "Item", "qty": 1, "price": 1000, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        assert r.status_code == 201
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/dashboard")
        data = r2.json()
        assert data["totalRevenue"] >= 1000
        assert data["invoiceCount"] >= 1

        # cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_dashboard_outstanding_includes_unpaid_and_overdue(self):
        """Create unpaid invoice and check outstanding"""
        payload = {
            "invoiceNumber": "AZ-DASH-002",
            "date": "2026-02-01",
            "customerName": "TEST_Dashboard",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 500, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/dashboard")
        data = r2.json()
        assert data["outstanding"] >= 500

        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")


class TestAutoOverdue:
    """Auto-overdue logic tests"""

    def test_overdue_marked_on_list_invoices(self):
        """Unpaid invoice > 30 days should become overdue when list is called"""
        payload = {
            "invoiceNumber": "AZ-OVERDUE-001",
            "date": "2025-12-01",  # > 30 days ago
            "customerName": "TEST_Overdue",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 100, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        assert r.status_code == 201
        inv_id = r.json()["id"]

        # Trigger mark_overdue via GET
        r2 = requests.get(f"{BASE_URL}/api/invoices")
        assert r2.status_code == 200

        # Check the specific invoice is now overdue
        r3 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r3.status_code == 200
        assert r3.json()["status"] == "overdue", f"Expected overdue, got {r3.json()['status']}"

        # cleanup
        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_recent_invoice_not_overdue(self):
        """Unpaid invoice within 30 days should NOT become overdue"""
        payload = {
            "invoiceNumber": "AZ-OVERDUE-002",
            "date": "2026-05-01",  # recent (within 30 days)
            "customerName": "TEST_Recent",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": []
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        # Trigger mark_overdue
        requests.get(f"{BASE_URL}/api/invoices")

        r2 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.json()["status"] == "unpaid", f"Should still be unpaid, got {r2.json()['status']}"

        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_dashboard_triggers_mark_overdue(self):
        """GET /api/dashboard should also trigger mark_overdue"""
        payload = {
            "invoiceNumber": "AZ-OVERDUE-003",
            "date": "2025-11-01",  # very old
            "customerName": "TEST_DashOverdue",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 200, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        # Trigger via dashboard
        requests.get(f"{BASE_URL}/api/dashboard")

        r2 = requests.get(f"{BASE_URL}/api/invoices/{inv_id}")
        assert r2.json()["status"] == "overdue"

        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")

    def test_dashboard_status_counts_include_overdue(self):
        """After marking overdue, statusCounts.overdue should be >= 1"""
        # Create old unpaid invoice
        payload = {
            "invoiceNumber": "AZ-OVERDUE-004",
            "date": "2025-10-01",
            "customerName": "TEST_DashOverdue2",
            "customerAddress": "",
            "isDraft": False,
            "status": "unpaid",
            "items": [{"itemName": "Item", "qty": 1, "price": 300, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/dashboard")
        data = r2.json()
        assert data["statusCounts"]["overdue"] >= 1

        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")


class TestCustomerInvoiceHistory:
    """Customer invoice history via filtered invoice listing"""

    def test_invoices_filter_by_customer_name(self):
        """Verify invoices can be searched by customer name for history sheet"""
        payload = {
            "invoiceNumber": "AZ-HIST-001",
            "date": "2026-02-01",
            "customerName": "TEST_HistoryCustomer",
            "customerAddress": "",
            "isDraft": False,
            "status": "paid",
            "items": [{"itemName": "Item", "qty": 2, "price": 750, "discount": 0, "discountType": "percent"}]
        }
        r = requests.post(f"{BASE_URL}/api/invoices", json=payload)
        inv_id = r.json()["id"]

        r2 = requests.get(f"{BASE_URL}/api/invoices?search=TEST_HistoryCustomer")
        assert r2.status_code == 200
        data = r2.json()
        assert any(i["customerName"] == "TEST_HistoryCustomer" for i in data)
        matching = [i for i in data if i["customerName"] == "TEST_HistoryCustomer"]
        assert matching[0]["grandTotal"] == 1500.0

        requests.delete(f"{BASE_URL}/api/invoices/{inv_id}")
