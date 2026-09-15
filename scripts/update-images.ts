import { prisma } from '../src/lib/db';

async function updateImages() {
  console.log('Deleting all existing product images...');
  await prisma.productImage.deleteMany({});
  console.log('Images deleted.');

  const products = await prisma.product.findMany({
    include: {
      category: true,
      variants: true,
    }
  });

  for (const product of products) {
    let mainImage = '/images/demo/primary-serum.jpg';
    let swatchImage = '/images/demo/cat-skincare.jpg';

    const catSlug = product.category?.slug || '';

    if (catSlug.includes('lip')) {
      mainImage = '/images/demo/gallery-lipstick.jpg';
      swatchImage = '/images/demo/cat-lips.jpg'; // Lips for overlay
    } else if (catSlug.includes('eye')) {
      mainImage = '/images/demo/gallery-mascara.jpg';
      swatchImage = '/images/demo/cat-eyes.jpg'; // Eyes for overlay
    } else if (catSlug.includes('face') || catSlug.includes('foundation') || catSlug.includes('blush')) {
      mainImage = '/images/demo/gallery-foundation.jpg';
      swatchImage = '/images/demo/cat-face.jpg';
    }

    // Create Main Image
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: mainImage,
        alt: product.nameEn,
        type: 'PRIMARY',
        isMain: true,
        order: 0
      }
    });

    // Create Swatch Images for each variant
    for (let i = 0; i < product.variants.length; i++) {
      const variant = product.variants[i];
      await prisma.productImage.create({
        data: {
          productId: product.id,
          variantId: variant.id,
          url: swatchImage,
          alt: `${product.nameEn} - ${variant.name}`,
          type: 'LIFESTYLE',
          isMain: false,
          order: i + 1
        }
      });
    }
    
    console.log(`Updated images for product: ${product.nameEn}`);
  }

  console.log('All images updated successfully!');
}

updateImages()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
