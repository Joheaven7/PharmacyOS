# PharmacyOS — System Architecture

## Overview
PharmacyOS is a multi-tenant pharmacy inventory management, point-of-sale (POS), purchasing, expiry tracking, analytics, and business management system.

## Architectural Layers

```
                               ┌─────────────────────────┐
                               │     Next.js Frontend    │
                               │   (App Router + TS)     │
                               └────────────┬────────────┘
                                            │ HTTP / REST
                               ┌────────────▼────────────┐
                               │   Express.js API Server │
                               │  (Controllers, Services)│
                               └────────────┬────────────┘
                                            │ Prisma ORM
                               ┌────────────▼────────────┐
                               │    PostgreSQL Database  │
                               └─────────────────────────┘
```

### 1. Frontend (`/frontend`)
- **Framework**: Next.js (App Router), React 18/19, TypeScript.
- **Styling**: Tailwind CSS, custom design tokens, modern dark/light styling, micro-animations.
- **Icons**: Lucide React.
- **State & Data Fetching**: TanStack Query / React Context for auth & tenant context.

### 2. Backend (`/backend`)
- **Runtime**: Node.js + TypeScript (Strict Mode).
- **Framework**: Express.js with layered architecture:
  - `routes/` — Endpoint definitions & HTTP router mounting.
  - `controllers/` — Request handling, response formatting, HTTP status code management.
  - `services/` — Core business logic, stock ledger execution, FEFO calculation, permission verification.
  - `repositories/` — Database access abstraction layer utilizing Prisma Client.
  - `middleware/` — Authentication, authorization (RBAC), tenant context injection, rate limiting, logging.
  - `validators/` — Zod or custom schema input validation.

### 3. Database (`/prisma`)
- **Engine**: PostgreSQL.
- **ORM**: Prisma.
- **Tenant Isolation**: Row-level tenant binding via `organizationId` on all organization-owned entities.
- **Financial & Stock Ledger**: Immutable transaction entries (`StockMovement`, `Sale`, `SaleItem`, `Purchase`, `PurchaseItem`).

## Multi-Tenant Context & Request Flow
1. Client sends request with session authentication (HttpOnly cookie).
2. Backend middleware verifies session token, resolves `userId`, `organizationId`, and assigned `permissions`.
3. Context is attached to express `req.context` object.
4. Repository layer automatically injects `where: { organizationId }` into query scopes to prevent cross-tenant leakage.

## Security & Authorization Model
- **Auth**: Server-side HttpOnly cookie session management.
- **Authorization**: Granular Permission-based Access Control (RBAC with System & Custom roles).
- **Validation**: Strict server-side input sanitization & schema validation.
