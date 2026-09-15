-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "needsReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewReasons" TEXT,
ADD COLUMN     "stockStatus" TEXT NOT NULL DEFAULT 'UNVERIFIED';

