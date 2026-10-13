import { prisma } from './src/lib/db';

async function main() {
  // Fetch all orders with necessary relations
  const orders = await prisma.order.findMany({
    include: {
      items: {
        include: {
          product: {
            include: {
              variants: {
                include: {
                  supplierOffers: {
                    include: { supplier: true }
                  }
                }
              }
            }
          }
        }
      }
    }
  });

  for (const order of orders) {
    for (const item of order.items) {
      // Skip if already processed
      if (item.unitCostSnapshot !== null && item.supplierIdSnapshot !== null) continue;

      const variant = item.product.variants.find(v => v.id === item.variantId);
      if (!variant) continue;

      if (variant.inventorySource === 'SUPPLIER') {
        const offer = variant.supplierOffers[0];
        if (!offer) continue;

        const unitCost = offer.unitCost;
        // Compute actual margin from supplierProfitShareBps (stored as basis points)
        const actualMargin = offer.supplierProfitShareBps / 10000;
        const bps = actualMargin * 10000;
        const supplierShare = Math.floor((item.total - (unitCost * item.quantity)) * actualMargin);
        const supplierAmount = Math.max(0, supplierShare);
        const platformProfit = Math.max(0, item.total - (unitCost * item.quantity) - supplierAmount);
        const supplierId = offer.supplierId;
        const supplierName = offer.supplier.name;
        const offerId = offer.id;

        await prisma.orderItem.update({
          where: { id: item.id },
          data: {
            unitCostSnapshot: unitCost,
            supplierAmountSnapshot: supplierAmount,
            platformProductProfitSnapshot: platformProfit,
            supplierProfitShareBpsSnapshot: bps,
            supplierIdSnapshot: supplierId,
            supplierNameSnapshot: supplierName,
            supplierOfferIdSnapshot: offerId,
          },
        });

        // Create financial transactions for confirmed orders
        if (['CONFIRMED', 'PREPARING', 'PREPARED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && supplierId) {
          const cost = unitCost * item.quantity;
          if (cost > 0) {
            await prisma.financialTransaction.create({
              data: {
                type: 'PRODUCT_COST',
                direction: 'OUT',
                amount: cost,
                orderId: order.id,
                supplierId,
                description: `Product cost: ${item.name} (${order.reference})`,
                createdByEmployeeId: "system",
              },
            });
          }
          const supplierDue = supplierAmount + cost;
          if (supplierDue > 0) {
            await prisma.financialTransaction.create({
              data: {
                type: 'SUPPLIER_OBLIGATION',
                direction: 'OUT',
                amount: supplierDue,
                orderId: order.id,
                supplierId,
                description: `Supplier obligation: ${item.name} (${order.reference})`,
                createdByEmployeeId: "system",
              },
            });
          }
        }
        console.log(`Updated item ${item.name} for order ${order.reference}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

// Duplicate main function removed - retained first implementation
