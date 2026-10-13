import { prisma } from './src/lib/db';
async function main() {
  const t = await prisma.financialTransaction.findFirst({ where: { order: { reference: 'ORD-DA866775' }, type: 'SUPPLIER_OBLIGATION' } });
  console.log("Obligation:", t?.amount);
}
main().finally(() => prisma.$disconnect());
