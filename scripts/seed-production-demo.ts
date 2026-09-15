import { prisma } from '../src/lib/db';

async function main() {
  console.log('Seeding production database with demo products...');

  // 1. Create Categories
  const makeupCategory = await prisma.category.upsert({
    where: { slug: 'makeup' },
    update: { imagePath: '/images/products/lipstick.jpg' },
    create: {
      name: 'مكياج',
      slug: 'makeup',
      description: 'جميع منتجات المكياج',
      imagePath: '/images/products/lipstick.jpg',
    }
  });

  const lipsCategory = await prisma.category.upsert({
    where: { slug: 'lips' },
    update: { imagePath: '/images/products/lipstick.jpg' },
    create: {
      name: 'شفاه',
      slug: 'lips',
      imagePath: '/images/products/lipstick.jpg',
    }
  });

  const faceCategory = await prisma.category.upsert({
    where: { slug: 'face' },
    update: { imagePath: '/images/products/foundation.jpg' },
    create: {
      name: 'وجه',
      slug: 'face',
      imagePath: '/images/products/foundation.jpg',
    }
  });

  const eyesCategory = await prisma.category.upsert({
    where: { slug: 'eyes' },
    update: { imagePath: '/images/products/eyeshadow.jpg' },
    create: {
      name: 'عيون',
      slug: 'eyes',
      imagePath: '/images/products/eyeshadow.jpg',
    }
  });

  const accessoriesCategory = await prisma.category.upsert({
    where: { slug: 'bags-accessories' },
    update: { imagePath: '/images/products/handbag.jpg' },
    create: {
      name: 'شنط واكسسوارات',
      slug: 'bags-accessories',
      imagePath: '/images/products/handbag.jpg',
    }
  });

  // 2. Create Brand
  const luxuryBrand = await prisma.brand.upsert({
    where: { slug: 'aurelia-paris' },
    update: {},
    create: {
      nameAr: 'أوريليا باريس',
      nameEn: 'Aurelia Paris',
      slug: 'aurelia-paris',
    }
  });

  // 3. Define 17 Makeup Products
  const makeupProducts = [
    // Lipsticks
    { nameAr: 'أحمر شفاه كلاسيكي', nameEn: 'Classic Red Lipstick', categoryId: lipsCategory.id, img: '/images/products/lipstick.jpg' },
    { nameAr: 'أحمر شفاه مات', nameEn: 'Matte Velvet Lipstick', categoryId: lipsCategory.id, img: '/images/products/lipstick.jpg' },
    { nameAr: 'ملمع شفاه وردي', nameEn: 'Pink Lip Gloss', categoryId: lipsCategory.id, img: '/images/products/lipstick.jpg' },
    { nameAr: 'أحمر شفاه سائل', nameEn: 'Liquid Lipstick', categoryId: lipsCategory.id, img: '/images/products/lipstick.jpg' },
    { nameAr: 'محدد شفاه احترافي', nameEn: 'Pro Lip Liner', categoryId: lipsCategory.id, img: '/images/products/lipstick.jpg' },
    
    // Foundations
    { nameAr: 'كريم أساس تغطية كاملة', nameEn: 'Full Coverage Foundation', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'كريم أساس خفيف', nameEn: 'Lightweight Foundation', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'كونسيلر سائل', nameEn: 'Liquid Concealer', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'برايمر للوجه', nameEn: 'Face Primer', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'بودرة تثبيت', nameEn: 'Setting Powder', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'بلاشر كريمي', nameEn: 'Cream Blush', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    { nameAr: 'هايلايتر سائل', nameEn: 'Liquid Highlighter', categoryId: faceCategory.id, img: '/images/products/foundation.jpg' },
    
    // Eyes
    { nameAr: 'باليت ظلال عيون فاخر', nameEn: 'Luxury Eyeshadow Palette', categoryId: eyesCategory.id, img: '/images/products/eyeshadow.jpg' },
    { nameAr: 'باليت الوان ترابية', nameEn: 'Earth Tones Palette', categoryId: eyesCategory.id, img: '/images/products/eyeshadow.jpg' },
    { nameAr: 'ماسكارا مكثفة', nameEn: 'Volumizing Mascara', categoryId: eyesCategory.id, img: '/images/products/mascara.jpg' },
    { nameAr: 'ماسكارا مطولة', nameEn: 'Lengthening Mascara', categoryId: eyesCategory.id, img: '/images/products/mascara.jpg' },
    { nameAr: 'آيلاينر سائل أسود', nameEn: 'Black Liquid Eyeliner', categoryId: eyesCategory.id, img: '/images/products/mascara.jpg' },
  ];

  // 4. Define 5 Accessories
  const accessories = [
    { nameAr: 'حقيبة يد جلدية فاخرة', nameEn: 'Luxury Leather Handbag', categoryId: accessoriesCategory.id, img: '/images/products/handbag.jpg' },
    { nameAr: 'حقيبة سهرة أنيقة', nameEn: 'Elegant Evening Bag', categoryId: accessoriesCategory.id, img: '/images/products/handbag.jpg' },
    { nameAr: 'عقد ذهبي رقيق', nameEn: 'Delicate Gold Necklace', categoryId: accessoriesCategory.id, img: '/images/products/necklace.jpg' },
    { nameAr: 'طقم مجوهرات فاخر', nameEn: 'Luxury Jewelry Set', categoryId: accessoriesCategory.id, img: '/images/products/necklace.jpg' },
    { nameAr: 'نظارة شمسية كلاسيكية', nameEn: 'Classic Sunglasses', categoryId: accessoriesCategory.id, img: '/images/products/handbag.jpg' }, 
  ];

  const allProducts = [...makeupProducts, ...accessories];

  for (let i = 0; i < allProducts.length; i++) {
    const p = allProducts[i];
    const sku = `PROD-DEMO-${Date.now()}-${i}`;
    const slug = `product-${Date.now()}-${i}`;
    
    const createdProduct = await prisma.product.create({
      data: {
        slug: slug,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        sku: sku,
        shortDescription: `وصف قصير للمنتج ${p.nameAr}`,
        longDescription: `هذا هو الوصف التفصيلي لمنتج ${p.nameAr}. يتميز بجودة عالية وتصميم أنيق.`,
        categoryId: p.categoryId,
        brandId: luxuryBrand.id,
        isVisible: true,
        isFeatured: i < 5, // make first 5 featured
        variants: {
          create: [
            {
              name: 'Standard',
              sku: `${sku}-STD`,
              price: Math.floor(Math.random() * 50000) + 10000, 
              stock: 50,
              isActive: true,
            }
          ]
        },
        images: {
          create: [
            {
              url: p.img,
              isMain: true,
              order: 0
            }
          ]
        }
      }
    });
    
    console.log(`Created: ${p.nameAr}`);
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
