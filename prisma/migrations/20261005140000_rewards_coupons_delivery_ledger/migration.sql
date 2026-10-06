ALTER TABLE "Order" ADD COLUMN "discountAmount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponDiscount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "rewardDiscount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "couponCodeSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN "rewardNameSnapshot" TEXT;
ALTER TABLE "Order" ADD COLUMN "shippingZoneNameSnapshot" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "discountAmountSnapshot" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShippingZone" ADD COLUMN "captainEarning" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN "refundAmountFils" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "SupplierInventoryMovement" (
  "id" TEXT NOT NULL, "supplierOfferId" TEXT NOT NULL, "quantityDelta" INTEGER NOT NULL,
  "quantityBefore" INTEGER NOT NULL, "quantityAfter" INTEGER NOT NULL, "reason" TEXT NOT NULL,
  "reference" TEXT, "actorEmployeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierInventoryMovement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierInventoryMovement_supplierOfferId_createdAt_idx" ON "SupplierInventoryMovement"("supplierOfferId", "createdAt");
ALTER TABLE "SupplierInventoryMovement" ADD CONSTRAINT "SupplierInventoryMovement_supplierOfferId_fkey" FOREIGN KEY ("supplierOfferId") REFERENCES "SupplierOffer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RewardRule" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "minimumAmount" INTEGER NOT NULL,
  "rewardType" TEXT NOT NULL, "rewardValue" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3),
  "usageLimit" INTEGER, "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RewardRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RewardRule_isActive_minimumAmount_idx" ON "RewardRule"("isActive", "minimumAmount");

CREATE TABLE "Coupon" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT,
  "discountType" TEXT NOT NULL, "discountValue" INTEGER NOT NULL DEFAULT 0,
  "minimumOrderAmount" INTEGER NOT NULL DEFAULT 0, "maximumDiscount" INTEGER,
  "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "usageLimit" INTEGER,
  "perCustomerLimit" INTEGER, "usageCount" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");
CREATE INDEX "Coupon_isActive_startsAt_endsAt_idx" ON "Coupon"("isActive", "startsAt", "endsAt");

