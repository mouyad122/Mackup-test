'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { calculateInclusiveTax, calculateExclusiveTax } from '@/lib/money';
import { cancelOrderAndReverseFinancials } from '@/lib/order-cancellation';
import { classifyRefund, isTerminalDeliveryOrderStatus, refundableCollectedAmount } from '@/lib/business-finance';

export async function confirmStorefrontOrder(orderId: string) {
  // 1. Require authorized permission
  const session = await requirePermission('orders.confirm');
  const employeeId = session.employeeId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 2. Load order and check status
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      if (!['PENDING', 'AWAITING_WHATSAPP'].includes(order.status)) throw new Error('تم تأكيد الطلب أو نقله إلى مرحلة لاحقة مسبقاً');

      // 3. Reload snapshot and inventory requirements, deduct atomically
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });

        if (!variant || !variant.isActive) {
          throw new Error(`المنتج غير متوفر (SKU: ${item.sku})`);
        }
        if (!item.supplierOfferIdSnapshot && variant.inventorySource === 'SUPPLIER') {
          throw new Error('Product is currently unavailable from all suppliers.');
        }

        // 1. Inventory Deductions based on variant stock
        const updatedVariant = await tx.productVariant.updateMany({
          where: {
            id: variant.id,
            stock: { gte: item.quantity }
          },
          data: {
            stock: { decrement: item.quantity }
          }
        });

        if (updatedVariant.count === 0) {
          throw new Error(`مخزون غير كافٍ للمنتج (${variant.product.nameAr})`);
        }

        // Orders created after supplier sourcing was enabled reserve the exact
        // supplier stock quoted at checkout. Legacy orders have no offer ID.
        if (item.supplierOfferIdSnapshot) {
          const updatedOffer = await tx.supplierOffer.updateMany({
            where: { id: item.supplierOfferIdSnapshot, isActive: true, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updatedOffer.count === 0) {
            throw new Error(`مخزون المورد غير كافٍ للمنتج (${variant.product.nameAr})`);
          }
          const offerAfter = await tx.supplierOffer.findUnique({ where: { id: item.supplierOfferIdSnapshot }, select: { stock: true } });
          if (offerAfter) await tx.supplierInventoryMovement.create({ data: {
            supplierOfferId: item.supplierOfferIdSnapshot,
            quantityDelta: -item.quantity,
            quantityBefore: offerAfter.stock + item.quantity,
            quantityAfter: offerAfter.stock,
            reason: 'ORDER_CONFIRMED',
            reference: order.reference,
            actorEmployeeId: employeeId,
          } });
        }

        const freshVariant = await tx.productVariant.findUnique({
          where: { id: variant.id },
          select: { stock: true }
        });
        
        if (freshVariant && freshVariant.stock <= 5) {
          await tx.adminNotification.create({
            data: {
              title: freshVariant.stock === 0 ? 'نفاذ كمية' : 'تنبيه: اقتراب نفاذ كمية',
              message: `المنتج (${variant.product.nameAr} - ${variant.name}) وصل إلى ${freshVariant.stock} حبات في المخزون.`,
              type: freshVariant.stock === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
              link: `/admin/products/${variant.productId}`
            }
          });
        }

        // Log final product inventory movement
        await tx.inventoryMovement.create({
          data: {
            sku: variant.sku,
            type: 'SALE',
            quantity: -item.quantity,
            quantityBefore: (freshVariant?.stock ?? variant.stock - item.quantity) + item.quantity,
            quantityAfter: freshVariant?.stock ?? variant.stock - item.quantity,
            employeeId,
            reference: `ORDER_CONFIRMATION_${order.reference}`
          }
        });
      }


      // 4. Load tax settings and compute totals
      const settings = await tx.globalPricingSettings.findUnique({ where: { id: '1' } });
      const taxEnabled = settings?.taxEnabled ?? false;
      const taxRate = settings?.taxRate ?? 0.0;
      const pricesIncludeTax = settings?.pricesIncludeTax ?? true;

      const subtotal = order.totalAmount - order.shippingCost;
      let taxAmount = 0;
      let calculatedSubtotal = subtotal;
      let computedTotal = subtotal;

      if (taxEnabled) {
        if (pricesIncludeTax) {
          taxAmount = calculateInclusiveTax(subtotal, taxRate);
          calculatedSubtotal = subtotal - taxAmount;
          computedTotal = subtotal;
        } else {
          taxAmount = calculateExclusiveTax(subtotal, taxRate);
          calculatedSubtotal = subtotal;
          computedTotal = subtotal + taxAmount;
        }
      } else {
        taxAmount = 0;
        calculatedSubtotal = subtotal;
        computedTotal = subtotal;
      }
      const finalTotal = computedTotal + order.shippingCost;

      // 5. Create Sale record (without payments since it is COD)
      const sale = await tx.sale.create({
        data: {
          reference: `SALE-ORD-${order.reference}`,
          employeeId,
          customerName: order.customerName,
          subtotal: calculatedSubtotal,
          tax: taxAmount,
          total: finalTotal,
          status: 'COMPLETED',
          source: 'STOREFRONT',
          items: {
            create: order.items.map(item => ({
              variantId: item.variantId,
              sku: item.sku,
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.total
            }))
          }
        }
      });

      // 6. Update order status to CONFIRMED and paymentStatus to COD_PENDING
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: 'CONFIRMED',
          totalAmount: finalTotal,
          paymentStatus: 'COD_PENDING'
        }
      });

      // 7. Create Invoice with snapshots
      await tx.invoice.create({
        data: {
          orderId: order.id,
          saleId: sale.id,
          number: `INV-ORD-${order.reference}-${Date.now()}`,
          
          // Unambiguous Financial Snapshots (in Fils)
          netSubtotalFils: calculatedSubtotal,
          discountAmountFils: order.discountAmount,
          shippingAmountFils: order.shippingCost,
          taxAmountFils: taxAmount,
          grossTotalFils: finalTotal,
          taxRateSnapshot: taxRate,
          taxModeSnapshot: !taxEnabled ? 'DISABLED' : (pricesIncludeTax ? 'INCLUSIVE' : 'EXCLUSIVE'),
          pricesIncludeTaxSnapshot: pricesIncludeTax,
          
          // Payment & Cash Tender/Allocation Breakdown (in Fils)
          cashAppliedFils: 0,
          cardAppliedFils: 0,
          cashTenderedFils: 0,
          changeDueFils: 0,
          paymentStatus: 'COD_PENDING',
          confirmedByEmployeeId: employeeId
        }
      });

      if (order.shippingCost > 0) await tx.financialTransaction.create({ data: {
        type: 'DELIVERY_REVENUE', direction: 'IN', amount: order.shippingCost, orderId: order.id,
        description: `Customer delivery fee for ${order.reference}`, createdByEmployeeId: employeeId,
      } });
      if (order.actualDeliveryCost !== null && order.actualDeliveryCost > 0) await tx.financialTransaction.create({ data: {
        type: 'DELIVERY_COST', direction: 'OUT', amount: order.actualDeliveryCost, orderId: order.id,
        description: `Carrier cost for ${order.reference}`, createdByEmployeeId: employeeId,
      } });
      const normalDiscount = Math.max(0, order.discountAmount - order.couponDiscount - order.rewardDiscount);
      for (const [type, amount, label] of [
        ['DISCOUNT', normalDiscount, 'regular discount'],
        ['COUPON', order.couponDiscount, 'coupon discount'],
        ['REWARD_DISCOUNT', order.rewardDiscount, 'reward discount'],
      ] as const) if (amount > 0) await tx.financialTransaction.create({ data: {
        type, direction: 'OUT', amount, orderId: order.id,
        description: `${label} applied to ${order.reference}`, createdByEmployeeId: employeeId,
      } });
      for (const item of order.items) {
        await tx.financialTransaction.create({ data: {
          type: 'SALE', direction: 'IN', amount: item.total, orderId: order.id,
          supplierId: item.supplierIdSnapshot,
          description: `Product sale: ${item.name} (${order.reference})`, createdByEmployeeId: employeeId,
        } });
        if (item.unitCostSnapshot === null) continue;
        const cost = item.unitCostSnapshot * item.quantity;
        if (cost > 0) await tx.financialTransaction.create({ data: {
          type: 'PRODUCT_COST', direction: 'OUT', amount: cost, orderId: order.id,
          supplierId: item.supplierIdSnapshot,
          description: `Product cost: ${item.name} (${order.reference})`, createdByEmployeeId: employeeId,
        } });
        const supplierDue = (item.supplierAmountSnapshot ?? 0) + cost;
        if (item.supplierIdSnapshot && supplierDue > 0) await tx.financialTransaction.create({ data: {
          type: 'SUPPLIER_OBLIGATION', direction: 'OUT', amount: supplierDue, orderId: order.id,
          supplierId: item.supplierIdSnapshot,
          description: `Supplier obligation: ${item.name} (${order.reference})`, createdByEmployeeId: employeeId,
        } });
      }

      // 7. Write order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CONFIRMED',
          notes: `Order confirmed by employee: ${employeeId}`
        }
      });

      // 8. Write audit logs
      await tx.auditLog.create({
        data: {
          employeeId,
          action: 'ORDER_CONFIRMED',
          entityType: 'Order',
          entityId: order.id,
          details: JSON.stringify({ reference: order.reference, total: finalTotal })
        }
      });

      return updatedOrder;
    });

    return { success: true, order: result };
  } catch (error: any) {
    return { error: error.message || 'حدث خطأ غير معروف' };
  }
}

