import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function clean() {
  await prisma.packageItem.deleteMany({
    where: { package: { fulfillmentOrder: { order: { reference: { startsWith: 'TEST-ORD' } } } } },
  });
  await prisma.package.deleteMany({
    where: { fulfillmentOrder: { order: { reference: { startsWith: 'TEST-ORD' } } } },
  });
  await prisma.fulfillmentItem.deleteMany({
    where: { fulfillmentOrder: { order: { reference: { startsWith: 'TEST-ORD' } } } },
  });
  await prisma.fulfillmentOrder.deleteMany({
    where: { order: { reference: { startsWith: 'TEST-ORD' } } },
  });
  await prisma.deliveryJob.deleteMany({
    where: { order: { reference: { startsWith: 'TEST-ORD' } } },
  });
  await prisma.fulfillmentOutbox.deleteMany({
    where: { order: { reference: { startsWith: 'TEST-ORD' } } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { reference: { startsWith: 'TEST-ORD' } } },
  });
  await prisma.order.deleteMany({
    where: { reference: { startsWith: 'TEST-ORD' } },
  });
  await prisma.supplierAccessSession.deleteMany({
    where: { supplierId: { in: ['test-supplier-a', 'test-supplier-b'] } },
  });
  await prisma.supplierLocation.deleteMany({
    where: { supplierId: { in: ['test-supplier-a', 'test-supplier-b'] } },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: ['test-supplier-a', 'test-supplier-b'] } },
  });
  console.log('✅ Cleaned all test records completely from database.');
}

clean().finally(() => prisma.$disconnect());
