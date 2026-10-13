import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function runLifecycle() {
  console.log('1. Creating Brand...');
  const brand = await prisma.brand.upsert({
    where: { slug: 'maybelline' },
    update: {},
    create: { nameEn: 'Maybelline', nameAr: 'ميبلين', slug: 'maybelline' }
  });

  console.log('2. Creating Category...');
  const cat = await prisma.category.upsert({
    where: { slug: 'foundation' },
    update: {},
    create: { name: 'Foundation', slug: 'foundation' }
  });

  console.log('3. Creating Product...');
  const sku = `MAY-FITME-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      nameEn: 'Fit Me Foundation',
      nameAr: 'كريم أساس فيت مي',
      slug: `fit-me-foundation-${Date.now()}`,
      sku: sku,
      brandId: brand.id,
      categoryId: cat.id,
      isVisible: true,
    }
  });

  console.log('4. Creating Shades & Variants...');
  const shades = ['110', '115', '120', '125'];
  const stocks = [10, 15, 20, 8];
  
  for (let i = 0; i < shades.length; i++) {
    const shadeName = shades[i];
    let shade = await prisma.shade.findFirst({ where: { name: shadeName } });
    if (!shade) {
      shade = await prisma.shade.create({
        data: { name: shadeName, hexCode: '#F4D0B5' }
      });
    }

    await prisma.productVariant.create({
      data: {
        productId: product.id,
        name: shadeName,
        sku: `MAY-FITME-${shadeName}`,
        shadeId: shade.id,
        stock: stocks[i],
        price: 15000,
      }
    });
  }

  console.log('5. Verifying Data...');
  const verifyProduct = await prisma.product.findUnique({
    where: { id: product.id },
    include: { variants: true, brand: true, category: true }
  });

  if (verifyProduct?.variants.length === 4 && verifyProduct.brand?.nameEn === 'Maybelline') {
    console.log('✅ Product Lifecycle Integration Test PASSED.');
  } else {
    console.error('❌ Data verification failed.');
  }

  // Cleanup for repeatability
  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.brand.delete({ where: { id: brand.id } });
  await prisma.category.delete({ where: { id: cat.id } });
}

runLifecycle().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