export async function recordInvoicePayment(
  invoiceId: string,
  amount: number,
  method: 'CASH' | 'CARD',
  employeeId: string,
  amountTendered?: number,
  terminalRef?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('manage_orders');

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { order: true, sale: true }
      });

      if (!invoice) throw new Error('الفاتورة غير موجودة');
      if (invoice.paymentStatus === 'PAID') throw new Error('الفاتورة مدفوعة بالكامل بالفعل');
      if (!Number.isSafeInteger(amount) || amount <= 0 || !['CASH', 'CARD'].includes(method)) throw new Error('قيمة أو وسيلة الدفع غير صالحة.');
      const alreadyCollected = invoice.cashAppliedFils + invoice.cardAppliedFils;
      if (amount > Math.max(0, invoice.grossTotalFils - alreadyCollected)) throw new Error('مبلغ الدفعة يتجاوز الرصيد المستحق على الفاتورة.');

      const saleId = invoice.saleId;
      if (!saleId) throw new Error('لا يمكن تسجيل دفعة لفاتورة غير مرتبطة بعملية بيع');

      // Create Payment record
      await tx.payment.create({
        data: {
          saleId,
          method,
          amount,
          amountTendered: method === 'CASH' ? (amountTendered ?? amount) : null,
          terminalRef: method === 'CARD' ? (terminalRef || null) : null
        }
      });

      const totalPayments = alreadyCollected + amount;

      // Check if invoice is paid
      let newStatus = 'PARTIALLY_PAID';
      if (totalPayments >= invoice.grossTotalFils) {
        newStatus = 'PAID';
      }

      // Update invoice fields
      const cashApplied = invoice.cashAppliedFils + (method === 'CASH' ? amount : 0);
      const cardApplied = invoice.cardAppliedFils + (method === 'CARD' ? amount : 0);
      const cashTendered = invoice.cashTenderedFils + (method === 'CASH' ? (amountTendered ?? amount) : 0);
      const changeDue = Math.max(0, cashTendered - cashApplied);

      const invoiceClaim = await tx.invoice.updateMany({
        where: { id: invoiceId, cashAppliedFils: invoice.cashAppliedFils, cardAppliedFils: invoice.cardAppliedFils, paymentStatus: invoice.paymentStatus },
        data: {
          cashAppliedFils: cashApplied,
          cardAppliedFils: cardApplied,
          cashTenderedFils: cashTendered,
          changeDueFils: changeDue,
          paymentStatus: newStatus
        }
      });
      if (invoiceClaim.count !== 1) throw new Error('تم تسجيل دفعة أخرى بالتزامن؛ أعد تحميل الفاتورة.');

      if (invoice.orderId) {
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { paymentStatus: newStatus }
        });
      }

      return { success: true };
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function recordInvoiceRefund(
  invoiceId: string,
  amount: number,
  employeeId: string,
  idempotencyKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requirePermission('manage_orders');

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, include: { order: { include: { items: true, deliveryAssignment: true, financialTransactions: true, couponRedemption: true, rewardRedemptions: true } }, sale: { include: { financialTransactions: true } } } });

      if (!invoice) throw new Error('الفاتورة غير موجودة');
      if (!/^[0-9a-f-]{36}$/i.test(idempotencyKey)) throw new Error('معرّف عملية الاسترداد غير صالح.');
      const priorRefundEvents = await tx.financialTransaction.findMany({ where: { businessEventKey: { startsWith: `refund:${invoiceId}:${idempotencyKey}:` } }, select: { amount: true } });
      if (priorRefundEvents.length) {
        if (priorRefundEvents.reduce((sum, event) => sum + event.amount, 0) !== amount) throw new Error('استخدم معرّفاً جديداً لكل مبلغ استرداد مختلف.');
        return { success: true };
      }
      const collected = invoice.cashAppliedFils + invoice.cardAppliedFils;
      const refundable = refundableCollectedAmount(collected, invoice.refundAmountFils);
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > refundable) {
        throw new Error('قيمة الاسترداد غير صالحة أو تتجاوز الرصيد القابل للاسترداد');
      }

      let newStatus = 'PARTIALLY_REFUNDED';
      const refundedTotal = invoice.refundAmountFils + amount;
      if (refundedTotal >= collected) {
        newStatus = 'REFUNDED';
      }

      const invoiceClaim = await tx.invoice.updateMany({
        where: { id: invoiceId, refundAmountFils: invoice.refundAmountFils, cashAppliedFils: invoice.cashAppliedFils, cardAppliedFils: invoice.cardAppliedFils },
        data: { paymentStatus: newStatus, refundAmountFils: refundedTotal }
      });
      if (invoiceClaim.count !== 1) throw new Error('تم تعديل الاسترداد بالتزامن؛ أعد تحميل الفاتورة.');

      if (invoice.orderId) {
        if (newStatus === 'REFUNDED') {
          const order = invoice.order;
          const assignment = order?.deliveryAssignment;
          const wasDispatched = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'FAILED'].includes(assignment?.status || '')
            || ['SHIPPED', 'OUT_FOR_DELIVERY', 'FAILED_DELIVERY'].includes(order?.status || '');
          const needsInspection = !!order && (wasDispatched || order.status === 'DELIVERED');
          const orderClaim = await tx.order.updateMany({
            where: { id: invoice.orderId, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
            data: { paymentStatus: newStatus, status: 'REFUNDED', ...(needsInspection ? { notes: `${order?.notes ?? ''}\n[RETURN_PENDING]` } : {}) },
          });
          if (orderClaim.count !== 1) throw new Error('لا يمكن استرداد طلب ملغى أو مسترد مسبقاً.');
          for (const transaction of [...(order?.financialTransactions ?? []), ...(invoice.sale?.financialTransactions ?? [])]) {
            const reversalType: Record<string, string> = { DISCOUNT: 'DISCOUNT_REVERSAL', COUPON: 'COUPON_REVERSAL', REWARD_DISCOUNT: 'REWARD_DISCOUNT_REVERSAL' };
            if (!reversalType[transaction.type]) continue;
            await tx.financialTransaction.create({ data: {
              businessEventKey: `refund:${invoiceId}:${idempotencyKey}:discount:${transaction.id}`,
              type: reversalType[transaction.type], direction: 'IN', amount: transaction.amount, orderId: invoice.orderId, saleId: invoice.saleId,
              description: `Reverse discount after full refund ${order?.reference ?? invoice.sale?.reference ?? invoiceId}`, createdByEmployeeId: session.employeeId,
            } });
          }
          if (order && !wasDispatched && !['DELIVERED'].includes(order.status)) {
            for (const item of order.items) {
              const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
              if (variant) {
                await tx.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: item.quantity } } });
                const after = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
                await tx.inventoryMovement.create({ data: { sku: variant.sku, type: 'CANCELLED_ORDER', quantity: item.quantity, quantityBefore: (after?.stock ?? variant.stock + item.quantity) - item.quantity, quantityAfter: after?.stock ?? variant.stock + item.quantity, employeeId: session.employeeId, reference: `REFUNDED_BEFORE_DISPATCH_${order.reference}` } });
              }
              if (item.supplierOfferIdSnapshot) {
                const offer = await tx.supplierOffer.update({ where: { id: item.supplierOfferIdSnapshot }, data: { stock: { increment: item.quantity } } });
                await tx.supplierInventoryMovement.create({ data: { supplierOfferId: item.supplierOfferIdSnapshot, quantityDelta: item.quantity, quantityBefore: offer.stock - item.quantity, quantityAfter: offer.stock, reason: 'ORDER_REFUNDED_BEFORE_DISPATCH', reference: order.reference, actorEmployeeId: session.employeeId } });
              }
              const cost = (item.unitCostSnapshot ?? 0) * item.quantity;
              if (cost > 0) {
                await tx.financialTransaction.create({ data: { businessEventKey: `refund:${invoiceId}:${idempotencyKey}:product-cost:${item.id}`, type: 'PRODUCT_COST_REVERSAL', direction: 'IN', amount: cost, orderId: order.id, supplierId: item.supplierIdSnapshot, description: `Reverse product cost for pre-delivery refund ${order.reference}`, createdByEmployeeId: session.employeeId } });
              }
              const supplierDue = cost + (item.supplierAmountSnapshot ?? 0);
              if (item.supplierIdSnapshot && supplierDue > 0) await tx.financialTransaction.create({ data: { businessEventKey: `refund:${invoiceId}:${idempotencyKey}:supplier:${item.id}`, type: 'SUPPLIER_OBLIGATION_REVERSAL', direction: 'IN', amount: supplierDue, orderId: order.id, supplierId: item.supplierIdSnapshot, description: `Reverse supplier obligation for pre-delivery refund ${order.reference}`, createdByEmployeeId: session.employeeId } });
            }
            if ((order.actualDeliveryCost ?? 0) > 0) await tx.financialTransaction.create({ data: { businessEventKey: `refund:${invoiceId}:${idempotencyKey}:carrier-cost`, type: 'DELIVERY_COST_REVERSAL', direction: 'IN', amount: order.actualDeliveryCost!, orderId: order.id, description: `Reverse carrier cost before dispatch ${order.reference}`, createdByEmployeeId: session.employeeId } });
            if (order.couponRedemption && !order.couponRedemption.isVoided) {
              const voided = await tx.couponRedemption.updateMany({ where: { id: order.couponRedemption.id, isVoided: false }, data: { isVoided: true } });
              if (voided.count) await tx.coupon.update({ where: { id: order.couponRedemption.couponId }, data: { usageCount: { decrement: 1 } } });
            }
            for (const redemption of order.rewardRedemptions) if (!redemption.isVoided) {
              const voided = await tx.rewardRedemption.updateMany({ where: { id: redemption.id, isVoided: false }, data: { isVoided: true } });
              if (voided.count) await tx.rewardRule.update({ where: { id: redemption.rewardRuleId }, data: { usageCount: { decrement: 1 } } });
            }
          }
          if (assignment && !['DELIVERED', 'CANCELLED'].includes(assignment.status)) {
            const released = await tx.deliveryAssignment.updateMany({ where: { id: assignment.id, status: { notIn: ['DELIVERED', 'CANCELLED'] } }, data: { status: 'CANCELLED' } });
            if (released.count) await tx.captain.updateMany({ where: { id: assignment.captainId }, data: { status: 'AVAILABLE' } });
          }
        } else {
          await tx.order.update({ where: { id: invoice.orderId }, data: { paymentStatus: newStatus } });
        }
        await tx.orderStatusHistory.create({ data: {
          orderId: invoice.orderId, status: newStatus,
          notes: `Refund ${amount} fils recorded; refunded stock is held from resale until inspected.`,
        } });
      }
      const { product: productRefund, delivery: deliveryRefund, tax: taxRefund } = classifyRefund(amount, invoice.netSubtotalFils, invoice.shippingAmountFils);
      if (productRefund > 0) await tx.financialTransaction.create({ data: {
        businessEventKey: `refund:${invoiceId}:${idempotencyKey}:product`,
        type: 'REFUND_PRODUCT', direction: 'OUT', amount: productRefund, orderId: invoice.orderId, saleId: invoice.saleId,
        description: `Product portion of customer refund for ${invoice.order?.reference ?? invoice.sale?.reference ?? invoiceId}`,
        createdByEmployeeId: session.employeeId,
      } });
      if (deliveryRefund > 0) await tx.financialTransaction.create({ data: {
        businessEventKey: `refund:${invoiceId}:${idempotencyKey}:delivery`,
        type: 'REFUND_DELIVERY', direction: 'OUT', amount: deliveryRefund, orderId: invoice.orderId, saleId: invoice.saleId,
        description: `Delivery portion of customer refund for ${invoice.order?.reference ?? invoice.sale?.reference ?? invoiceId}`,
        createdByEmployeeId: session.employeeId,
      } });
      if (taxRefund > 0) await tx.financialTransaction.create({ data: {
        businessEventKey: `refund:${invoiceId}:${idempotencyKey}:tax`,
        type: 'REFUND_TAX', direction: 'OUT', amount: taxRefund, orderId: invoice.orderId, saleId: invoice.saleId,
        description: `Tax portion of customer refund for ${invoice.order?.reference ?? invoice.sale?.reference ?? invoiceId}`,
        createdByEmployeeId: session.employeeId,
      } });

      return { success: true };
    });

    return result;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelStorefrontOrder(orderId: string) {
  const session = await requirePermission('orders.confirm');
  try {
    const order = await cancelOrderAndReverseFinancials(orderId, session.employeeId);
    return { success: true, order };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء الإلغاء' };
  }
}

