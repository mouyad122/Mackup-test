import { prisma } from '../src/lib/db';

async function main() {
  console.log('Starting inventory reconciliation...');
  
  const inventories = await prisma.inventory.findMany({
    include: {
      variant: true,
      warehouse: true,
    }
  });

  let hasDiscrepancy = false;

  for (const inv of inventories) {
    const movements = await prisma.inventoryMovement.findMany({
      where: {
        sku: inv.variant.sku,
        warehouseId: inv.warehouseId,
      }
    });

    // The quantity in InventoryMovement is already signed (e.g. -quantity for SALE/OUT).
    // So summing them up gives the expected stock delta.
    const expected = movements.reduce((acc, m) => acc + m.quantity, 0);

    if (expected !== inv.quantity) {
      hasDiscrepancy = true;
      console.error(
        `[DISCREPANCY] Warehouse: ${inv.warehouse.name} (${inv.warehouseId}), SKU: ${inv.variant.sku} | Expected: ${expected}, Actual (Inventory.quantity): ${inv.quantity}`
      );
    }
  }

  if (!hasDiscrepancy) {
    console.log('✅ Success: All inventory records match their movements perfectly.');
  } else {
    console.error('❌ Discrepancies found! Please check the logs above.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Error during reconciliation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
