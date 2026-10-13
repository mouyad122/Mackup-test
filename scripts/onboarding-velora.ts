import { db } from '../src/lib/db';

async function run() {
  console.log("Configuring Velora Beauty via Database Settings (Simulating Admin)...");

  // 1. Update Store Settings
  const settingsObj = {
    storeName: "Velora Beauty",
    addressAr: "عمان, الأردن",
    addressEn: "Amman, Jordan",
    phone: "+962799999999",
    whatsapp: "+962799999999",
    openingHours: "10:00 AM - 10:00 PM"
  };

  await db.storeLocationSettings.upsert({
    where: { id: "default" },
    update: settingsObj,
    create: { id: "default", ...settingsObj, latitude: 31.95, longitude: 35.93, mapPlaceUrl: "", mapEmbedUrl: "" }
  });

  // 2. Global Pricing Settings
  await db.globalPricingSettings.upsert({
    where: { id: "1" },
    update: { currencyCode: 'USD', currencySymbol: '$' },
    create: { id: "1", currencyCode: 'USD', currencySymbol: '$' }
  });

  // 3. Create a Brand
  const brand = await db.brand.upsert({
    where: { slug: 'velora' },
    update: { nameEn: 'Velora', nameAr: 'فيلورا' },
    create: { slug: 'velora', nameEn: 'Velora', nameAr: 'فيلورا', isVisible: true }
  });

  // 4. Create a Category
  const cat = await db.category.upsert({
    where: { slug: 'skincare' },
    update: { name: 'Skincare' },
    create: { slug: 'skincare', name: 'Skincare' }
  });

  // 5. Create a Product
  const prod = await db.product.upsert({
    where: { slug: 'velora-glow-serum' },
    update: { nameEn: 'Velora Glow Serum', nameAr: 'سيروم فيلورا للإشراقة', categoryId: cat.id, brandId: brand.id },
    create: {
      slug: 'velora-glow-serum',
      sku: 'V-GLOW',
      nameEn: 'Velora Glow Serum',
      nameAr: 'سيروم فيلورا للإشراقة',
      categoryId: cat.id,
      brandId: brand.id,
      isVisible: true
    }
  });

  console.log("✅ Velora Beauty Configured Successfully.");
}

run().catch(console.error).finally(() => db.$disconnect());
