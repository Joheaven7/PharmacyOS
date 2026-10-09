# PharmacyOS — Permanent AI Agent & Developer Rules

## Core Principles
1. **Multi-Tenant First**: Every resource belongs to an `organizationId`. Never return cross-tenant data. Organization identity must always be validated on the backend via authenticated session/token context.
2. **Stock Movements Ledger**: Stock quantities must NEVER be updated directly without writing an immutable `StockMovement` entry.
3. **Atomic Sales & Financial Transactions**: Sales must atomically create the Sale, SaleItems, and StockMovements inside a single database transaction. Rollback on any failure.
4. **FEFO (First Expire, First Out)**: Inventory deductions must automatically consume stock from batches expiring earliest first. Never sell expired stock.
5. **Product vs Batch**: Barcode identifies the Product/Package, NOT the inventory batch. A Product can have multiple Batches with unique expiry dates, quantities, and purchase prices.
6. **No Destructive Financial/Inventory Deletions**: Never hard-delete sales, stock movements, or invoices to "fix" errors. Always use reversal/return transactions or controlled adjustments.
7. **Strict Backend Authorization**: Never rely solely on client-side route guards or browser state. All access control checks (RBAC and fine-grained permissions) MUST occur on the backend.
8. **TypeScript Strict Mode**: Maintain strict type definitions across frontend and backend. No implicit `any`.
9. **Environment & Security**: Never commit raw secrets or credentials. Use `.env.example` for reference.

## Architecture Guidelines
- **Frontend**: Next.js App Router, TypeScript, Tailwind CSS, Lucide Icons, TanStack Query pattern.
- **Backend**: Express.js, TypeScript, Prisma ORM, Layered Architecture (`routes -> controllers -> services -> repositories`).
- **Database**: PostgreSQL with Prisma schemas and migrations.
