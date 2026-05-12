# Auth Testing — AZ Distribution Invoice Manager

**No auth — app is single-tenant, all routes are open.**

There is no login flow, no registration, no password reset, no JWT, no
sessions, no OAuth, and no admin seeding. The application has zero auth
surface, by design (per the original repo's README and architecture).

## What testers should NOT do

- Do not look for a login page — there isn't one.
- Do not try to obtain an auth token — there is no token.
- Do not test "unauthorized" or "forbidden" responses — every endpoint is
  open and returns 200/201/204 as appropriate, or 4xx for validation errors.

## What testers SHOULD test

1. **CRUD flows for the three resources** (no auth headers needed):
   - `customers`: GET/POST `/api/customers`, PUT/DELETE `/api/customers/:id`
   - `products`:  GET/POST `/api/products`,  PUT/DELETE `/api/products/:id`
   - `invoices`: GET/POST `/api/invoices`, GET/PUT/DELETE `/api/invoices/:id`,
     GET `/api/invoices/next-number` (auto-generates `AZ-YYMM-###`)

2. **End-to-end UI flow on the web app** (no login):
   - Navigate to `/customers`, add a customer.
   - Navigate to `/products`, add a product.
   - Navigate to `/invoices/new`, create an invoice with that customer +
     product, save (or save as draft), confirm it appears in `/invoices`.
   - Edit and delete flows work without auth.

3. **`/api/openapi.json`** is reachable for spec-driven verification.

4. **Health check**: `GET /api/healthz` → `{"status":"ok"}`.
