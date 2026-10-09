# PharmacyOS — Business Rules

## 1. Inventory & FEFO (First Expire, First Out)
- Every medicine unit sold or issued must be drawn from the earliest expiring available batch (`FEFO`).
- Stock with an expiry date `<= current_date` is marked `EXPIRED` and CANNOT be selected for sale.
- Negative inventory balances are strictly prohibited by default.

## 2. Stock Ledger Integrity
- Direct mutations to stock quantities without an accompanying `StockMovement` entry are forbidden.
- Valid `StockMovementType` values:
  - `PURCHASE` (+)
  - `SALE` (-)
  - `RETURN_SELLABLE` (+)
  - `RETURN_QUARANTINE` (0 / isolated)
  - `DAMAGE` (-)
  - `EXPIRY` (-)
  - `ADJUSTMENT_IN` (+)
  - `ADJUSTMENT_OUT` (-)

## 3. Financial Transaction Atomicity
- Sales creation MUST occur in a single database transaction comprising:
  1. Creation of `Sale` record.
  2. Creation of `SaleItem` records with allocated batch IDs.
  3. Batch quantity deductions.
  4. Generation of `StockMovement` entries for each deduction.
- If any operation in the pipeline fails, the entire transaction rolls back cleanly.

## 4. Product vs. Batch & Barcode Rules
- Barcodes identify the `Product` (packaging / GTIN / EAN), NOT individual batches.
- Batches are identified by `batchNumber` + `expiryDate` under a specific `Product`.
