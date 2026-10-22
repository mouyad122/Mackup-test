import { pool, prisma } from '../src/lib/db';

const DEMO_IMAGE = '/images/demo/placeholder-primary.jpg';
const SEED_REFERENCE = 'DEMO-CATALOG-SEED-V1';

const categories = [
  { slug: 'demo-makeup', name: 'مكياج', description: 'منتجات مكياج تجريبية لاختبار المتجر.' },
  { slug: 'demo-abayas', name: 'عبايات', description: 'عبايات تجريبية بتصاميم عصرية.' },
  { slug: 'demo-dresses', name: 'فساتين', description: 'فساتين تجريبية للمناسبات.' },
  { slug: 'demo-heritage', name: 'أثواب تراثية', description: 'قطع تجريبية مستوحاة من التراث الأردني.' },
] as const;

const suppliers = [
  {
    key: 'beauty',
    name: 'مورد رَواق للجمال (تجريبي)',
    email: 'demo.beauty.supplier@rawaq.local',
    phone: '0790001001',
    notes: 'مورد تجريبي لمنتجات المكياج. يمكن حذف بياناته بعد انتهاء الاختبار.',
    profitShareBps: 3000,
  },
  {
    key: 'fashion',
    name: 'مشغل التراث الأردني (تجريبي)',
    email: 'demo.fashion.supplier@rawaq.local',
    phone: '0790001002',
    notes: 'مورد تجريبي للعبايات والفساتين والأثواب. يمكن حذف بياناته بعد انتهاء الاختبار.',
    profitShareBps: 2500,
  },
] as const;

