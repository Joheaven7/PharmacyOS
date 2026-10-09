# PharmacyOS — Implementation Roadmap

- [x] **Part 1: Foundation & Architecture**
  - Monorepo directory layout (`frontend`, `backend`, `prisma`, `docs`)
  - Express.js backend shell + Health endpoints (`/health`, `/api/health`)
  - RequestContext middleware framework
  - Prisma schema for Organization, User, Role, Permission, AuditLog
  - Next.js 14/15 App Router shell layout + Sidebar + TopNav + Responsive Dashboard Placeholder
  - Architecture & Business rules documentation
  - Permanent project rules (`AGENTS.md`)

- [x] **Part 2: Authentication & RBAC**
  - Pharmacy Owner registration & Organization setup (`/api/auth/register-owner`)
  - Session Login & Logout with HttpOnly cookies (`/api/auth/login`, `/api/auth/logout`)
  - Current authenticated user endpoint (`/api/auth/me`)
  - Password hashing with Bcrypt (12 salt rounds) & strength validation
  - Backend authorization middleware (`requireAuth`, `requireRole`, `requirePermission`)
  - Staff management & Role assignment endpoints (`/api/users`)
  - Login attempt rate limiting (`loginRateLimiter`)
  - Security audit logging (`LOGIN_SUCCESS`, `LOGIN_FAILED`, `REGISTER_OWNER`, `LOGOUT`)
  - Frontend AuthContext React Provider & tabbed Sign In / Register UI (`/login`)

- [x] **Part 3: Pharmacy / Tenant Setup**
  - Organization/Pharmacy business profile management (`/api/organization/profile`)
  - Multi-tenant backend query isolation middleware (`enforceTenantIsolation`)
  - Parameter override protection (ignores/strips client-supplied `organizationId`)
  - Operational warning thresholds (low stock, warning expiry days, critical expiry days)
  - Receipt header/footer configuration
  - Cross-tenant data isolation unit tests (`backend/tests/tenantIsolation.test.ts`)
  - Frontend Settings & Pharmacy Profile page (`/settings`)

- [x] **Part 4: Medicine Catalog + Barcode**
  - Prisma models for `Category` and `Medicine` (with package barcode & SKU unique per tenant)
  - Strict separation of Product (specification/package) vs Batch (inventory lot)
  - Medicine CRUD endpoints (`GET/POST/PUT/DELETE /api/medicines`) & Archive support
  - Fast barcode lookup endpoint (`GET /api/medicines/barcode/:barcode`)
  - Duplicate barcode & SKU validation per organization
  - Category management endpoints (`GET/POST /api/medicines/categories`)
  - Keyboard-emulation USB Barcode Scanner hook (`useBarcodeScanner`)
  - Master Medicines Catalog UI page (`/medicines`) with live barcode capture & modals
  - Unit tests for medicine validation & barcode search (`backend/tests/medicine.test.ts`)

- [x] **Part 5: Batch & Inventory**
  - Prisma models for `Batch` and `StockMovement` (append-only ledger)
  - Immutable stock mutation rule: every stock change writes a `StockMovement`
  - Receive stock batch API (`POST /api/inventory/receive`)
  - Controlled manual stock adjustment API (`POST /api/inventory/adjust`)
  - Pure FEFO (First Expire, First Out) allocation engine ignoring expired batches (`allocateStockFEFO`)
  - Atomic FEFO deduction helper for future POS/Sales transactions (`deductStockFEFOInTransaction`)
  - Negative stock prevention default enforcement
  - FEFO unit tests verifying allocations, expiry exclusions, and ledger integrity (`backend/tests/inventory.test.ts`)
  - Batch Inventory & Audit Trail UI page (`/inventory`)

- [x] **Part 6: Suppliers & Purchasing**
  - Prisma models for `Supplier`, `Purchase`, and `PurchaseItem`
  - Duplicate invoice number rejection per supplier (`@@unique([organizationId, supplierId, invoiceNumber])`)
  - Atomic purchase receiving pipeline: creates Purchase, PurchaseItems, Batches, and `PURCHASE` StockMovements inside a single transaction
  - Supplier management endpoints (`GET/POST /api/suppliers`)
  - Purchase receiving & history endpoints (`GET/POST /api/purchases`)
  - Purchasing unit tests verifying line item validation, future expiry checks, and stock movement generation (`backend/tests/purchasing.test.ts`)
  - Suppliers & Purchasing UI page (`/purchasing`) with line item calculator & modals

- [x] **Part 7: POS, Sales & Barcode**
  - Prisma models for `Sale` and `SaleItem` (with per-tenant unique `saleNumber`)
  - Atomic sale completion engine (`POST /api/sales`): creates Sale, SaleItems, FEFO batch deductions, and `SALE` StockMovements inside a single transaction
  - Cashier authorization enforcement (`sales.create` permission)
  - Payment method options (CASH, CARD, DIGITAL)
  - Interactive Point of Sale UI terminal (`/pos`) with live USB Barcode scanner auto-addition
  - Printable receipt modal displaying pharmacy header/footer notes, itemized breakdown, and totals
  - Sales History & Audit page (`/sales`) displaying sale allocations
  - POS & sales unit tests (`backend/tests/sales.test.ts`)

