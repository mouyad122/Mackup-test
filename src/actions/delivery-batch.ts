'use server';

import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { cancelOrderAndReverseFinancials } from '@/lib/order-cancellation';

function parseOrders(formData: FormData) {
  const values = formData.getAll('orderIds').flatMap(value => String(value).split(',')).filter(Boolean);
  const parsed = z.array(z.string().uuid()).min(1).max(500).safeParse(values);
  if (!parsed.success || new Set(values).size !== values.length) throw new Error('اختر طلباً جاهزاً واحداً على الأقل دون تكرار.');
  return parsed.data;
}

function refreshBatch(reference: string) {
  revalidatePath('/admin/captains');
  revalidatePath('/admin/orders');
  revalidatePath(`/delivery/${reference}`);
}

export async function createDeliveryBatch(formData: FormData) {
  const session = await requirePermission('manage:orders');
  const orderIds = parseOrders(formData);
  const reference = await prisma.$transaction(async tx => {
    const [count, lastBatch] = await Promise.all([
      tx.deliveryBatch.count(),
      tx.deliveryBatch.findFirst({
        where: { reference: { startsWith: 'BATCH-' } },
        orderBy: { createdAt: 'desc' }
      })
    ]);
    
    let maxRefNum = 0;
    if (lastBatch) {
      const match = lastBatch.reference.match(/^BATCH-(\d+)$/);
      if (match) {
        maxRefNum = parseInt(match[1], 10);
      }
    }
    const nextNum = Math.max(count, maxRefNum) + 1;
    const newRef = `BATCH-${nextNum}`;
    
    const eligible = await tx.order.count({ where: { id: { in: orderIds }, status: 'PREPARED', deliveryBatchId: null, deliveryAssignment: null } });
    if (eligible !== orderIds.length) throw new Error('تغيرت حالة بعض الطلبات أو أُضيفت إلى طلبية أخرى. حدّث الصفحة.');
    const batch = await tx.deliveryBatch.create({ data: { reference: newRef, status: 'NOT_DELIVERED' } });
    const updated = await tx.order.updateMany({
      where: { id: { in: orderIds }, status: 'PREPARED', deliveryBatchId: null },
      data: { deliveryBatchId: batch.id, status: 'SHIPPED' },
    });
    if (updated.count !== orderIds.length) throw new Error('تغيرت الطلبات أثناء التجميع. أعد المحاولة.');
    await tx.orderStatusHistory.createMany({ data: orderIds.map(orderId => ({
      orderId,
      status: 'SHIPPED',
      notes: `تم وضع الطلب في طلبية شركة التوصيل ${newRef}`,
    })) });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_BATCH_CREATED', entityType: 'DeliveryBatch', entityId: batch.id, details: JSON.stringify({ reference: newRef, orderIds }) } });
    return newRef;
  }, { isolationLevel: 'Serializable' });
  refreshBatch(reference);
}

export async function updateDeliveryBatch(batchId: string, formData: FormData) {
  const session = await requirePermission('manage:orders');
  const orderIds = parseOrders(formData);
  const reference = await prisma.$transaction(async tx => {
    const batch = await tx.deliveryBatch.findUniqueOrThrow({ where: { id: batchId }, include: { orders: { include: { deliveryAssignment: true } } } });
    if (batch.status === 'COMPLETED' || batch.orders.some(order => order.status !== 'SHIPPED' || order.deliveryAssignment)) throw new Error('لا يمكن تغيير طلبية مكتملة أو بدأ توصيلها.');
    const eligible = await tx.order.count({ where: { id: { in: orderIds }, deliveryAssignment: null, OR: [
      { status: 'PREPARED', deliveryBatchId: null },
      { status: 'SHIPPED', deliveryBatchId: batchId },
    ] } });
    if (eligible !== orderIds.length) throw new Error('تغيرت حالة أحد الطلبات. حدّث الصفحة.');
    const removedOrderIds = batch.orders.filter(order => !orderIds.includes(order.id)).map(order => order.id);
    await tx.order.updateMany({ where: { id: { in: removedOrderIds }, deliveryBatchId: batchId }, data: { deliveryBatchId: null, status: 'PREPARED' } });
    await tx.order.updateMany({ where: { id: { in: orderIds } }, data: { deliveryBatchId: batchId, status: 'SHIPPED' } });
    await tx.orderStatusHistory.createMany({ data: [
      ...removedOrderIds.map(orderId => ({ orderId, status: 'PREPARED', notes: `تمت إزالة الطلب من طلبية شركة التوصيل ${batch.reference}` })),
      ...orderIds.filter(orderId => !batch.orders.some(order => order.id === orderId)).map(orderId => ({ orderId, status: 'SHIPPED', notes: `تمت إضافة الطلب إلى طلبية شركة التوصيل ${batch.reference}` })),
    ] });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_BATCH_UPDATED', entityType: 'DeliveryBatch', entityId: batchId, details: JSON.stringify({ previousOrderIds: batch.orders.map(order => order.id), orderIds }) } });
    return batch.reference;
  }, { isolationLevel: 'Serializable' });
  refreshBatch(reference);
}

