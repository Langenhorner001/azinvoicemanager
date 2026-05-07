# AZ Distribution Invoice Manager

A full-stack invoice management web app for **AZ DISTRIBUTION MIRPUR** — a local distribution business in Mirpur Azad Kashmir, Pakistan.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/api-server/` — Fastify + Drizzle ORM backend (port 8080)
- `artifacts/invoice-manager/` — React + Vite frontend (port 18864, served at `/`)
- `lib/db/` — Drizzle schema, migrations, database client
- `lib/api-zod/` — OpenAPI/Zod types (generated)
- `lib/api-client-react/` — Orval-generated React Query hooks

### Frontend Pages
- `/` → redirects to `/invoices`
- `/invoices` — Invoice list with search, delete, draft badges
- `/invoices/new` — Split-panel invoice creator (form + live A4 preview)
- `/invoices/:id/edit` — Edit existing invoice
- `/customers` — Customer CRUD (add/edit/delete via modal)
- `/products` — Product CRUD (add/edit/delete via modal)

### Backend Routes
- `GET/POST /api/invoices` — List (with optional search) + create
- `GET /api/invoices/next-number` — Auto-generates next invoice number (AZ-YYMM-###)
- `GET/PUT/DELETE /api/invoices/:id` — Get, update, delete
- `GET/POST /api/customers` — List + create
- `PUT/DELETE /api/customers/:id` — Update, delete
- `GET/POST /api/products` — List + create
- `PUT/DELETE /api/products/:id` — Update, delete

### Database Schema (PostgreSQL via Neon)
- `customers` — id, name, address, created_at
- `products` — id, name, default_price, created_at
- `invoices` — id, invoice_number, date, customer_name, customer_address, subtotal, grand_total, is_draft, created_at
- `invoice_items` — id, invoice_id, item_name, qty, price, discount, total

## Key Design Decisions

### Invoice Number Format
`AZ-YYMM-###` (e.g., AZ-2605-001) — auto-generated per month, sequential.

### Currency
Rs. (Pakistani Rupees)

### Invoice Branding (A4 Preview)
- AZ logo box (top-left), "Invoice" serif heading (top-right)
- BILLED TO section with customer name + address
- Items table: ITEM | QTY | PRICE | DISC | TOTAL
- Per-item discount as percentage (toggled on/off)
- Subtotal row + GRAND TOTAL dark bar (#111 bg, white text)
- Footer: Dancing Script cursive "Thank you" + right-aligned contact info
- Phone: +92 318 4396075, Address: Mirpur Azad Kashmir, 12130

### Theme
- Clean black/white minimal palette
- Light mode: near-white background (#f7f7f7), near-black text
- Dark mode: dark grey background, toggleable via sidebar button + persisted in localStorage
- Font: Inter (UI), Dancing Script (invoice "Thank you" footer)

## Tech Stack
- **Frontend**: React 19, Vite, wouter (routing), TanStack Query, shadcn/ui, Tailwind CSS v4
- **Backend**: Fastify, Drizzle ORM, Zod validation
- **API codegen**: Orval (generates hooks from OpenAPI spec)
- **Database**: PostgreSQL (Neon via DATABASE_URL)

## Running the App

```bash
# Start API server
pnpm --filter @workspace/api-server run dev

# Start frontend
pnpm --filter @workspace/invoice-manager run dev
```

Both run as Replit workflows — the API Server and the web workflow.

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (set as Replit secret)
