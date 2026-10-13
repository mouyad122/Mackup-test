import { prisma } from '../src/lib/db';

async function main() {
  console.log('Starting seed process...');

  // 1. Delete existing products
  console.log('Deleting existing products (CASCADE)...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Product" CASCADE;`);
  console.log('Deleted existing products.');

  // 2. Ensure a supplier exists
  let supplier = await prisma.supplier.findFirst();
  if (!supplier) {
    supplier = await prisma.supplier.create({
      data: {
        name: 'مورد رَواق الأول',
        phone: '0790000000'
      }
    });
    console.log('Created test supplier:', supplier.name);
  } else {
    console.log('Using existing supplier:', supplier.name);
  }

  // 3. Ensure some categories exist
  let categories = await prisma.category.findMany();
  if (categories.length === 0) {
    const cat = await prisma.category.create({ data: { nameAr: 'العناية بالبشرة', nameEn: 'Skincare', slug: 'skincare', sortOrder: 1 } });
    categories = [cat];
  }

  // 4. Ensure a brand exists
  let brand = await prisma.brand.findFirst();
  if (!brand) {
    brand = await prisma.brand.create({ data: { nameAr: 'رَواق', nameEn: 'Rawaq', slug: 'rawaq' } });
  }

  // 5. Create 3 test products
  const productData = [
    {
      nameAr: 'غسول الوجه المهدئ',
      nameEn: 'Calming Face Wash',
      slug: 'calming-face-wash',
      sku: 'R-FW-150',
      categoryId: categories[0].id,
      brandId: brand.id,
      isVisible: true,
      variants: {
        create: [
          {
            name: 'Standard 150ml',
            sku: 'R-FW-150-V',
            price: 15000,
            stock: 100,
            isActive: true,
          }
        ]
      }
    },
    {
      nameAr: 'سيروم فيتامين سي',
      nameEn: 'Vitamin C Serum',
      slug: 'vitamin-c-serum',
      sku: 'R-VS-030',
      categoryId: categories[0].id,
      brandId: brand.id,
      isVisible: true,
      variants: {
        create: [
          {
            name: 'Standard 30ml',
            sku: 'R-VS-030-V',
            price: 25000,
            stock: 50,
            isActive: true,
          }
        ]
      }
    },
    {
      nameAr: 'كريم الترطيب العميق',
      nameEn: 'Deep Hydration Cream',
      slug: 'deep-hydration-cream',
      sku: 'R-DC-050',
      categoryId: categories[0].id,
      brandId: brand.id,
      isVisible: true,
      variants: {
        create: [
          {
            name: 'Standard 50ml',
            sku: 'R-DC-050-V',
            price: 18000,
            stock: 75,
            isActive: true,
          }
        ]
      }
    }
  ];

  console.log('Creating test products...');
  for (const [index, p] of productData.entries()) {
    const created = await prisma.product.create({
      data: p,
      include: { variants: true }
    });
    
    // Create supplier offer for the variant
    const variant = created.variants[0];
    const cost = index === 0 ? 8000 : index === 1 ? 12000 : 9000;
    
    await prisma.supplierOffer.create({
      data: {
        supplierId: supplier.id,
        variantId: variant.id,
        unitCost: cost,
        isActive: true,
      }
    });
  }
  console.log('Test products created successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
