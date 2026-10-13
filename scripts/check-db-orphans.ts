import { prisma, pool } from '../src/lib/db';

async function main() {
  console.log('Starting Database Orphan Check...\n');
  let hasOrphans = false;

  // 1. SaleItem records without a valid Sale
  const orphanedSaleItems: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "SaleItem" 
    WHERE "saleId" IS NULL OR "saleId" NOT IN (SELECT "id" FROM "Sale");
  `;
  if (orphanedSaleItems.length > 0) {
    hasOrphans = true;
    console.log(`Found ${orphanedSaleItems.length} orphaned SaleItem(s):`, orphanedSaleItems);
  }

  // 2. Payment records without a valid saleId
  // Note: orderId does not exist on the Payment model in this schema.
  const orphanedPayments: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "Payment" 
    WHERE "saleId" IS NULL OR "saleId" NOT IN (SELECT "id" FROM "Sale");
  `;
  if (orphanedPayments.length > 0) {
    hasOrphans = true;
    console.log(`Found ${orphanedPayments.length} orphaned Payment(s):`, orphanedPayments);
  }

  // 3. Return records without a valid saleId
  // Note: Refund model and paymentId do not exist in this schema.
  const orphanedReturns: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "Return" 
    WHERE "saleId" IS NULL OR "saleId" NOT IN (SELECT "id" FROM "Sale");
  `;
  if (orphanedReturns.length > 0) {
    hasOrphans = true;
    console.log(`Found ${orphanedReturns.length} orphaned Return(s):`, orphanedReturns);
  }

  // 4. Inventory records where warehouseId or variantId is missing/invalid
  const orphanedInventories: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "Inventory" 
    WHERE "warehouseId" IS NULL OR "warehouseId" NOT IN (SELECT "id" FROM "Warehouse")
       OR "variantId" IS NULL OR "variantId" NOT IN (SELECT "id" FROM "ProductVariant");
  `;
  if (orphanedInventories.length > 0) {
    hasOrphans = true;
    console.log(`Found ${orphanedInventories.length} orphaned Inventory record(s):`, orphanedInventories);
  }

  // 5. InventoryMovement records where sku is missing/invalid
  // Note: InventoryMovement uses 'sku' instead of productId/variantId in this schema.
  const orphanedMovements: any[] = await prisma.$queryRaw`
    SELECT "id", "sku" FROM "InventoryMovement" 
    WHERE "sku" IS NULL OR "sku" NOT IN (SELECT "sku" FROM "ProductVariant");
  `;
  if (orphanedMovements.length > 0) {
    hasOrphans = true;
    console.log(`Found ${orphanedMovements.length} orphaned InventoryMovement(s):`, orphanedMovements);
  }

  if (!hasOrphans) {
    console.log('✅ Database Integrity Checked: No orphans found.');
  } else {
    console.log('\n❌ Database contains orphaned records.');
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('Error during database check:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    if (pool) {
      await pool.end();
    }
  });
