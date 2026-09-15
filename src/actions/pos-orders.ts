'use server';

import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';

export async function getPOSOrders() {
  await requirePermission('pos:access');
  // Return pending and confirmed orders mostly
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['PENDING', 'AWAITING_WHATSAPP', 'CONFIRMED', 'PREPARING', 'PREPARED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
      }
    },
    take: 200,
    include: {
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });
  return { success: true, orders };
}

export async function updatePOSOrderStatus(orderId: string, newStatus: string) {
  const session = await requirePermission('pos:access');
  
  // We should also check for pos.orders.manage or manage:orders ideally.
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    if (order.status === 'CANCELLED') {
      return { success: false, error: 'لا يمكن تعديل طلب ملغي' };
    }

    // Process Transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes: `تم التعديل بواسطة موظف POS`
        }
      });

      // If CANCELLED, restore inventory
      if (newStatus === 'CANCELLED') {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                increment: item.quantity
              }
            }
          });
        }
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
}
