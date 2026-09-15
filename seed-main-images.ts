import { prisma } from './src/lib/db';

async function main() {
  console.log('Updating primary images for all demo products...');

  const mappings = [
    { slug: 'velvet-matte-lipstick', image: '/images/demo/gallery-lipstick.jpg' },
    { slug: 'luminous-skin-foundation', image: '/images/demo/gallery-foundation.jpg' },
    { slug: 'lash-lift-mascara', image: '/images/demo/gallery-mascara.jpg' },
    { slug: 'cloud-touch-blush', image: '/images/demo/gallery-blush.jpg' },
    { slug: 'glow-hydration-serum', image: '/images/demo/primary-serum.jpg' },
  ];

  for (const m of mappings) {
    const product = await prisma.product.findUnique({ 
      where: { slug: m.slug },
      include: { images: true } 
    });
    
    if (product) {
      // Find the primary image
      const primaryImage = product.images.find(img => img.isMain);
      if (primaryImage) {
        await prisma.productImage.update({
          where: { id: primaryImage.id },
          data: { url: m.image }
        });
        console.log(`Updated primary image for ${m.slug}`);
      } else {
        await prisma.productImage.create({
          data: {
            productId: product.id,
            url: m.image,
            alt: product.nameEn,
            isMain: true,
            order: 0,
            type: 'PRIMARY'
          }
        });
        console.log(`Created new primary image for ${m.slug}`);
      }
    }
  }

  console.log('Main images update completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
