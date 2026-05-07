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

## What's Been Implemented (2026-05-07)

### Backend
- FastAPI with MongoDB
- Sequential integer IDs via counters collection
- All CRUD endpoints for invoices, customers, products
- Invoice line totals calculated server-side
- Search/filter endpoints with MongoDB queries
- Seed data: 3 customers, 5 products

### Frontend
- Faithful implementation of original repo design
- Sidebar layout with AZ DISTRIBUTION branding
- Invoice list page with status cards, search, filters
- Invoice editor with live A4 preview
- Customer selection via command palette dropdown
- Product auto-complete in item rows
- Discount toggle (percent or fixed amount per line)
- PDF download via html2canvas + jsPDF
- Print via window.print() with print CSS
- Dark mode via classList + localStorage
- Customers CRUD page
- Products CRUD page

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
