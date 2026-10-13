import { prisma } from './src/lib/db';

async function main() {
  const products = await prisma.product.findMany({
    include: { variants: { include: { supplierOffers: true } } }
  });
  console.log("Total Products:", products.length);
  for (const p of products) {
    console.log(p.id, p.nameAr);
    for (const v of p.variants) {
      console.log("  Variant:", v.id, "Offers:", v.supplierOffers.length);
    }
  }

  const orders = await prisma.order.findMany({
    take: 3,
    orderBy: { createdAt: 'desc' },
    include: { items: true }
  });
  for (const o of orders) {
    console.log("Order:", o.id, o.reference);
    for (const i of o.items) {
      console.log("  Item:", i.name, "SupplierId:", i.supplierIdSnapshot);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