export async function deleteDeliveryBatch(batchId: string) {
  const session = await requirePermission('manage:orders');
  const reference = await prisma.$transaction(async tx => {
    const batch = await tx.deliveryBatch.findUnique({ where: { id: batchId }, include: { orders: { include: { deliveryAssignment: true } } } });
    if (!batch) return null;
    if (batch.status === 'COMPLETED' || batch.orders.some(order => order.status !== 'SHIPPED' || order.deliveryAssignment)) throw new Error('لا يمكن حذف طلبية مكتملة أو بدأ توصيلها.');
    await tx.order.updateMany({ where: { deliveryBatchId: batchId }, data: { deliveryBatchId: null, status: 'PREPARED' } });
    await tx.orderStatusHistory.createMany({ data: batch.orders.map(order => ({
      orderId: order.id,
      status: 'PREPARED',
      notes: `تم إلغاء طلبية شركة التوصيل ${batch.reference}`,
    })) });
    await tx.deliveryBatch.update({ where: { id: batchId }, data: { status: 'CANCELLED' } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_BATCH_CANCELLED', entityType: 'DeliveryBatch', entityId: batchId, details: JSON.stringify({ reference: batch.reference, orderIds: batch.orders.map(order => order.id) }) } });
    return batch.reference;
  }, { isolationLevel: 'Serializable' });
  if (reference) refreshBatch(reference);
  return { success: true };
}

const batchStatusSchema = z.enum(['NOT_DELIVERED', 'IN_DELIVERY', 'COMPLETED', 'CANCELLED']);

export async function updateDeliveryBatchStatus(batchId: string, formData: FormData) {
  const session = await requirePermission('manage:orders');
  const status = batchStatusSchema.safeParse(formData.get('status'));
  const cancelledOrderIds = [...new Set(formData.getAll('cancelledOrderIds').map(String))];
  const shippingResponsibility = z.enum(['STORE', 'CUSTOMER']).safeParse(formData.get('shippingResponsibility'));
  if (!status.success) return { success: false, error: 'اختر حالة صحيحة للطلبية.' };
  if (cancelledOrderIds.length && !shippingResponsibility.success) return { success: false, error: 'حدد إلزامياً الجهة التي تتحمل رسوم توصيل الطلبات الملغاة.' };

  try {
    const batch = await prisma.deliveryBatch.findUnique({ where: { id: batchId }, include: { orders: true } });
    if (!batch) return { success: false, error: 'الطلبية غير موجودة.' };
    if (batch.status === 'COMPLETED') return { success: false, error: 'هذه الطلبية مكتملة ولا يمكن تعديلها.' };
    if (cancelledOrderIds.some(id => !batch.orders.some(order => order.id === id))) return { success: false, error: 'طلب ملغى لا ينتمي إلى هذه الطلبية.' };

    for (const orderId of cancelledOrderIds) {
      const order = batch.orders.find(item => item.id === orderId);
      if (order && !['CANCELLED', 'REFUNDED'].includes(order.status)) {
        await cancelOrderAndReverseFinancials(orderId, session.employeeId, shippingResponsibility.data === 'STORE');
      }
    }

    await prisma.$transaction(async tx => {
      const current = await tx.deliveryBatch.findUniqueOrThrow({ where: { id: batchId }, include: { orders: true } });
      const allCancelled = current.orders.length > 0 && current.orders.every(order => ['CANCELLED', 'REFUNDED'].includes(order.status));
      if (status.data === 'CANCELLED' && !allCancelled) throw new Error('لا يمكن إلغاء الطلبية بالكامل ما دام فيها طلب غير ملغى.');
      const nextStatus = allCancelled ? 'CANCELLED' : status.data;
      if (nextStatus === 'COMPLETED') {
        const pendingReturns = current.orders.filter(order => order.status === 'CANCELLED' && order.notes?.includes('[RETURN_PENDING]') && !order.notes.includes('[RETURN_INSPECTED]'));
        if (pendingReturns.length) throw new Error('افحص المرتجع وسجّل استلامه للطلبات الملغاة قبل إنهاء الطلبية.');
        const unfinished = current.orders.filter(order => !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status));
        const invalidOrders = unfinished.filter(order => !['PREPARED', 'SHIPPED'].includes(order.status));
        if (invalidOrders.length) throw new Error(`لا يمكن إنهاء الطلبية قبل معالجة هذه الطلبات: ${invalidOrders.map(order => order.reference).join('، ')}.`);
        const deliveredIds = unfinished.map(order => order.id);
        if (deliveredIds.length) {
          await tx.order.updateMany({ where: { id: { in: deliveredIds }, status: { in: ['PREPARED', 'SHIPPED'] } }, data: { status: 'DELIVERED' } });
          await tx.orderStatusHistory.createMany({ data: deliveredIds.map(orderId => ({ orderId, status: 'DELIVERED', notes: `تم إنهاء طلبية شركة التوصيل ${current.reference}` })) });
        }
      }
      await tx.deliveryBatch.update({ where: { id: batchId }, data: { status: nextStatus } });
      await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_BATCH_STATUS_UPDATED', entityType: 'DeliveryBatch', entityId: batchId, details: JSON.stringify({ reference: current.reference, previousStatus: current.status, status: nextStatus, cancelledOrderIds, shippingResponsibility: shippingResponsibility.data ?? null }) } });
    }, { isolationLevel: 'Serializable' });
    refreshBatch(batch.reference);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'تعذر تحديث حالة الطلبية.' };
  }
}
