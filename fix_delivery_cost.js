const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const orders = await prisma.order.findMany({
    where: { actualDeliveryCost: null },
    include: { deliveryAssignment: true }
  });

  const zones = await prisma.shippingZone.findMany();
  
  let updatedCount = 0;
  for (const order of orders) {
    let newActualCost = null;

    if (order.deliveryAssignment && order.deliveryAssignment.actualCarrierCost !== null) {
      newActualCost = order.deliveryAssignment.actualCarrierCost;
    } else if (order.shippingZoneNameSnapshot) {
      const zone = zones.find(z => z.nameAr === order.shippingZoneNameSnapshot);
      if (zone && zone.actualDeliveryCost !== null) {
        newActualCost = zone.actualDeliveryCost;
      } else if (zone) {
        newActualCost = zone.fee;
      }
    }

    if (newActualCost === null) {
      if (order.shippingCost > 0) {
        newActualCost = order.shippingCost;
      } else {
        newActualCost = 2000; // default to 2 JOD
      }
    }

    if (newActualCost !== null) {
      await prisma.order.update({
        where: { id: order.id },
        data: { actualDeliveryCost: newActualCost }
      });
      
      const txs = await prisma.financialTransaction.findMany({
        where: { orderId: order.id, type: 'DELIVERY_COST' }
      });
      if (txs.length === 0 && ['CONFIRMED', 'PREPARING', 'PREPARED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
        await prisma.financialTransaction.create({
          data: {
            type: 'DELIVERY_COST',
            direction: 'OUT',
            amount: newActualCost,
            orderId: order.id,
            description: `Carrier cost for ${order.reference} (Auto-fixed)`,
            createdByEmployeeId: null 
          }
        }).catch(() => {});
      }
      updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} orders with actualDeliveryCost.`);
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
