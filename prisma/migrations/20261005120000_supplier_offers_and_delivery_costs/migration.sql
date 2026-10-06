CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierOffer" (
  "id" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "unitCost" INTEGER NOT NULL,
  "supplierProfitShareBps" INTEGER NOT NULL DEFAULT 0,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "supplierSku" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SupplierOffer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ShippingZone" ADD COLUMN "actualDeliveryCost" INTEGER;
ALTER TABLE "Order" ADD COLUMN "actualDeliveryCost" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "supplierIdSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "supplierOfferIdSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "supplierNameSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "unitCostSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "supplierProfitShareBpsSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "supplierAmountSnapshot" INTEGER;
ALTER TABLE "OrderItem" ADD COLUMN "platformProductProfitSnapshot" INTEGER;

CREATE UNIQUE INDEX "SupplierOffer_supplierId_variantId_key" ON "SupplierOffer"("supplierId", "variantId");
CREATE INDEX "Supplier_isActive_name_idx" ON "Supplier"("isActive", "name");
CREATE INDEX "SupplierOffer_variantId_isActive_idx" ON "SupplierOffer"("variantId", "isActive");
CREATE INDEX "SupplierOffer_supplierId_isActive_idx" ON "SupplierOffer"("supplierId", "isActive");

ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
