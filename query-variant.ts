import { prisma } from './src/lib/db';
async function main() {
  const v = await prisma.productVariant.findFirst();
  console.log("Variant inventory source:", v?.inventorySource);
}
main().finally(() => prisma.$disconnect());
