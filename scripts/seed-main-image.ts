import { prisma } from '../src/lib/db';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('🌱 Seeding main product image...');
  
  const generatedImagePath = '/home/moayad/.gemini/antigravity-ide/brain/d722240d-7cbd-4fe7-9386-288ce62a62f1/lipstick_main_1789470944224.jpg';
  const targetPath = path.resolve(__dirname, '../public/images/products/lipstick-main.jpg');
  
  // Ensure directory exists
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Copy image
  fs.copyFileSync(generatedImagePath, targetPath);
  console.log('✅ Copied lipstick main image to public/images/products/lipstick-main.jpg');

  // Find the product
  const product = await prisma.product.findFirst();
  if (!product) {
    console.log('❌ No products found');
    return;
  }

  // Update product image
  const existingImage = await prisma.productImage.findFirst({
    where: { productId: product.id, isMain: true }
  });

  if (existingImage) {
    await prisma.productImage.update({
      where: { id: existingImage.id },
      data: { url: '/images/products/lipstick-main.jpg' }
    });
  } else {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: '/images/products/lipstick-main.jpg',
        isMain: true,
        order: 0
      }
    });
  }
  
  // Set this as the mainImage for all variants too
  await prisma.productVariant.updateMany({
    data: {
      mainImage: '/images/products/lipstick-main.jpg'
    }
  });

  console.log('✅ Successfully seeded main product image!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
