import { prisma } from '../src/lib/db';

async function main() {
  console.log('Making all products and variants available...');
  
  await prisma.product.updateMany({
    data: { isVisible: true }
  });

  await prisma.productVariant.updateMany({
    data: { isActive: true, stock: 100 }
  });

  console.log('All products are now available and fully stocked.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
