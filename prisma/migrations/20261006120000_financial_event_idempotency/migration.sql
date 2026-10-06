-- Add nullable idempotency keys for financial events. Existing rows remain
-- unchanged; PostgreSQL permits multiple NULL values in this unique index.
ALTER TABLE "FinancialTransaction"
ADD COLUMN "businessEventKey" TEXT;

CREATE UNIQUE INDEX "FinancialTransaction_businessEventKey_key"
ON "FinancialTransaction"("businessEventKey");

ALTER TABLE "SaleItem"
ADD COLUMN "discountAmountSnapshot" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "supplierOfferIdSnapshot" TEXT,
ADD COLUMN "supplierIdSnapshot" TEXT,
ADD COLUMN "supplierNameSnapshot" TEXT,
ADD COLUMN "unitCostSnapshot" INTEGER,
ADD COLUMN "supplierProfitShareBpsSnapshot" INTEGER,
ADD COLUMN "supplierAmountSnapshot" INTEGER,
ADD COLUMN "platformProductProfitSnapshot" INTEGER;

ALTER TABLE "ProductVariant"
ADD COLUMN "inventorySource" TEXT NOT NULL DEFAULT 'INTERNAL';

-- Preserve the prior sourcing behavior for variants already managed through offers.
UPDATE "ProductVariant" v
SET "inventorySource" = 'SUPPLIER'
WHERE EXISTS (SELECT 1 FROM "SupplierOffer" o WHERE o."variantId" = v."id");
