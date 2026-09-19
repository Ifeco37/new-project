# SmartStock — Inventory Management System

A full-stack web application for small businesses to track products, stock
levels and daily sales. Built as a final project for a 6-month Full Stack Web
Development course by **Okeke Ifechukwu**, using React, TanStack Start and
Supabase.

## Features

- **Authentication** — admin sign-up / login with email and password (session
  kept in the browser, routes protected by a guard).
- **Dashboard** — total products, units in stock, today's sales, low-stock
  alerts, a 7-day sales bar chart and recent activity.
- **Products** — full CRUD with search, category filter, live stock-status
  badges (In Stock / Low Stock / Out of Stock) and Naira price formatting.
- **Sales** — record a sale against a product; the database automatically
  checks available stock, blocks overselling, reduces the quantity on hand
  and computes the total amount. Deleting a sale restores the stock.

## Technology Stack

| Layer     | Technology                                             |
| --------- | ------------------------------------------------------ |
| Frontend  | React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Routing   | TanStack Router (file-based routes)                    |
| Data      | TanStack Query + Supabase JS client                    |
| Backend   | Supabase (Postgres database, Auth, RLS)                |
| Auth      | Supabase Auth (email + password)                       |

## Project Structure

```text
src/
├── components/
│   ├── AppShell.tsx        # Sidebar + topbar layout for signed-in pages
│   ├── StockBadge.tsx      # Stock status pill component
│   └── ui/                 # shadcn/ui primitives
├── integrations/supabase/  # Generated client + auth middleware
├── lib/
│   └── inventory.ts        # Shared data-access layer (products & sales)
├── routes/
│   ├── __root.tsx          # Root layout, global metadata, Toaster
│   ├── index.tsx           # Public login / sign-up page (/)
│   └── _authenticated/     # Guarded pages (redirect to / when signed out)
│       ├── route.tsx       # Auth guard layout
│       ├── dashboard.tsx   # /dashboard — stats, chart, recent activity
│       ├── products.tsx    # /products — product CRUD
│       └── sales.tsx       # /sales — record & review sales
└── styles.css              # Design tokens (SmartStock theme)
```

## Database

Three tables, all protected by Row Level Security so only signed-in admins
can read or write data:

- **profiles** — one row per admin, created automatically on sign-up.
- **products** — name, SKU, category, price, quantity on hand, supplier.
- **sales** — product reference, quantity sold, selling price, total,
  customer name. Triggers reduce stock on insert and restore it on delete,
  and reject a sale that exceeds available stock.

## Business Rules

- Stock status: `> 10` units = **In Stock**, `1–10` = **Low Stock**,
  `0` = **Out of Stock**.
- A sale cannot exceed the quantity on hand (enforced in the database).
- Monetary values are displayed in Nigerian Naira (₦).
