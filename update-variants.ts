import { prisma } from './src/lib/db';

async function main() {
  await prisma.productVariant.updateMany({
    data: { inventorySource: 'SUPPLIER' }
  });
  console.log("Updated all variants to SUPPLIER");
}

main().catch(console.error).finally(() => prisma.$disconnect());