export async function updateOrderStatus(orderId: string, status: string, shippingCost: number) {
  const session = await requirePermission('orders.confirm');
  
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      throw new Error('الطلب غير موجود');
    }

    if (!['PREPARING', 'PREPARED', 'SHIPPED', 'DELIVERED'].includes(status)) throw new Error('حالة الطلب غير صالحة');
    if (status === 'SHIPPED' || status === 'DELIVERED') {
      if ((status === 'SHIPPED' && order.status !== 'PREPARED') || (status === 'DELIVERED' && order.status !== 'SHIPPED')) {
        throw new Error('لا يمكن نقل الطلب إلى هذه الحالة من وضعه الحالي');
      }
      const assignment = await prisma.deliveryAssignment.findUnique({ where: { orderId }, include: { captain: true } });
      if (!assignment) throw new Error('عيّن مندوباً للطلب قبل بدء التوصيل.');
      const nextDeliveryStatus = status === 'SHIPPED' ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
      if (assignment.status === 'DELIVERED') throw new Error('تم تسليم الطلب مسبقاً');
      await prisma.$transaction(async tx => {
        if (isTerminalDeliveryOrderStatus(order.status)) throw new Error('الطلب ملغى أو مسترد أو مكتمل؛ لا يمكن متابعة التوصيل.');
        const assignmentClaim = await tx.deliveryAssignment.updateMany({ where: { id: assignment.id, status: { equals: assignment.status, notIn: ['CANCELLED', 'DELIVERED'] } }, data: { status: nextDeliveryStatus, deliveredAt: status === 'DELIVERED' ? new Date() : undefined } });
        if (assignmentClaim.count !== 1) throw new Error('تم تحديث التوصيل بالتزامن؛ أعد تحميل الطلب.');
        if (status === 'DELIVERED') await tx.captain.update({ where: { id: assignment.captainId }, data: { status: 'AVAILABLE' } });
        const orderClaim = await tx.order.updateMany({ where: { id: orderId, status: { equals: order.status, notIn: ['CANCELLED', 'REFUNDED'] } }, data: { status, shippingCost: order.shippingCost, totalAmount: order.totalAmount } });
        if (orderClaim.count !== 1) throw new Error('الطلب ملغى أو مسترد أو تغير بالتزامن.');
        await tx.orderStatusHistory.create({ data: { orderId, status, notes: `Updated by employee ${session.employeeId}` } });
        if (status === 'DELIVERED' && assignment.captainEarning > 0) {
          await tx.financialTransaction.create({ data: {
            businessEventKey: `captain-earning:${assignment.id}`,
            type: 'CAPTAIN_EARNING', direction: 'OUT', amount: assignment.captainEarning,
            orderId, captainId: assignment.captainId, deliveryAssignmentId: assignment.id,
            description: `Captain earning for ${order.reference}`, createdByEmployeeId: session.employeeId,
          } });
        }
      }, { isolationLevel: 'Serializable' });
      return { success: true };
    }

    const validNextStatus: Record<string, string[]> = { CONFIRMED: ['PREPARING'], PREPARING: ['PREPARED'] };
    if (!validNextStatus[order.status]?.includes(status)) throw new Error('انتقال الحالة غير مسموح؛ يجب إكمال مراحل الطلب بالترتيب.');
    if (!Number.isSafeInteger(shippingCost) || shippingCost !== order.shippingCost) throw new Error('رسوم التوصيل محفوظة مع الطلب ولا يمكن تغييرها من تحديث الحالة');

    await prisma.$transaction(async tx => {
      const changed = await tx.order.updateMany({ where: { id: orderId, status: order.status }, data: { status } });
      if (changed.count !== 1) throw new Error('تم تغيير الطلب بالتزامن؛ أعد تحميل الصفحة.');
      await tx.orderStatusHistory.create({
      data: {
        orderId,
        status,
        notes: `تم تحديث الحالة إلى ${status} ورسوم التوصيل إلى ${shippingCost}`
      }
      });
    }, { isolationLevel: 'Serializable' });

    return { success: true };
  } catch (error: any) {
    console.error('Update Order Status Error:', error);
    return { success: false, error: error.message || 'حدث خطأ غير معروف' };
  }
}
