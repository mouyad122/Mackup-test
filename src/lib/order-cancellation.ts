import 'server-only';
import { prisma } from '@/lib/db';

/** Shared cancellation transaction used by storefront, admin, and POS entry points. */
export async function cancelOrderAndReverseFinancials(orderId: string, employeeId: string, storeBearsDeliveryCost?: boolean) {
  return prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true, deliveryAssignment: true, financialTransactions: true, couponRedemption: true, rewardRedemptions: true, invoice: true },
    });
    if (!order) throw new Error('الطلب غير موجود');
    if (order.status === 'CANCELLED') throw new Error('الطلب ملغي مسبقاً');
    if (order.status === 'REFUNDED') throw new Error('تم استرداد الطلب بالفعل.');
    if (order.invoice && ['PAID', 'PARTIALLY_PAID', 'PARTIALLY_REFUNDED', 'REFUNDED'].includes(order.invoice.paymentStatus)) {
      throw new Error('للطلب دفعة مسجلة. سجّل الاسترداد المالي قبل إلغاء الطلب.');
    }
    if (order.deliveryAssignment?.status === 'DELIVERED' || order.status === 'DELIVERED') {
      throw new Error('تم تسليم الطلب؛ استخدم مسار الاسترداد ولا تعِد المخزون تلقائياً.');
    }

    const wasDispatched = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'FAILED'].includes(order.deliveryAssignment?.status || '')
      || ['SHIPPED', 'OUT_FOR_DELIVERY', 'FAILED_DELIVERY'].includes(order.status);
    // Compare-and-set makes this event one-shot. Concurrent callers race here;
    // the loser aborts before touching stock, redemptions, or the ledger.
    const claim = await tx.order.updateMany({
      where: { id: order.id, status: order.status, NOT: { status: { in: ['CANCELLED', 'REFUNDED', 'DELIVERED'] } } },
      data: { status: 'CANCELLED', ...(wasDispatched ? { notes: `${order.notes ?? ''}\n[RETURN_PENDING]` } : {}) },
    });
    if (claim.count !== 1) throw new Error('تم إلغاء الطلب أو تغييره بالتزامن؛ أعد تحميل الطلب.');

    // Product availability is manual, so cancellation does not alter quantities.

    const reverseTypes: Record<string, string> = {
      SALE: 'SALE_REVERSAL', PRODUCT_COST: 'PRODUCT_COST_REVERSAL', SUPPLIER_OBLIGATION: 'SUPPLIER_OBLIGATION_REVERSAL',
      DELIVERY_REVENUE: 'DELIVERY_REVENUE_REVERSAL', DELIVERY_COST: 'DELIVERY_COST_REVERSAL',
      DISCOUNT: 'DISCOUNT_REVERSAL', COUPON: 'COUPON_REVERSAL', REWARD_DISCOUNT: 'REWARD_DISCOUNT_REVERSAL',
    };
    for (const transaction of order.financialTransactions) {
      if (wasDispatched && ['PRODUCT_COST', 'SUPPLIER_OBLIGATION', 'DELIVERY_COST'].includes(transaction.type)) continue;
      if (!reverseTypes[transaction.type]) continue;
      await tx.financialTransaction.create({ data: {
        type: reverseTypes[transaction.type], direction: transaction.direction === 'IN' ? 'OUT' : 'IN',
        businessEventKey: `cancel:${order.id}:${transaction.id}`,
        amount: transaction.amount, orderId: order.id, supplierId: transaction.supplierId, captainId: transaction.captainId,
        description: `Reversal of ${transaction.type} after cancellation ${order.reference}`, createdByEmployeeId: employeeId,
      } });
    }
    if (wasDispatched) for (const item of order.items) {
      if (!item.supplierIdSnapshot || !item.supplierAmountSnapshot) continue;
      await tx.financialTransaction.create({ data: {
        type: 'SUPPLIER_OBLIGATION_REVERSAL', direction: 'IN', amount: item.supplierAmountSnapshot,
        orderId: order.id, supplierId: item.supplierIdSnapshot,
        description: `Reverse supplier profit share for cancelled in-transit order ${order.reference}`,
        createdByEmployeeId: employeeId,
      } });
    }
    if (order.couponRedemption && !order.couponRedemption.isVoided) {
      const voided = await tx.couponRedemption.updateMany({ where: { id: order.couponRedemption.id, isVoided: false }, data: { isVoided: true } });
      if (voided.count) await tx.coupon.update({ where: { id: order.couponRedemption.couponId }, data: { usageCount: { decrement: 1 } } });
    }
    for (const redemption of order.rewardRedemptions) if (!redemption.isVoided) {
      const voided = await tx.rewardRedemption.updateMany({ where: { id: redemption.id, isVoided: false }, data: { isVoided: true } });
      if (voided.count) await tx.rewardRule.update({ where: { id: redemption.rewardRuleId }, data: { usageCount: { decrement: 1 } } });
    }
    if (order.deliveryAssignment) {
      const released = await tx.deliveryAssignment.updateMany({ where: { id: order.deliveryAssignment.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } }, data: { status: 'CANCELLED' } });
      if (released.count) await tx.captain.updateMany({ where: { id: order.deliveryAssignment.captainId }, data: { status: 'AVAILABLE' } });
      
      // If store bears the cost, log it as an expense (DELIVERY_COST)
      if (storeBearsDeliveryCost && order.actualDeliveryCost && order.actualDeliveryCost > 0) {
        await tx.financialTransaction.create({ data: {
          type: 'DELIVERY_COST', direction: 'OUT', amount: order.actualDeliveryCost, orderId: order.id,
          description: `Store bears delivery cost for cancelled order ${order.reference}`,
          createdByEmployeeId: employeeId,
        } });
      }
    }
    await tx.orderStatusHistory.create({ data: {
      orderId: order.id, status: 'CANCELLED',
      notes: wasDispatched
        ? `Order cancelled in transit by employee: ${employeeId}; stock stays held until returned goods are inspected.`
        : `Order cancelled by employee: ${employeeId}`,
    } });
    await tx.auditLog.create({ data: {
      employeeId, action: 'ORDER_CANCELLED', entityType: 'Order', entityId: order.id,
      details: JSON.stringify({ reference: order.reference, previousStatus: order.status }),
    } });
    return tx.order.findUniqueOrThrow({ where: { id: order.id } });
  }, { isolationLevel: 'Serializable' });
}
