import { prisma } from './src/lib/db';

async function main() {
  console.log('Adding closeup and swatch images to Velvet Matte Lipstick...');

  const product = await prisma.product.findUnique({
    where: { slug: 'velvet-matte-lipstick' },
    include: { images: true, variants: true }
  });

  if (!product) {
    console.error('Product not found!');
    return;
  }

  // 1. Add Closeup Image
  const closeupExists = product.images.find(img => img.url === '/images/demo/lipstick-closeup.jpg');
  if (!closeupExists) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: '/images/demo/lipstick-closeup.jpg',
        alt: 'Lipstick Close Up',
        isMain: false,
        order: 3,
        type: 'CLOSEUP'
      }
    });
    console.log('Added closeup image');
  }

  // 2. Add Swatch Image
  const swatchExists = product.images.find(img => img.url === '/images/demo/lipstick-swatch.jpg');
  if (!swatchExists) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: '/images/demo/lipstick-swatch.jpg',
        alt: 'Lipstick Shade Swatch',
        isMain: false,
        order: 4,
        type: 'SWATCH'
      }
    });
    console.log('Added swatch image');
  }

  // 3. Make one of the variants Out Of Stock to test the UI feature
  if (product.variants.length > 0) {
    await prisma.productVariant.update({
      where: { id: product.variants[product.variants.length - 1].id },
      data: { stock: 0 }
    });
    console.log('Set last variant stock to 0 to test out-of-stock UI');
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