- [x] **Part 8: Returns, Damage, Expiry & Adjustments**
  - Prisma models for `SaleReturn` and `ReturnItem` (with per-tenant unique `returnNumber`)
  - Inspection condition workflow (`SELLABLE` vs `QUARANTINED` / `DAMAGED` / `EXPIRED`)
  - `SELLABLE` condition increments sellable batch stock and writes `RETURN` StockMovement (`RETURN_SELLABLE`)
  - `QUARANTINED` / `DAMAGED` condition keeps sellable stock unchanged and writes `RETURN` StockMovement (`RETURN_QUARANTINE`)
  - Return quantity validation (cannot return more items than originally purchased)
  - Damaged stock declaration API (`POST /api/returns/damage`) writing `DAMAGE` StockMovements
  - Expired stock disposal API (`POST /api/returns/dispose-expired`) setting batch status `EXPIRED` & writing `EXPIRY` StockMovements
  - Returns & Adjustments Hub UI page (`/returns`)
  - Unit tests for returns & damage validation (`backend/tests/returns.test.ts`)

- [x] **Part 9: Alerts & Notifications** (Current)
  - Prisma model for `Alert` (`OUT_OF_STOCK`, `LOW_STOCK`, `EXPIRING_SOON`, `EXPIRED`)
  - Configurable pharmacy threshold evaluation (`lowStockThreshold`, `expiryWarningDays`, `criticalExpiryDays`)
  - Idempotent alert generation (prevents duplicate unresolved alerts)
  - Alerts API endpoints (`GET /api/alerts`, `GET /api/alerts/summary`, `PUT /api/alerts/:id/resolve`)
  - Real-time TopNav notification counter badge & polling
  - Inventory Alert Center UI page (`/alerts`) with status tabs and resolution actions
  - Alert evaluation unit tests (`backend/tests/alerts.test.ts`)

- [x] **Part 10: Dashboard + Analytics**
  - Real-time database aggregated business performance metrics (`AnalyticsService`)
  - Sales Revenue, Gross Profit (Revenue - COGS), Cost of Goods Sold, and Inventory Cost Valuation metrics
  - Reporting period dimension filters (`today`, `yesterday`, `7days`, `30days`, `this_month`)
  - Payment instrument breakdown (Cash, Card, Digital)
  - Ranked Top Selling Products table by total revenue
  - Analytics API endpoints (`GET /api/analytics/overview`, `GET /api/analytics/top-products`)
  - Main Dashboard & Business Analytics page UI (`/`)

- [x] **Part 11: Reports, Audit Logs & Production Security**
  - Executive Reporting Service (`ReportService`) & Endpoints (`/api/reports`)
  - Itemized Sales & Profitability Report (`GET /api/reports/sales`) with date range & payment method filters
  - Inventory Lot Valuation & Expiry Risk Report (`GET /api/reports/inventory`)
  - Immutable Stock Movement Audit Ledger Report (`GET /api/reports/stock-movements`) with movement type filters
  - RFC 4180 compliant CSV Export Endpoints (`GET /api/reports/sales/csv`, `GET /api/reports/inventory/csv`, `GET /api/reports/stock-movements/csv`)
  - Audit Trail Engine (`AuditLogService`) & paginated API (`GET /api/audit-logs`)
  - Security hardening (Helmet security headers, HttpOnly cookies, CORS origin restriction, error message sanitization)
  - Executive Reports Hub UI (`/reports`) with tabbed panels and instant CSV downloads
  - System Audit Trail Center UI (`/audit`) with action badges, search filters, and JSON metadata inspector modal
  - Unit tests for reports & audit trail (`backend/tests/reports.test.ts`, `backend/tests/audit.test.ts`)

- [x] **Part 12: Production Deployment & Real Pharmacy Pilot**
  - Product & Inventory CSV Data Migration Service (`ImportService`) & API endpoints (`POST /api/import/preview`, `POST /api/import/execute`)
  - Multi-stage CSV validation engine (barcode/SKU duplicate detection, header matching, price/date formatting checks)
  - Atomic bulk import engine creating medicines, categories, initial lot batches, and `ADJUSTMENT_IN` stock movements
  - Bulk CSV Data Migration Center UI page (`/import`) with sample CSV download, drag-and-drop dropzone, raw CSV text editor, live validation table, and atomic execution trigger
  - Data import unit tests (`backend/tests/import.test.ts`)
  - Comprehensive Production Deployment & Administration Guide (`docs/deployment.md`)
  - Real Pharmacy Onboarding & Go-Live Pilot Checklist (`docs/pilot_readiness.md`)
