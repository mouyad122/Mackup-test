-- AlterTable Supplier
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "ownerName" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Supplier" ADD COLUMN IF NOT EXISTS "mapLocationUrl" TEXT;

-- AlterTable SupplierLocation
ALTER TABLE "SupplierLocation" ADD COLUMN IF NOT EXISTS "mapLocationUrl" TEXT;