const products = [
  {
    slug: 'demo-velvet-lipstick',
    sku: 'DEMO-MK-LIP-001',
    nameAr: 'أحمر شفاه مخملي',
    nameEn: 'Velvet Lipstick',
    categorySlug: 'demo-makeup',
    supplierKey: 'beauty',
    featuredOrder: 1,
    shortDescription: 'أحمر شفاه تجريبي بلمسة مخملية وثبات طويل.',
    variants: [
      { size: 'وردي ترابي', sku: 'DEMO-MK-LIP-001-ROSE', price: 14900, compareAt: 17500, unitCost: 7000, stock: 25 },
      { size: 'أحمر كلاسيكي', sku: 'DEMO-MK-LIP-001-RED', price: 14900, compareAt: 17500, unitCost: 7000, stock: 18 },
    ],
  },
  {
    slug: 'demo-glow-serum',
    sku: 'DEMO-MK-SER-001',
    nameAr: 'سيروم الإشراقة',
    nameEn: 'Glow Serum',
    categorySlug: 'demo-makeup',
    supplierKey: 'beauty',
    featuredOrder: 2,
    shortDescription: 'سيروم تجريبي خفيف يمنح البشرة ترطيبًا وإشراقة.',
    variants: [
      { size: '30 مل', sku: 'DEMO-MK-SER-001-30', price: 22500, compareAt: null, unitCost: 12000, stock: 18 },
    ],
  },
  {
    slug: 'demo-lash-mascara',
    sku: 'DEMO-MK-MAS-001',
    nameAr: 'ماسكارا تكثيف الرموش',
    nameEn: 'Volume Mascara',
    categorySlug: 'demo-makeup',
    supplierKey: 'beauty',
    featuredOrder: 3,
    shortDescription: 'ماسكارا تجريبية بلون أسود غني لإطلالة أكثر كثافة.',
    variants: [
      { size: 'أسود', sku: 'DEMO-MK-MAS-001-BLK', price: 11750, compareAt: null, unitCost: 5250, stock: 30 },
    ],
  },
  {
    slug: 'demo-everyday-abaya',
    sku: 'DEMO-ABY-001',
    nameAr: 'عباية يومية أنيقة',
    nameEn: 'Elegant Everyday Abaya',
    categorySlug: 'demo-abayas',
    supplierKey: 'fashion',
    featuredOrder: 4,
    shortDescription: 'عباية تجريبية بقصة مريحة وتفاصيل هادئة للاستخدام اليومي.',
    variants: [
      { size: 'مقاس 52', sku: 'DEMO-ABY-001-52', price: 45000, compareAt: null, unitCost: 28000, stock: 9 },
      { size: 'مقاس 56', sku: 'DEMO-ABY-001-56', price: 45000, compareAt: null, unitCost: 28000, stock: 7 },
    ],
  },
  {
    slug: 'demo-embroidered-abaya',
    sku: 'DEMO-ABY-002',
    nameAr: 'عباية بتطريز أردني',
    nameEn: 'Jordanian Embroidered Abaya',
    categorySlug: 'demo-abayas',
    supplierKey: 'fashion',
    featuredOrder: 5,
    shortDescription: 'عباية تجريبية مزينة بتفاصيل مستوحاة من التطريز الأردني.',
    variants: [
      { size: 'مقاس 54', sku: 'DEMO-ABY-002-54', price: 62000, compareAt: 68000, unitCost: 40000, stock: 6 },
    ],
  },
  {
    slug: 'demo-evening-dress',
    sku: 'DEMO-DRS-001',
    nameAr: 'فستان سهرة زيتوني',
    nameEn: 'Olive Evening Dress',
    categorySlug: 'demo-dresses',
    supplierKey: 'fashion',
    featuredOrder: 6,
    shortDescription: 'فستان سهرة تجريبي بلون زيتوني وقصة انسيابية.',
    variants: [
      { size: 'M', sku: 'DEMO-DRS-001-M', price: 55000, compareAt: null, unitCost: 34000, stock: 8 },
      { size: 'L', sku: 'DEMO-DRS-001-L', price: 55000, compareAt: null, unitCost: 34000, stock: 6 },
    ],
  },
  {
    slug: 'demo-heritage-thobe',
    sku: 'DEMO-HER-001',
    nameAr: 'ثوب تراثي مطرز',
    nameEn: 'Embroidered Heritage Thobe',
    categorySlug: 'demo-heritage',
    supplierKey: 'fashion',
    featuredOrder: 7,
    shortDescription: 'ثوب تجريبي مستوحى من النقوش والألوان التراثية الأردنية.',
    variants: [
      { size: 'مقاس موحد', sku: 'DEMO-HER-001-ONE', price: 75000, compareAt: 82000, unitCost: 48000, stock: 5 },
    ],
  },
  {
    slug: 'demo-heritage-shawl',
    sku: 'DEMO-HER-002',
    nameAr: 'شال بنقشة تراثية',
    nameEn: 'Heritage Pattern Shawl',
    categorySlug: 'demo-heritage',
    supplierKey: 'fashion',
    featuredOrder: 8,
    shortDescription: 'شال تجريبي خفيف بنقشة مستوحاة من التراث المحلي.',
    variants: [
      { size: 'مقاس موحد', sku: 'DEMO-HER-002-ONE', price: 18000, compareAt: null, unitCost: 9000, stock: 20 },
    ],
  },
] as const;

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();
    for (const category of categories) {
      const saved = await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        update: { name: category.name, description: category.description },
      });
      categoryIds.set(category.slug, saved.id);
    }

    const supplierRecords = new Map<string, { id: string; profitShareBps: number }>();
    for (const supplier of suppliers) {
      const existing = await tx.supplier.findFirst({ where: { email: supplier.email } });
      const saved = existing
          ? await tx.supplier.update({
            where: { id: existing.id },
            data: {
              name: supplier.name,
              phone: supplier.phone,
              notes: supplier.notes,
              profitMargin: supplier.profitShareBps / 100,
              isActive: true,
            },
          })
        : await tx.supplier.create({
            data: {
              name: supplier.name,
              email: supplier.email,
              phone: supplier.phone,
              notes: supplier.notes,
              profitMargin: supplier.profitShareBps / 100,
              isActive: true,
            },
          });
      supplierRecords.set(supplier.key, { id: saved.id, profitShareBps: supplier.profitShareBps });
    }

    let variantCount = 0;
    let offerCount = 0;
    for (const product of products) {
      const categoryId = categoryIds.get(product.categorySlug);
      const supplier = supplierRecords.get(product.supplierKey);
      if (!categoryId || !supplier) throw new Error(`Missing demo relation for ${product.sku}`);

      const savedProduct = await tx.product.upsert({
        where: { sku: product.sku },
        create: {
          slug: product.slug,
          sku: product.sku,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          shortDescription: product.shortDescription,
          longDescription: `${product.shortDescription} هذا السجل مخصص للتجربة ويمكن حذفه لاحقًا.`,
          categoryId,
          isVisible: true,
          isFeatured: true,
          featuredOrder: product.featuredOrder,
          stockStatus: 'AVAILABLE',
        },
        update: {
          slug: product.slug,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          shortDescription: product.shortDescription,
          longDescription: `${product.shortDescription} هذا السجل مخصص للتجربة ويمكن حذفه لاحقًا.`,
          categoryId,
          isVisible: true,
          isFeatured: true,
          featuredOrder: product.featuredOrder,
          stockStatus: 'AVAILABLE',
        },
      });

      const image = await tx.productImage.findFirst({ where: { productId: savedProduct.id, isMain: true } });
      if (image) {
        await tx.productImage.update({
          where: { id: image.id },
          data: { url: DEMO_IMAGE, alt: product.nameAr, order: 0 },
        });
      } else {
        await tx.productImage.create({
          data: { productId: savedProduct.id, url: DEMO_IMAGE, alt: product.nameAr, isMain: true, order: 0 },
        });
      }

      for (const variant of product.variants) {
        const savedVariant = await tx.productVariant.upsert({
          where: { sku: variant.sku },
          create: {
            productId: savedProduct.id,
            size: variant.size,
            sku: variant.sku,
            price: variant.price,
            compareAt: variant.compareAt,
            stock: 0,
            isActive: true,
            inventorySource: 'SUPPLIER',
          },
          update: {
            productId: savedProduct.id,
            size: variant.size,
            price: variant.price,
            compareAt: variant.compareAt,
            stock: 0,
            isActive: true,
            inventorySource: 'SUPPLIER',
          },
        });
        variantCount += 1;

        const existingOffer = await tx.supplierOffer.findUnique({
          where: { supplierId_variantId: { supplierId: supplier.id, variantId: savedVariant.id } },
        });
        const quantityBefore = existingOffer?.stock ?? 0;
        const offer = await tx.supplierOffer.upsert({
          where: { supplierId_variantId: { supplierId: supplier.id, variantId: savedVariant.id } },
          create: {
            supplierId: supplier.id,
            variantId: savedVariant.id,
            unitCost: variant.unitCost,
            supplierProfitShareBps: supplier.profitShareBps,
            stock: variant.stock,
            supplierSku: `SUP-${variant.sku}`,
            isActive: true,
          },
          update: {
            unitCost: variant.unitCost,
            supplierProfitShareBps: supplier.profitShareBps,
            stock: variant.stock,
            supplierSku: `SUP-${variant.sku}`,
            isActive: true,
          },
        });
        offerCount += 1;

        if (quantityBefore !== variant.stock) {
          await tx.supplierInventoryMovement.create({
            data: {
              supplierOfferId: offer.id,
              quantityDelta: variant.stock - quantityBefore,
              quantityBefore,
              quantityAfter: variant.stock,
              reason: existingOffer ? 'DEMO_RESTOCK' : 'INITIAL_STOCK',
              reference: SEED_REFERENCE,
            },
          });
        }
      }
    }

    return {
      categories: categories.length,
      suppliers: suppliers.length,
      products: products.length,
      variants: variantCount,
      offers: offerCount,
    };
  }, { timeout: 30_000 });

  console.log(JSON.stringify({ success: true, ...result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
