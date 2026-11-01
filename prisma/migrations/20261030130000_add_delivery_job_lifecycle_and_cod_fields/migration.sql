-- AlterTable
ALTER TABLE "DeliveryJob" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "codStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN "codSettledAt" TIMESTAMP(3),
ADD COLUMN "codSettledByEmployeeId" TEXT;

-- CreateIndex
CREATE INDEX "DeliveryJob_status_idx" ON "DeliveryJob"("status");

-- CreateIndex
CREATE INDEX "DeliveryJob_codStatus_idx" ON "DeliveryJob"("codStatus");
