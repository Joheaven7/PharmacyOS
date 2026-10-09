# PharmacyOS — Real Pharmacy Pilot Onboarding & Go-Live Checklist

## 1. Pre-Deployment Onboarding Checklist

- [ ] **Pharmacy Business Profile Setup**: Configure pharmacy legal name, phone, address, tax ID, and currency in `/settings`.
- [ ] **Operational Thresholds**: Set Low Stock Threshold, Expiry Warning Days (default 90 days), and Critical Expiry Days (default 30 days).
- [ ] **Receipt Footer Notes**: Set pharmacy thermal printer header and return policy footer message.
- [ ] **Staff Accounts & RBAC**: Register pharmacy staff accounts with dedicated system roles:
  - `OWNER` / `MANAGER`: Full access to settings, users, purchasing, and reports.
  - `PHARMACIST`: Access to medicines catalog, batch intake, and stock adjustments.
  - `CASHIER`: Access strictly to POS terminal (`/pos`) and receipts.

---

## 2. Inventory Data Migration Workflow

1. Download sample CSV template from `/import`.
2. Format existing medicine catalog with package barcodes, SKUs, initial active lot numbers, expiry dates, and purchase vs retail prices.
3. Upload CSV into `/import` center and review the validation preview.
4. Execute atomic CSV import to populate the database with initial stock movements (`ADJUSTMENT_IN`).

---

## 3. Hardware Setup (USB Barcode Scanner & Thermal Receipt Printers)

- **USB Barcode Scanner**: Plug-and-play HID USB keyboard emulation scanner (Honeywell, Zebra, Datalogic).
  - Test by opening `/pos` or `/medicines` and scanning any EAN-13 / UPC barcode.
  - The scanner auto-focus hook (`useBarcodeScanner`) will capture scans without manual input focus.
- **Receipt Thermal Printer**:
  - Connect standard 80mm or 58mm POS thermal printer via USB / LAN.
  - Test printing a receipt modal from `/pos` after completing a test sale.

---

## 4. Go-Live Final System Audit Checklist

- [ ] Multi-tenant isolation verified (organization row context enforced on all endpoints).
- [ ] FEFO deduction engine verified (earliest expiring active batches automatically consumed during POS sales).
- [ ] Immutable stock ledger verified (no direct quantity mutations without `StockMovement` records).
- [ ] Backup system scheduled & tested.
