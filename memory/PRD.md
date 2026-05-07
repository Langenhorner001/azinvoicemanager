# AZ Distribution Invoice Manager - PRD

## Original Problem Statement
Implement the GitHub repository https://github.com/Langenhorner001/azinvoicemanager faithfully, preserving the original architecture, design system, component structure, animations, layouts, styling patterns, interaction logic, and UI behavior.

## Architecture

### Tech Stack
- **Frontend**: React (CRA) + Tailwind CSS v3 + Radix UI + Wouter routing + React Query + jsPDF + html2canvas
- **Backend**: FastAPI (Python) + MongoDB (Motor async driver)
- **Database**: MongoDB with sequential integer IDs (via counters collection)

### File Structure
```
frontend/src/
  App.js                       # Wouter router + QueryClient
  index.css                    # Tailwind + AZ Distribution theme
  lib/api.js                   # Axios API client
  components/
    layout.jsx                 # Sidebar navigation + dark mode
    invoice-preview.jsx        # A4 invoice preview component
  pages/
    invoices.jsx               # Invoice list with search/filter
    invoice-editor.jsx         # Create/edit invoice + live preview
    customers.jsx              # Customer CRUD
    products.jsx               # Product CRUD
    not-found.jsx              # 404 page

backend/
  server.py                    # FastAPI with all CRUD endpoints
```

## Core Requirements (Static)
- Invoice CRUD (create, read, update, delete)
- Customer management (name, address)
- Product management (name, default price)  
- A4 live invoice preview with AZ Distribution branding
- PDF download (html2canvas + jsPDF)
- Print functionality (CSS print media)
- Dark/light mode toggle (localStorage)
- Invoice status: draft, unpaid, paid, overdue
- Search and filter invoices
- Auto-generated invoice numbers (AZ-YYMM-NNN format)
- Auto-save draft while editing

## What's Been Implemented

### Session 1 (2026-05-07) - MVP
- FastAPI + MongoDB backend with all CRUD endpoints
- Invoice editor with live A4 preview
- Customer CRUD, Product CRUD
- Sidebar layout with AZ branding
- PDF download + print
- Search/filter invoices
- Dark mode
- Seed data: 3 customers, 5 products

### Session 2 (2026-05-07) - Feature Additions
- **Revenue Dashboard** at /dashboard: KPI cards, monthly bar chart (recharts), status breakdown, recent invoices
- **Auto Overdue Logic**: unpaid invoices > 30 days auto-marked overdue (on list load + startup)
- **Customer Invoice History**: click any customer → slide sheet with invoice list, collected/outstanding totals
- Default route now / → /dashboard

## Test Results
- Backend: 100% (16/16 tests)
- Frontend: 95% → 100% after nested anchor fix

## Prioritized Backlog
- P1: Invoice number editing (currently auto-set, could be manual)
- P1: Invoice status auto-update to overdue based on date
- P2: Dashboard with revenue charts
- P2: Customer invoice history view
- P2: Email invoice to customer
- P3: Multi-page invoice support for many items
- P3: Export to CSV
- P3: User authentication

## Next Tasks
None blocking - all core flows implemented and tested.
