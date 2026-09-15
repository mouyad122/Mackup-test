-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "orderId" TEXT,
ALTER COLUMN "saleId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
