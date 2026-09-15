'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { calculateInclusiveTax, calculateExclusiveTax } from '@/lib/money';

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

      if (order.status === 'CONFIRMED') {
        throw new Error('الطلب مؤكد مسبقاً');
      }

      // 3. Reload snapshot and inventory requirements, deduct atomically
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });

        if (!variant || !variant.isActive) {
          throw new Error(`المنتج غير متوفر (SKU: ${item.sku})`);
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
            quantityBefore: variant.stock,
            quantityAfter: variant.stock - item.quantity,
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
          discountAmountFils: 0,
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

      // Calculate total applied payments so far
      const payments = await tx.payment.findMany({ where: { saleId } });
      const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

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

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          cashAppliedFils: cashApplied,
          cardAppliedFils: cardApplied,
          cashTenderedFils: cashTendered,
          changeDueFils: changeDue,
          paymentStatus: newStatus
        }
      });

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
  employeeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission('manage_orders');

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId }
      });

      if (!invoice) throw new Error('الفاتورة غير موجودة');

      let newStatus = 'PARTIALLY_REFUNDED';
      if (amount >= invoice.grossTotalFils) {
        newStatus = 'REFUNDED';
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { paymentStatus: newStatus }
      });

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

export async function cancelStorefrontOrder(orderId: string) {
  const session = await requirePermission('orders.confirm'); // Or manage_orders
  const employeeId = session.employeeId;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true }
      });

      if (!order) {
        throw new Error('الطلب غير موجود');
      }

      if (order.status === 'CANCELLED') {
        throw new Error('الطلب ملغي مسبقاً');
      }

      // If it was CONFIRMED, inventory was deducted. We must return it.
      if (order.status === 'CONFIRMED') {
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            include: { product: true }
          });

          if (!variant) continue;

          // Restore Inventory
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: { increment: item.quantity } }
          });

          await tx.inventoryMovement.create({
            data: {
              sku: variant.sku,
              type: 'RETURN',
              quantity: item.quantity,
              quantityBefore: variant.stock,
              quantityAfter: variant.stock + item.quantity,
              employeeId,
              reference: `ORDER_CANCELLATION_${order.reference}`
            }
          });
        }
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' }
      });

      // Write order status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          notes: `Order cancelled by employee: ${employeeId}`
        }
      });

      // Write audit log
      await tx.auditLog.create({
        data: {
          employeeId,
          action: 'ORDER_CANCELLED',
          entityType: 'Order',
          entityId: order.id,
          details: JSON.stringify({ reference: order.reference, previousStatus: order.status })
        }
      });

      return updatedOrder;
    });

    return { success: true, order: result };
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

    const newTotal = order.totalAmount - order.shippingCost + shippingCost;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        shippingCost,
        totalAmount: newTotal
      }
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId,
        status,
        notes: `تم تحديث الحالة إلى ${status} ورسوم التوصيل إلى ${shippingCost}`
      }
    });

    return { success: true };
  } catch (error: any) {
    console.error('Update Order Status Error:', error);
    return { success: false, error: error.message || 'حدث خطأ غير معروف' };
  }
}
