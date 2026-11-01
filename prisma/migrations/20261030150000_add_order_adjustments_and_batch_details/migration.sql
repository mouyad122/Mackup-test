-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "hasAdjustment" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "previousTotalAmount" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "adjustmentNotes" TEXT;

-- AlterTable OrderItem
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "isRemoved" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "removalReason" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "missingQuantity" INTEGER NOT NULL DEFAULT 0;

-- AlterTable DeliveryBatch
ALTER TABLE "DeliveryBatch" ADD COLUMN IF NOT EXISTS "courierCompany" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN IF NOT EXISTS "courierPhone" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN IF NOT EXISTS "secureToken" TEXT;
ALTER TABLE "DeliveryBatch" ADD COLUMN IF NOT EXISTS "notes" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "DeliveryBatch_secureToken_key" ON "DeliveryBatch"("secureToken");

-- AlterTable FulfillmentItem
ALTER TABLE "FulfillmentItem" ADD COLUMN IF NOT EXISTS "outOfStockQuantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "FulfillmentItem" ADD COLUMN IF NOT EXISTS "outOfStockReason" TEXT;
