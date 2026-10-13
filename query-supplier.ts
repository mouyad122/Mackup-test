import { prisma } from './src/lib/db';
async function main() {
  const s = await prisma.supplier.findFirst({ where: { name: 'مورد رَواق الأول' }});
  console.log("Supplier fetched:", s?.id);
}
main().finally(() => prisma.$disconnect());
