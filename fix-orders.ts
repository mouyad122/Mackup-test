import { prisma } from './src/lib/db';

async function main() {
  const orders = await prisma.order.findMany({
    include: { items: { include: { product: { include: { variants: { include: { supplierOffers: { include: { supplier: true } } } } } } } } }
  });

  for (const order of orders) {
    for (const item of order.items) {
      if (item.unitCostSnapshot !== null && item.supplierIdSnapshot !== null) continue; // Skip if already snapshot
      const variant = item.product.variants.find(v => v.id === item.variantId);
      if (!variant) continue;
      
      if (variant.inventorySource === 'SUPPLIER') {
        const offer = variant.supplierOffers[0];
        if (offer) {
          const unitCost = offer.unitCost;
          const bps = offer.supplier.profitMargin * 100;
          const supplierShare = Math.floor((item.total - (unitCost * item.quantity)) * offer.supplier.profitMargin);
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
            }
          });

          // Ensure financial transactions exist if order is confirmed
          if (['CONFIRMED', 'PREPARING', 'PREPARED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status) && supplierId !== null) {
            const existingObligation = await prisma.financialTransaction.findFirst({
              where: { orderId: order.id, type: 'SUPPLIER_OBLIGATION', description: { contains: item.name } }
            });
            if (!existingObligation && unitCost !== null) {
              const cost = unitCost * item.quantity;
              if (cost > 0) {
                await prisma.financialTransaction.create({ data: {
                  type: 'PRODUCT_COST', direction: 'OUT', amount: cost, orderId: order.id,
                  supplierId, description: `Product cost: ${item.name} (${order.reference})`, createdByEmployeeId: "system",
                } });
              }
              const supplierDue = (supplierAmount ?? 0) + cost;
              if (supplierDue > 0) {
                await prisma.financialTransaction.create({ data: {
                  type: 'SUPPLIER_OBLIGATION', direction: 'OUT', amount: supplierDue, orderId: order.id,
                  supplierId, description: `Supplier obligation: ${item.name} (${order.reference})`, createdByEmployeeId: "system",
                } });
              }
            }
          }
          console.log(`Updated item ${item.name} for order ${order.reference}`);
        }
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
