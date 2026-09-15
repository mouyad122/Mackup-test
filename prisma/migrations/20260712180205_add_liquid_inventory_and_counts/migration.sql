/*
  Warnings:

  - You are about to drop the column `name` on the `ProductNote` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `ProductNote` table. All the data in the column will be lost.
  - Added the required column `nameAr` to the `ProductNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nameEn` to the `ProductNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `noteType` to the `ProductNote` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EmployeePermission" ALTER COLUMN "grantedByEmployeeId" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "cashierNameSnapshot" TEXT,
ADD COLUMN     "cashierRoleSnapshot" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "inventoryMode" TEXT NOT NULL DEFAULT 'FINISHED_PRODUCT',
ADD COLUMN     "notesStatus" TEXT NOT NULL DEFAULT 'VERIFIED';

-- AlterTable
ALTER TABLE "ProductNote" DROP COLUMN "name",
DROP COLUMN "type",
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "nameAr" TEXT NOT NULL,
ADD COLUMN     "nameEn" TEXT NOT NULL,
ADD COLUMN     "noteType" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "saleSource" TEXT NOT NULL DEFAULT 'POS',
ADD COLUMN     "sellerEmailSnapshot" TEXT,
ADD COLUMN     "sellerEmployeeCodeSnapshot" TEXT,
ADD COLUMN     "sellerNameSnapshot" TEXT,
ADD COLUMN     "sellerRoleSnapshot" TEXT,
ADD COLUMN     "sessionId" TEXT,
ADD COLUMN     "shiftId" TEXT,
ADD COLUMN     "soldByEmployeeId" TEXT,
ADD COLUMN     "terminalId" TEXT;

-- CreateTable
CREATE TABLE "ProductLiquidStock" (
    "productId" TEXT NOT NULL,
    "quantityMl" INTEGER NOT NULL DEFAULT 0,
    "lowStockThresholdMl" INTEGER NOT NULL DEFAULT 1000,
    "verificationStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "lastVerifiedAt" TIMESTAMP(3),
    "lastVerifiedByEmployeeId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductLiquidStock_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "ProductLiquidMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantityBeforeMl" INTEGER NOT NULL,
    "quantityChangeMl" INTEGER NOT NULL,
    "quantityAfterMl" INTEGER NOT NULL,
    "relatedSaleId" TEXT,
    "relatedInvoiceId" TEXT,
    "employeeId" TEXT NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductLiquidMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountSession" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "assignedEmployeeId" TEXT NOT NULL,
    "assignedByEmployeeId" TEXT NOT NULL,
    "reviewedByEmployeeId" TEXT,
    "approvedByEmployeeId" TEXT,
    "scopeType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryCountSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryCountLine" (
    "id" TEXT NOT NULL,
    "countSessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryMode" TEXT NOT NULL,
    "expectedQuantityMlSnapshot" INTEGER NOT NULL,
    "countedQuantityMl" INTEGER NOT NULL,
    "varianceMl" INTEGER NOT NULL,
    "expectedUnitsSnapshot" INTEGER,
    "countedUnits" INTEGER,
    "varianceUnits" INTEGER,
    "countStatus" TEXT NOT NULL,
    "employeeNote" TEXT,
    "managerNote" TEXT,
    "countedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductLiquidStock_productId_key" ON "ProductLiquidStock"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLiquidMovement_idempotencyKey_key" ON "ProductLiquidMovement"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryCountSession_reference_key" ON "InventoryCountSession"("reference");

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_soldByEmployeeId_fkey" FOREIGN KEY ("soldByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLiquidStock" ADD CONSTRAINT "ProductLiquidStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLiquidStock" ADD CONSTRAINT "ProductLiquidStock_lastVerifiedByEmployeeId_fkey" FOREIGN KEY ("lastVerifiedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLiquidMovement" ADD CONSTRAINT "ProductLiquidMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLiquidMovement" ADD CONSTRAINT "ProductLiquidMovement_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountSession" ADD CONSTRAINT "InventoryCountSession_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountSession" ADD CONSTRAINT "InventoryCountSession_assignedByEmployeeId_fkey" FOREIGN KEY ("assignedByEmployeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountSession" ADD CONSTRAINT "InventoryCountSession_reviewedByEmployeeId_fkey" FOREIGN KEY ("reviewedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountSession" ADD CONSTRAINT "InventoryCountSession_approvedByEmployeeId_fkey" FOREIGN KEY ("approvedByEmployeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_countSessionId_fkey" FOREIGN KEY ("countSessionId") REFERENCES "InventoryCountSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryCountLine" ADD CONSTRAINT "InventoryCountLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
