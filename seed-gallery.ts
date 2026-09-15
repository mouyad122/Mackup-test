import { prisma } from './src/lib/db';

async function main() {
  console.log('Adding gallery images to products...');

  const mappings = [
    { slug: 'velvet-matte-lipstick', image: '/images/demo/gallery-lipstick.jpg' },
    { slug: 'luminous-skin-foundation', image: '/images/demo/gallery-foundation.jpg' },
    { slug: 'lash-lift-mascara', image: '/images/demo/gallery-mascara.jpg' },
    { slug: 'cloud-touch-blush', image: '/images/demo/gallery-blush.jpg' },
  ];

  for (const m of mappings) {
    const product = await prisma.product.findUnique({ where: { slug: m.slug } });
    if (product) {
      // Check if gallery image exists
      const existing = await prisma.productImage.findFirst({
        where: { productId: product.id, url: m.image }
      });
      if (!existing) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: m.image,
            alt: product.nameEn + ' Gallery',
            isMain: false,
            order: 2,
            type: 'LIFESTYLE'
          }
        });
        console.log(`Added gallery image for ${m.slug}`);
      }
    }
  }

  // Also duplicate some images to show a larger gallery
  for (const m of mappings) {
    const product = await prisma.product.findUnique({ where: { slug: m.slug } });
    if (product) {
      const count = await prisma.productImage.count({ where: { productId: product.id } });
      if (count < 4) {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: '/images/demo/placeholder-lifestyle.jpg',
            alt: product.nameEn + ' Extra',
            isMain: false,
            order: 3,
            type: 'LIFESTYLE'
          }
        });
      }
    }
  }

  console.log('Gallery seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