CREATE TABLE "CouponTarget" (
  "id" TEXT NOT NULL, "couponId" TEXT NOT NULL, "targetType" TEXT NOT NULL, "targetId" TEXT NOT NULL,
  CONSTRAINT "CouponTarget_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponTarget_couponId_targetType_targetId_key" ON "CouponTarget"("couponId", "targetType", "targetId");
CREATE INDEX "CouponTarget_targetType_targetId_idx" ON "CouponTarget"("targetType", "targetId");
ALTER TABLE "CouponTarget" ADD CONSTRAINT "CouponTarget_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CouponRedemption" (
  "id" TEXT NOT NULL, "couponId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "customerKey" TEXT NOT NULL, "amount" INTEGER NOT NULL, "isVoided" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");
CREATE INDEX "CouponRedemption_couponId_customerKey_idx" ON "CouponRedemption"("couponId", "customerKey");
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "RewardRedemption" (
  "id" TEXT NOT NULL, "rewardRuleId" TEXT NOT NULL, "orderId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 0, "isVoided" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RewardRedemption_rewardRuleId_orderId_key" ON "RewardRedemption"("rewardRuleId", "orderId");
CREATE INDEX "RewardRedemption_rewardRuleId_isVoided_idx" ON "RewardRedemption"("rewardRuleId", "isVoided");
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardRuleId_fkey" FOREIGN KEY ("rewardRuleId") REFERENCES "RewardRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Captain" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE', "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Captain_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Captain_phone_key" ON "Captain"("phone");

CREATE TABLE "DeliveryAssignment" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "captainId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ASSIGNED', "captainEarning" INTEGER NOT NULL,
  "customerDeliveryFee" INTEGER NOT NULL, "actualCarrierCost" INTEGER,
  "assignedByEmployeeId" TEXT, "deliveredAt" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryAssignment_orderId_key" ON "DeliveryAssignment"("orderId");
CREATE INDEX "DeliveryAssignment_captainId_status_idx" ON "DeliveryAssignment"("captainId", "status");
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeliveryAssignment" ADD CONSTRAINT "DeliveryAssignment_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierSettlement" (
  "id" TEXT NOT NULL, "supplierId" TEXT NOT NULL, "amount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL, "reference" TEXT, "notes" TEXT, "createdByEmployeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierSettlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierSettlement_supplierId_createdAt_idx" ON "SupplierSettlement"("supplierId", "createdAt");
ALTER TABLE "SupplierSettlement" ADD CONSTRAINT "SupplierSettlement_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CaptainSettlement" (
  "id" TEXT NOT NULL, "captainId" TEXT NOT NULL, "amount" INTEGER NOT NULL,
  "paymentMethod" TEXT NOT NULL, "reference" TEXT, "notes" TEXT, "createdByEmployeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CaptainSettlement_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CaptainSettlement_captainId_createdAt_idx" ON "CaptainSettlement"("captainId", "createdAt");
ALTER TABLE "CaptainSettlement" ADD CONSTRAINT "CaptainSettlement_captainId_fkey" FOREIGN KEY ("captainId") REFERENCES "Captain"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinancialTransaction" (
  "id" TEXT NOT NULL, "type" TEXT NOT NULL, "direction" TEXT NOT NULL, "amount" INTEGER NOT NULL,
  "orderId" TEXT, "saleId" TEXT, "supplierId" TEXT, "captainId" TEXT, "deliveryAssignmentId" TEXT,
  "description" TEXT NOT NULL, "createdByEmployeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FinancialTransaction_type_createdAt_idx" ON "FinancialTransaction"("type", "createdAt");
CREATE INDEX "FinancialTransaction_supplierId_createdAt_idx" ON "FinancialTransaction"("supplierId", "createdAt");
CREATE INDEX "FinancialTransaction_captainId_createdAt_idx" ON "FinancialTransaction"("captainId", "createdAt");
CREATE INDEX "FinancialTransaction_orderId_type_idx" ON "FinancialTransaction"("orderId", "type");
CREATE INDEX "FinancialTransaction_saleId_idx" ON "FinancialTransaction"("saleId");
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_deliveryAssignmentId_fkey" FOREIGN KEY ("deliveryAssignmentId") REFERENCES "DeliveryAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Expense" (
  "id" TEXT NOT NULL, "category" TEXT NOT NULL, "amount" INTEGER NOT NULL,
  "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "description" TEXT NOT NULL,
  "reference" TEXT, "createdByEmployeeId" TEXT, "financialTransactionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Expense_financialTransactionId_key" ON "Expense"("financialTransactionId");
CREATE INDEX "Expense_expenseDate_category_idx" ON "Expense"("expenseDate", "category");
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_financialTransactionId_fkey" FOREIGN KEY ("financialTransactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the ledger from existing confirmed storefront orders without inventing
-- costs. NULL cost snapshots remain absent and are surfaced as unknown.
INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "supplierId", "description", "createdAt")
SELECT gen_random_uuid()::text, 'SALE', 'IN', oi."total", o."id", oi."supplierIdSnapshot",
       'Historical product sale: ' || oi."name" || ' (' || o."reference" || ')', o."createdAt"
FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
WHERE o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');

INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "supplierId", "description", "createdAt")
SELECT gen_random_uuid()::text, 'PRODUCT_COST', 'OUT', oi."unitCostSnapshot" * oi."quantity", o."id", oi."supplierIdSnapshot",
       'Historical product cost: ' || oi."name" || ' (' || o."reference" || ')', o."createdAt"
FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
WHERE oi."unitCostSnapshot" IS NOT NULL
  AND o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');

INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "supplierId", "description", "createdAt")
SELECT gen_random_uuid()::text, 'SUPPLIER_OBLIGATION', 'OUT', (oi."unitCostSnapshot" * oi."quantity") + COALESCE(oi."supplierAmountSnapshot", 0), o."id", oi."supplierIdSnapshot",
       'Historical supplier obligation: ' || oi."name" || ' (' || o."reference" || ')', o."createdAt"
FROM "OrderItem" oi JOIN "Order" o ON o."id" = oi."orderId"
WHERE oi."unitCostSnapshot" IS NOT NULL AND oi."supplierIdSnapshot" IS NOT NULL
  AND o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');

INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "description", "createdAt")
SELECT gen_random_uuid()::text, 'DELIVERY_REVENUE', 'IN', o."shippingCost", o."id",
       'Historical customer delivery fee (' || o."reference" || ')', o."createdAt"
FROM "Order" o
WHERE o."shippingCost" > 0
  AND o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');

INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "description", "createdAt")
SELECT gen_random_uuid()::text, 'DELIVERY_COST', 'OUT', o."actualDeliveryCost", o."id",
       'Historical carrier cost (' || o."reference" || ')', o."createdAt"
FROM "Order" o
WHERE o."actualDeliveryCost" IS NOT NULL AND o."actualDeliveryCost" > 0
  AND o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');

INSERT INTO "FinancialTransaction" ("id", "type", "direction", "amount", "orderId", "description", "createdAt")
SELECT gen_random_uuid()::text, CASE WHEN o."couponDiscount" > 0 THEN 'COUPON' ELSE 'DISCOUNT' END, 'OUT', o."discountAmount", o."id",
       'Historical order discount (' || o."reference" || ')', o."createdAt"
FROM "Order" o
WHERE o."discountAmount" > 0
  AND o."status" IN ('CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED');
