import { prisma } from './src/lib/db';
async function main() {
  const o = await prisma.order.findUnique({ where: { reference: 'ORD-DA866775' }, include: { items: true }});
  console.log(o?.items);
}
main().finally(() => prisma.$disconnect());
