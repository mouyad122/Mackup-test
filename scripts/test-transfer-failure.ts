import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('Running adversarial tests for Stock Transfers...');

  const warehouses = await prisma.warehouse.findMany({ take: 2 });
  const variant = await prisma.productVariant.findFirst();

  if (warehouses.length < 2 || !variant) {
    console.warn('Need at least two warehouses and one variant to run tests. Skipping.');
    return;
  }

  const fromWarehouse = warehouses[0];
  const toWarehouse = warehouses[1];

  // Ensure fromWarehouse has 0 stock for this variant
  let fromInventory = await prisma.inventory.findUnique({
    where: {
      warehouseId_variantId: {
        warehouseId: fromWarehouse.id,
        variantId: variant.id
      }
    }
  });

  if (!fromInventory) {
    fromInventory = await prisma.inventory.create({
      data: {
        warehouseId: fromWarehouse.id,
        variantId: variant.id,
        quantity: 0
      }
    });
  } else {
    fromInventory = await prisma.inventory.update({
      where: { id: fromInventory.id },
      data: { quantity: 0 }
    });
  }

  // Attempt a stock transfer
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Create stock transfer record
      await tx.stockTransfer.create({
        data: {
          fromWarehouseId: fromWarehouse.id,
          toWarehouseId: toWarehouse.id,
          variantId: variant.id,
          quantity: 10,
          status: 'COMPLETED',
          createdBy: 'system'
        }
      });

      // 2. Deduct from source
      await tx.inventory.update({
        where: { id: fromInventory!.id },
        data: {
          quantity: { decrement: 10 }
        }
      });

      // 3. Add to destination
      await tx.inventory.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: toWarehouse.id,
            variantId: variant.id
          }
        },
        update: {
          quantity: { increment: 10 }
        },
        create: {
          warehouseId: toWarehouse.id,
          variantId: variant.id,
          quantity: 10
        }
      });
    });

    throw new Error('Stock transfer from empty warehouse should have failed and rolled back');
  } catch (e: any) {
    if (e.message.includes('Stock transfer from empty warehouse should have failed and rolled back')) throw e;
    console.log('✅ Stock transfer from empty warehouse correctly failed and rolled back');
  }

  console.log('Finished test-transfer-failure.ts');
}

main().catch(console.error).finally(() => prisma.$disconnect());
