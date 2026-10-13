import { prisma } from './src/lib/db';

async function main() {
  // 1. Fix supplier profit margin (from 25 to 0.25)
  await prisma.supplier.updateMany({
    where: { profitMargin: { gt: 1 } },
    data: { profitMargin: 0.25 }
  });

  // 2. Delete wrong financial transactions for these test orders
  await prisma.financialTransaction.deleteMany({
    where: { type: { in: ['SUPPLIER_OBLIGATION', 'PRODUCT_COST'] } }
  });

  // 3. Recalculate order items
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: { include: { variants: { include: { supplierOffers: { include: { supplier: true } } } } } } } } }
  });

  for (const order of orders) {
    for (const item of order.items) {
      const variant = item.product.variants.find(v => v.id === item.variantId);
      if (!variant) continue;
      
      if (variant.inventorySource === 'SUPPLIER') {
        const offer = variant.supplierOffers[0];
        if (offer) {
          const unitCost = offer.unitCost;
          const actualMargin = offer.supplier.profitMargin > 1 ? offer.supplier.profitMargin / 100 : offer.supplier.profitMargin;
          const bps = actualMargin * 10000; // Store as BPS
          const supplierShare = Math.floor((item.total - (unitCost * item.quantity)) * actualMargin);
          const supplierAmount = Math.max(0, supplierShare);
          const platformProfit = Math.max(0, item.total - (unitCost * item.quantity) - supplierAmount);
          const supplierId = offer.supplierId;

          await prisma.orderItem.update({
            where: { id: item.id },
            data: {
              unitCostSnapshot: unitCost,
              supplierAmountSnapshot: supplierAmount,
              platformProductProfitSnapshot: platformProfit,
              supplierProfitShareBpsSnapshot: bps,
              supplierIdSnapshot: supplierId,
              supplierNameSnapshot: offer.supplier.name,
              supplierOfferIdSnapshot: offer.id,
            }
          });

          if (['CONFIRMED', 'PREPARING', 'PREPARED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && supplierId !== null) {
            const cost = unitCost * item.quantity;
            if (cost > 0) {
              await prisma.financialTransaction.create({ data: {
                type: 'PRODUCT_COST', direction: 'OUT', amount: cost, orderId: order.id,
                supplierId, description: `Product cost: ${item.name} (${order.reference})`, createdByEmployeeId: "system",
              } });
            }
            const supplierDue = supplierAmount + cost;
            if (supplierDue > 0) {
              await prisma.financialTransaction.create({ data: {
                type: 'SUPPLIER_OBLIGATION', direction: 'OUT', amount: supplierDue, orderId: order.id,
                supplierId, description: `Supplier obligation: ${item.name} (${order.reference})`, createdByEmployeeId: "system",
              } });
            }
          }
          console.log(`Fixed item ${item.name} for order ${order.reference}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
