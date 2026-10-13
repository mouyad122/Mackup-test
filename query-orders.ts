import { prisma } from './src/lib/db';
import { syncOrderProfits } from './src/actions/orders';

async function main() {
  const orders = await prisma.order.findMany();
  console.log("Found", orders.length, "orders.");
  for (const o of orders) {
    console.log("Updating order:", o.id, o.status);
    const res = await syncOrderProfits(o.id);
    console.log("  Result:", res);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
