-- CreateTable
CREATE TABLE "ShippingZone" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "fee" INTEGER NOT NULL,
    "estimatedDeliveryTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "freeShippingThreshold" INTEGER,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

