-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "customerWhatsAppSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "secureToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_secureToken_key" ON "Invoice"("secureToken");
