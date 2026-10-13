import { prisma } from './src/lib/db';

async function main() {
  console.log('Wiping all product images...');
  await prisma.productImage.deleteMany();
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
