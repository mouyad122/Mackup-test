-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "fulfillmentStatus" TEXT DEFAULT 'UNFULFILLED',
ADD COLUMN     "fulfillmentStrategy" TEXT DEFAULT 'DIRECT_PICKUP';

-- CreateTable
CREATE TABLE "SupplierLocation" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "addressDetails" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "pickupInstructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "supplierNameSnapshot" TEXT NOT NULL,
    "pickupAddressSnapshot" TEXT NOT NULL,
    "contactPhoneSnapshot" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "packagesCount" INTEGER NOT NULL DEFAULT 0,
    "supplierNotes" TEXT,
    "internalAdminNotes" TEXT,
    "issueReason" TEXT,
    "readyAt" TIMESTAMP(3),
    "pickedUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentItem" (
    "id" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL,
    "preparedQuantity" INTEGER NOT NULL DEFAULT 0,
    "isOutOfStock" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "fulfillmentOrderId" TEXT NOT NULL,
    "packageCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PACKED',
    "weightKg" DOUBLE PRECISION,
    "dimensionsCm" TEXT,
    "qrPayload" TEXT NOT NULL,
    "pickupBatchId" TEXT,
    "pickedUpByCourier" TEXT,
    "pickedUpAt" TIMESTAMP(3),
    "handoverMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageItem" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "fulfillmentItemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackageItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierAccessSession" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "assignedFulfillmentIds" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdByEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierAccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickupBatch" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "courierName" TEXT,
    "courierPhone" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PickupBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRun" (
    "id" TEXT NOT NULL,
    "runCode" TEXT NOT NULL,
    "courierName" TEXT NOT NULL,
    "courierPhone" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStop" (
    "id" TEXT NOT NULL,
    "deliveryRunId" TEXT NOT NULL,
    "sequenceOrder" INTEGER NOT NULL,
    "stopType" TEXT NOT NULL,
    "pickupBatchId" TEXT,
    "deliveryJobId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "arrivalEstimatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryJob" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "addressDetails" TEXT NOT NULL,
    "mapLocationUrl" TEXT,
    "codAmountToCollect" INTEGER NOT NULL DEFAULT 0,
    "isCodCollected" BOOLEAN NOT NULL DEFAULT false,
    "collectedAt" TIMESTAMP(3),
    "collectedByCourier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentOutbox" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FulfillmentAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "notes" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierLocation_supplierId_isActive_idx" ON "SupplierLocation"("supplierId", "isActive");

-- CreateIndex
CREATE INDEX "FulfillmentOrder_orderId_idx" ON "FulfillmentOrder"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentOrder_supplierId_status_idx" ON "FulfillmentOrder"("supplierId", "status");

-- CreateIndex
CREATE INDEX "FulfillmentOrder_status_idx" ON "FulfillmentOrder"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FulfillmentOrder_orderId_supplierId_locationId_key" ON "FulfillmentOrder"("orderId", "supplierId", "locationId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_fulfillmentOrderId_idx" ON "FulfillmentItem"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "FulfillmentItem_orderItemId_idx" ON "FulfillmentItem"("orderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "Package_packageCode_key" ON "Package"("packageCode");

-- CreateIndex
CREATE INDEX "Package_fulfillmentOrderId_idx" ON "Package"("fulfillmentOrderId");

-- CreateIndex
CREATE INDEX "Package_pickupBatchId_idx" ON "Package"("pickupBatchId");

-- CreateIndex
CREATE INDEX "Package_packageCode_idx" ON "Package"("packageCode");

-- CreateIndex
CREATE INDEX "Package_status_idx" ON "Package"("status");

-- CreateIndex
CREATE INDEX "PackageItem_packageId_idx" ON "PackageItem"("packageId");

-- CreateIndex
CREATE INDEX "PackageItem_fulfillmentItemId_idx" ON "PackageItem"("fulfillmentItemId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierAccessSession_tokenHash_key" ON "SupplierAccessSession"("tokenHash");

-- CreateIndex
CREATE INDEX "SupplierAccessSession_tokenHash_idx" ON "SupplierAccessSession"("tokenHash");

-- CreateIndex
CREATE INDEX "SupplierAccessSession_supplierId_isRevoked_expiresAt_idx" ON "SupplierAccessSession"("supplierId", "isRevoked", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PickupBatch_batchCode_key" ON "PickupBatch"("batchCode");

-- CreateIndex
CREATE INDEX "PickupBatch_supplierId_locationId_idx" ON "PickupBatch"("supplierId", "locationId");

-- CreateIndex
CREATE INDEX "PickupBatch_status_idx" ON "PickupBatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryRun_runCode_key" ON "DeliveryRun"("runCode");

-- CreateIndex
CREATE INDEX "DeliveryRun_status_scheduledDate_idx" ON "DeliveryRun"("status", "scheduledDate");

-- CreateIndex
CREATE INDEX "DeliveryStop_deliveryRunId_sequenceOrder_idx" ON "DeliveryStop"("deliveryRunId", "sequenceOrder");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryJob_orderId_key" ON "DeliveryJob"("orderId");

-- CreateIndex
CREATE INDEX "DeliveryJob_orderId_idx" ON "DeliveryJob"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentOutbox_status_nextRunAt_idx" ON "FulfillmentOutbox"("status", "nextRunAt");

-- CreateIndex
CREATE INDEX "FulfillmentOutbox_orderId_idx" ON "FulfillmentOutbox"("orderId");

-- CreateIndex
CREATE INDEX "FulfillmentAuditLog_entityType_entityId_idx" ON "FulfillmentAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "FulfillmentAuditLog_createdAt_idx" ON "FulfillmentAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");

-- AddForeignKey
ALTER TABLE "SupplierLocation" ADD CONSTRAINT "SupplierLocation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOrder" ADD CONSTRAINT "FulfillmentOrder_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SupplierLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentItem" ADD CONSTRAINT "FulfillmentItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_fulfillmentOrderId_fkey" FOREIGN KEY ("fulfillmentOrderId") REFERENCES "FulfillmentOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_pickupBatchId_fkey" FOREIGN KEY ("pickupBatchId") REFERENCES "PickupBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageItem" ADD CONSTRAINT "PackageItem_fulfillmentItemId_fkey" FOREIGN KEY ("fulfillmentItemId") REFERENCES "FulfillmentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierAccessSession" ADD CONSTRAINT "SupplierAccessSession_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupBatch" ADD CONSTRAINT "PickupBatch_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickupBatch" ADD CONSTRAINT "PickupBatch_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "SupplierLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_deliveryRunId_fkey" FOREIGN KEY ("deliveryRunId") REFERENCES "DeliveryRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_pickupBatchId_fkey" FOREIGN KEY ("pickupBatchId") REFERENCES "PickupBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_deliveryJobId_fkey" FOREIGN KEY ("deliveryJobId") REFERENCES "DeliveryJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryJob" ADD CONSTRAINT "DeliveryJob_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FulfillmentOutbox" ADD CONSTRAINT "FulfillmentOutbox_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

