# PharmacyOS — Database Schema & Data Principles

## Core Principles
1. **Row-Level Tenant Isolation**: Every tenant-owned table includes an `organizationId` foreign key referencing the `Organization` table.
2. **Immutable Ledgers**: `StockMovement` records are append-only. Stock balance changes MUST be accompanied by a ledger record.
3. **Product vs Batch**:
   - `Product` represents the package/medicine specification (Name, Dosage, Strength, Barcode).
   - `Batch` represents the specific physical lot (Batch Number, Expiry Date, Purchase Price, Selling Price, Available Quantity).

## Initial Schema Entities (Part 1 Foundation)

### `Organization` (Tenant)
- `id`: UUID (Primary Key)
- `name`: String
- `legalName`: String?
- `phone`: String?
- `email`: String?
- `address`: String?
- `currency`: String (Default: "USD")
- `timezone`: String (Default: "UTC")
- `createdAt`: DateTime
- `updatedAt`: DateTime

### `User`
- `id`: UUID (Primary Key)
- `organizationId`: UUID (Foreign Key -> Organization)
- `email`: String (Unique per tenant)
- `username`: String (Unique per tenant)
- `passwordHash`: String
- `fullName`: String
- `status`: UserStatus (ACTIVE, INACTIVE, SUSPENDED)
- `createdAt`: DateTime
- `updatedAt`: DateTime

### `Role`
- `id`: UUID (Primary Key)
- `organizationId`: UUID? (Null for system-defined global roles)
- `name`: String
- `code`: String
- `isSystem`: Boolean
- `description`: String?

### `Permission`
- `id`: UUID (Primary Key)
- `code`: String (Unique, e.g. `inventory.view`, `sales.create`)
- `module`: String
- `description`: String

### `RolePermission` & `UserRole`
- Cross-reference tables providing granular role-permission bindings.

### `AuditLog`
- `id`: UUID (Primary Key)
- `organizationId`: UUID
- `userId`: UUID?
- `action`: String
- `entity`: String
- `entityId`: String?
- `metadata`: Json?
- `ipAddress`: String?
- `userAgent`: String?
- `createdAt`: DateTime

## Database Migration Workflow
- Prisma migrations are stored under `prisma/migrations/`.
- Development: `npx prisma migrate dev --name <migration_name>`
- Production: `npx prisma migrate deploy`
