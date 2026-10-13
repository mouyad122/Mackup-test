import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('Running adversarial tests for Purchase Orders...');

  const supplier = await prisma.supplier.findFirst();
  const variant = await prisma.productVariant.findFirst();

  if (!supplier || !variant) {
    console.warn('Need at least one supplier and one variant to run tests. Skipping.');
    return;
  }

  // Setup a Purchase Order
  const po = await prisma.purchaseOrder.create({
    data: {
      supplierId: supplier.id,
      reference: 'PO-ADV-' + Date.now(),
      totalAmount: 1000,
      items: {
        create: [{
          variantId: variant.id,
          quantityOrdered: 10,
          quantityReceived: 0,
          unitCost: 100
        }]
      }
    },
    include: { items: true }
  });

  const poItem = po.items[0];

  // Attempt to receive MORE goods than were ordered
  try {
    // In a real application, there would be a service or transaction handling this.
    // Here we're checking if the database constraint or prisma middleware catches it.
    await prisma.purchaseOrderItem.update({
      where: { id: poItem.id },
      data: {
        quantityReceived: poItem.quantityOrdered + 5 // Receiving more than ordered
      }
    });
    throw new Error('Receiving more goods than ordered should have failed');
  } catch (e: any) {
    if (e.message.includes('Receiving more goods than ordered should have failed')) throw e;
    console.log('✅ Over-receiving correctly failed');
  }

  console.log('Finished test-po-adversarial.ts');
}

main().catch(console.error).finally(() => prisma.$disconnect());
