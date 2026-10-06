'use server';

import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { cancelOrderAndReverseFinancials } from '@/lib/order-cancellation';

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
    if (newStatus === 'CANCELLED') {
      const order = await cancelOrderAndReverseFinancials(orderId, session.employeeId);
      return { success: true, order };
    }
    if (!['CONFIRMED', 'PREPARING', 'PREPARED'].includes(newStatus)) return { success: false, error: 'حالة الطلب غير صالحة' };
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return { success: false, error: 'الطلب غير موجود' };
    }

    if (['CANCELLED', 'REFUNDED', 'DELIVERED'].includes(order.status)) {
      return { success: false, error: 'لا يمكن تعديل طلب ملغي' };
    }

    const allowedNext: Record<string, string[]> = { CONFIRMED: ['PREPARING'], PREPARING: ['PREPARED'] };
    if (!allowedNext[order.status]?.includes(newStatus)) return { success: false, error: 'انتقال حالة الطلب غير مسموح' };
    await prisma.$transaction(async (tx) => {
      const changed = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status: newStatus } });
      if (changed.count !== 1) throw new Error('تم تغيير الطلب بالتزامن؛ أعد تحميل الصفحة.');

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: newStatus,
          notes: `تم التعديل بواسطة موظف POS`
        }
      });

    }, { isolationLevel: 'Serializable' });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating order:', error);
    return { success: false, error: error.message };
  }
}
