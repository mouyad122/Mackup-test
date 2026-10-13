import 'dotenv/config';
import { prisma } from './src/lib/db';

async function main() {
  console.log('Seeding Makeup Demo categories, brands, and products...');

  // 1. Categories
  const faceCat = await prisma.category.upsert({
    where: { slug: 'face' },
    update: {},
    create: {
      slug: 'face',
      name: 'مكياج الوجه',
      description: 'كريمات أساس، كونسيلر، بلاشر وجميع احتياجات بشرتك.',
      imagePath: '/images/demo/cat-face.jpg'
    }
  });

  const lipsCat = await prisma.category.upsert({
    where: { slug: 'lips' },
    update: {},
    create: {
      slug: 'lips',
      name: 'مكياج الشفاه',
      description: 'أرواج سائلة، مات، مرطبات وملمعات شفاه بألوان ساحرة.',
      imagePath: '/images/demo/cat-lips.jpg'
    }
  });

  const eyesCat = await prisma.category.upsert({
    where: { slug: 'eyes' },
    update: {},
    create: {
      slug: 'eyes',
      name: 'مكياج العيون',
      description: 'ماسكارا، آيلاينر، وباليت شادو لإطلالة عيون جذابة.',
      imagePath: '/images/demo/cat-eyes.jpg'
    }
  });

  const skinCat = await prisma.category.upsert({
    where: { slug: 'skincare' },
    update: {},
    create: {
      slug: 'skincare',
      name: 'العناية بالبشرة',
      description: 'غسولات، سيرومات، ومرطبات لبشرة نضرة وصحية.',
      imagePath: '/images/demo/cat-skincare.jpg'
    }
  });

  // 2. Brands
  const lumiereBrand = await prisma.brand.upsert({
    where: { slug: 'lumiere' },
    update: {},
    create: {
      slug: 'lumiere',
      nameAr: 'لوميير',
      nameEn: 'LUMIÉRE',
      description: 'High-end glow cosmetics.'
    }
  });

  const roseaBrand = await prisma.brand.upsert({
    where: { slug: 'rosea' },
    update: {},
    create: {
      slug: 'rosea',
      nameAr: 'روزيا',
      nameEn: 'ROSÉA',
      description: 'Soft and feminine beauty.'
    }
  });

  // 3. Products
  const productsToCreate = [
    {
      slug: 'velvet-matte-lipstick',
      nameAr: 'أحمر شفاه مطفي مخملي',
      nameEn: 'Velvet Matte Lipstick',
      sku: 'LIP-VELVET-01',
      barcode: '8901234567891',
      categoryId: lipsCat.id,
      brandId: roseaBrand.id,
      productType: 'Lipstick',
      finish: 'Matte',
      coverage: 'Full',
      isBestSeller: true,
      variants: [
        { name: 'Rosewood', sku: 'LIP-VELVET-ROSE', stock: 15, colorHex: '#8A4A4B', price: 18000 },
        { name: 'Nude Pink', sku: 'LIP-VELVET-NUDE', stock: 8, colorHex: '#B77A77', price: 18000 },
        { name: 'Cherry', sku: 'LIP-VELVET-CHERRY', stock: 21, colorHex: '#922E38', price: 18000 },
      ]
    },
    {
      slug: 'luminous-skin-foundation',
      nameAr: 'كريم أساس للبشرة المشرقة',
      nameEn: 'Luminous Skin Foundation',
      sku: 'FACE-FOUND-01',
      barcode: '8901234567892',
      categoryId: faceCat.id,
      brandId: lumiereBrand.id,
      productType: 'Foundation',
      finish: 'Dewy',
      coverage: 'Medium to Full',
      skinType: 'Normal to Dry',
      isTrending: true,
      variants: [
        { name: '01 Porcelain', sku: 'FACE-FOUND-01-PORC', stock: 10, colorHex: '#F4E5D6', price: 35000 },
        { name: '02 Fair', sku: 'FACE-FOUND-02-FAIR', stock: 5, colorHex: '#F1D4B8', price: 35000 },
        { name: '03 Light', sku: 'FACE-FOUND-03-LIGHT', stock: 12, colorHex: '#E8C1A0', price: 35000 },
      ]
    },
    {
      slug: 'lash-lift-mascara',
      nameAr: 'ماسكارا لرفع الرموش',
      nameEn: 'Lash Lift Mascara',
      sku: 'EYE-MASC-01',
      barcode: '8901234567893',
      categoryId: eyesCat.id,
      brandId: lumiereBrand.id,
      productType: 'Mascara',
      benefits: 'Lengthening and Volumizing',
      isNew: true,
      variants: [
        { name: 'Pitch Black', sku: 'EYE-MASC-BLK', stock: 30, colorHex: '#111111', price: 22000 }
      ]
    },
    {
      slug: 'cloud-touch-blush',
      nameAr: 'بلاشر لمسة السحاب',
      nameEn: 'Cloud Touch Blush',
      sku: 'FACE-BLUSH-01',
      barcode: '8901234567894',
      categoryId: faceCat.id,
      brandId: roseaBrand.id,
      productType: 'Blush',
      finish: 'Natural',
      variants: [
        { name: 'Peach', sku: 'FACE-BLUSH-PEACH', stock: 14, colorHex: '#F0A38B', price: 16000 },
        { name: 'Soft Rose', sku: 'FACE-BLUSH-ROSE', stock: 7, colorHex: '#DE8287', price: 16000 }
      ]
    },
    {
      slug: 'glow-hydration-serum',
      nameAr: 'سيروم الترطيب والنضارة',
      nameEn: 'Glow Hydration Serum',
      sku: 'SKIN-SERUM-01',
      barcode: '8901234567895',
      categoryId: skinCat.id,
      brandId: lumiereBrand.id,
      productType: 'Serum',
      skinType: 'All Skin Types',
      benefits: 'Hydration and Radiance',
      isBestSeller: true,
      variants: [
        { name: '30ml', sku: 'SKIN-SERUM-30ML', stock: 20, colorHex: null, price: 45000 }
      ]
    }
  ];

  for (const p of productsToCreate) {
    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });
    if (!existing) {
      await prisma.product.create({
        data: {
          slug: p.slug,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          sku: p.sku,
          barcode: p.barcode,
          categoryId: p.categoryId,
          brandId: p.brandId,
          productType: p.productType,
          finish: p.finish,
          coverage: p.coverage,
          skinType: p.skinType,
          benefits: p.benefits,
          isBestSeller: p.isBestSeller,
          isTrending: p.isTrending,
          isNew: p.isNew,
          isVisible: true,
          variants: {
            create: p.variants.map((v) => ({
              name: v.name,
              sku: v.sku,
              stock: v.stock,
              colorHex: v.colorHex,
              price: v.price,
              isActive: true
            }))
          },
          images: {
            create: [
              { url: '/images/demo/placeholder-primary.jpg', alt: p.nameEn, isMain: true, order: 0, type: 'PRIMARY' },
              { url: '/images/demo/placeholder-lifestyle.jpg', alt: p.nameEn, isMain: false, order: 1, type: 'LIFESTYLE' }
            ]
          }
        }
      });
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
