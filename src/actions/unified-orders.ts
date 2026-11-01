'use server';

import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/dal';
import { confirmStorefrontOrder } from '@/actions/orders';
import { cancelOrderAndReverseFinancials } from '@/lib/order-cancellation';
import {
  getOrCreateOrderInvoice,
  buildCustomerConfirmationWhatsAppMessage,
  resolveCustomerFacingBaseUrl,
} from '@/lib/invoices/invoice-service';
import { createSupplierAccessSession } from '@/lib/fulfillment/supplier-session';
import { OrderLifecycleService } from '@/lib/orders/order-lifecycle-service';
import { filsToDisplay } from '@/lib/money';
import { evaluateOrderRewardProtection } from '@/lib/orders/reward-protection';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

/**
 * استخراج الملخص السريع لمؤشرات مركز الطلبات (KPIs) وقائمة الطلبات الخفيفة
 */
export async function getOrdersCommandCenterSummaryAction(filter?: {
  tab?: string;
  search?: string;
  limit?: number;
}) {
  await requirePermission('orders.view');

  const [newCount, needsActionCount, preparingCount, readyDeliveryCount] =
    await Promise.all([
      // 1. طلبات جديدة بانتظار التأكيد
      prisma.order.count({
        where: {
          status: { in: ['PENDING', 'AWAITING_WHATSAPP'] },
        },
      }),

      // 2. تحتاج تدخلك: تعثر توصيل أو مشاكل ونواقص موردين
      prisma.order.count({
        where: {
          OR: [
            { fulfillmentStatus: 'FAILED_DELIVERY' },
            { status: 'FAILED_DELIVERY' },
            {
              fulfillmentOrders: {
                some: { status: 'ISSUE_REPORTED' },
              },
            },
          ],
        },
      }),

      // 3. قيد التجهيز لدى الموردين
      prisma.order.count({
        where: {
          status: { in: ['CONFIRMED', 'PREPARING'] },
          fulfillmentStatus: { in: ['UNFULFILLED', 'SPLIT_PENDING', 'PROCESSING', 'PARTIALLY_READY'] },
        },
      }),

      // 4. جاهزة للتوصيل أو قيد التوصيل النهائي
      prisma.order.count({
        where: {
          OR: [
            { fulfillmentStatus: { in: ['READY_FOR_PICKUP', 'ALL_PICKED_UP', 'RECEIVED_AT_HUB', 'OUT_FOR_DELIVERY'] } },
            { status: { in: ['SHIPPED', 'OUT_FOR_DELIVERY'] } },
          ],
        },
      }),
    ]);

  // بناء شرط التبويب
  let whereTab: any = {};
  if (filter?.tab === 'NEW') {
    whereTab = { status: { in: ['PENDING', 'AWAITING_WHATSAPP'] } };
  } else if (filter?.tab === 'NEEDS_ACTION') {
    whereTab = {
      OR: [
        { fulfillmentStatus: 'FAILED_DELIVERY' },
        { status: 'FAILED_DELIVERY' },
        { fulfillmentOrders: { some: { status: 'ISSUE_REPORTED' } } },
      ],
    };
  } else if (filter?.tab === 'PREPARING') {
    whereTab = {
      status: { in: ['CONFIRMED', 'PREPARING'] },
      fulfillmentStatus: { in: ['UNFULFILLED', 'SPLIT_PENDING', 'PROCESSING', 'PARTIALLY_READY'] },
    };
  } else if (filter?.tab === 'DELIVERY') {
    whereTab = {
      OR: [
        { fulfillmentStatus: { in: ['READY_FOR_PICKUP', 'ALL_PICKED_UP', 'RECEIVED_AT_HUB', 'OUT_FOR_DELIVERY'] } },
        { status: { in: ['SHIPPED', 'OUT_FOR_DELIVERY'] } },
      ],
    };
  } else if (filter?.tab === 'COMPLETED') {
    whereTab = { status: 'DELIVERED' };
  }

  const searchQuery = filter?.search?.trim();
  const whereSearch = searchQuery
    ? {
        OR: [
          { reference: { contains: searchQuery, mode: 'insensitive' as const } },
          { customerName: { contains: searchQuery, mode: 'insensitive' as const } },
          { customerPhone: { contains: searchQuery } },
        ],
      }
    : {};

  const orders = await prisma.order.findMany({
    where: {
      AND: [whereTab, whereSearch],
    },
    orderBy: { createdAt: 'desc' },
    take: filter?.limit || 100,
    select: {
      id: true,
      reference: true,
      customerName: true,
      customerPhone: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      fulfillmentStrategy: true,
      totalAmount: true,
      shippingCost: true,
      discountAmount: true,
      shippingZoneNameSnapshot: true,
      customerWhatsAppSentAt: true,
      hasAdjustment: true,
      previousTotalAmount: true,
      adjustmentNotes: true,
      createdAt: true,
      deliveryJob: {
        select: {
          city: true,
          status: true,
          codStatus: true,
        },
      },
      fulfillmentOrders: {
        select: {
          id: true,
          supplierId: true,
          status: true,
          supplier: {
            select: { name: true },
          },
          packages: {
            select: { id: true, status: true },
          },
        },
      },
      _count: {
        select: { items: true },
      },
    },
  });

  return {
    kpis: {
      newCount,
      needsActionCount,
      preparingCount,
      readyDeliveryCount,
    },
    orders,
  };
}

/**
 * استرجاع البيانات التفصيلية الكاملة للطلب المحدد مع روابط الواتساب والفاتورة والموردين
 */
export async function getOrderFullDetailsAction(orderId: string, customOrigin?: string) {
  await requirePermission('orders.view');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          fulfillmentItems: true,
        },
      },
      invoice: true,
      deliveryJob: true,
      deliveryAssignment: {
        include: {
          captain: true,
        },
      },
      fulfillmentOrders: {
        include: {
          supplier: {
            include: {
              locations: true,
            },
          },
          packages: true,
          items: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
      },
      rewardRedemptions: {
        include: {
          rewardRule: true,
        },
      },
      couponRedemption: {
        include: {
          coupon: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('الطلب غير موجود.');
  }

  // جلب إعدادات منطقة التوصيل لمعرفة حد الشحن المجاني والرسوم
  const shippingZone = order.shippingZoneNameSnapshot
    ? await prisma.shippingZone.findFirst({
        where: { nameAr: order.shippingZoneNameSnapshot },
      })
    : await prisma.shippingZone.findFirst({
        where: { isEnabled: true },
      });

  // التأكد من استخراج الـ Origin المناسب
  let resolvedOrigin = customOrigin;
  if (!resolvedOrigin) {
    try {
      const headerList = await headers();
      const host = headerList.get('x-forwarded-host') || headerList.get('host');
      const proto =
        headerList.get('x-forwarded-proto') ||
        (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : 'https');
      if (host) resolvedOrigin = `${proto}://${host}`;
    } catch {}
  }

  // تجهيز الفاتورة ورمز الأمان
  let invoice: any = (order as any).invoice;
  if (!invoice && ['CONFIRMED', 'PREPARING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status)) {
    invoice = await getOrCreateOrderInvoice(order.id);
  }

  const secureToken = invoice?.secureToken || order.reference;
  const customerWhatsApp = buildCustomerConfirmationWhatsAppMessage({
    customerName: order.customerName,
    orderReference: order.reference,
    totalAmountFils: order.totalAmount,
    secureToken,
    customerPhone: order.customerPhone,
    origin: resolvedOrigin,
  });

  return {
    order,
    invoice,
    customerWhatsApp,
    shippingZone,
  };
}

/**
 * الإجراء الرئيسي الذكي: تأكيد الطلب، إصدار الفاتورة الثابتة، بدء التجهيز، وتجهيز رسالة واتساب
 */
export async function confirmAndInitializeOrderAction(orderId: string, customOrigin?: string) {
  const session = await requirePermission('orders.confirm');

  // 1. تأكيد الطلب محاسبياً وتقسيم Outbox
  const confirmResult = await confirmStorefrontOrder(orderId);
  if (!confirmResult.success && confirmResult.error !== 'تم تأكيد الطلب أو نقله إلى مرحلة لاحقة مسبقاً') {
    return { success: false, error: confirmResult.error };
  }

  // 2. ضمان وجود الفاتورة ورمز الأمان الثابت
  const invoice = await getOrCreateOrderInvoice(orderId, session.employeeId);

  // 3. إعادة تحميل التفاصيل المحدثة
  const details = await getOrderFullDetailsAction(orderId, customOrigin);

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return {
    success: true,
    ...details,
  };
}

/**
 * توثيق إرسال رسالة واتساب للعميلة بواسطة الموظف
 */
export async function markCustomerWhatsAppSentAction(orderId: string) {
  await requirePermission('manage_orders');

  await prisma.order.update({
    where: { id: orderId },
    data: {
      customerWhatsAppSentAt: new Date(),
    },
  });

  revalidatePath('/admin/orders');
  return { success: true };
}

/**
 * توليد رابط جلسة مؤقت للمورد مع نص الرسالة مباشرة من شاشة الطلب
 */
export async function createSupplierSessionForOrderAction(
  supplierId: string,
  fulfillmentOrderId: string,
  customOrigin?: string
) {
  const session = await requirePermission('manage_orders');

  let resolvedBaseUrl = customOrigin;
  if (!resolvedBaseUrl) {
    try {
      const headerList = await headers();
      const host = headerList.get('x-forwarded-host') || headerList.get('host');
      const proto =
        headerList.get('x-forwarded-proto') ||
        (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : 'https');
      if (host) resolvedBaseUrl = `${proto}://${host}`;
    } catch {}
  }

  const result = await createSupplierAccessSession(supplierId, {
    assignedFulfillmentIds: [fulfillmentOrderId],
    employeeId: session.employeeId,
    expiresInHours: 72,
    baseUrl: resolvedBaseUrl,
  });

  return { success: true, ...result };
}

/**
 * تحديث سريع لبيانات التوصيل والمندوب من النافذة الجانبية
 */
export async function updateOrderDeliveryQuickSettingsAction(params: {
  orderId: string;
  captainId?: string;
  courierCompany?: string;
  fulfillmentStrategy?: string;
  deliveryNotes?: string;
}) {
  const session = await requirePermission('manage_orders');

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: params.orderId },
      select: { shippingCost: true },
    });

    if (params.fulfillmentStrategy || params.deliveryNotes) {
      await tx.order.update({
        where: { id: params.orderId },
        data: {
          ...(params.fulfillmentStrategy ? { fulfillmentStrategy: params.fulfillmentStrategy } : {}),
          ...(params.deliveryNotes ? { notes: params.deliveryNotes } : {}),
        },
      });
    }

    if (params.captainId) {
      // توافقية DeliveryAssignment
      await tx.deliveryAssignment.upsert({
        where: { orderId: params.orderId },
        create: {
          orderId: params.orderId,
          captainId: params.captainId,
          assignedByEmployeeId: session.employeeId,
          customerDeliveryFee: order?.shippingCost ?? 2000,
          captainEarning: 2000,
        },
        update: {
          captainId: params.captainId,
          assignedByEmployeeId: session.employeeId,
        },
      });

      // تحديث DeliveryJob
      await tx.deliveryJob.updateMany({
        where: { orderId: params.orderId },
        data: {
          status: 'ASSIGNED',
          collectedByCourier: params.courierCompany || 'مندوب رَواق',
        },
      });
    }
  });

  revalidatePath('/admin/orders');
  return { success: true };
}

/**
 * تسوية سريعة للنقد المحصل مع المحاسبة وتوريده لخزينة رَواق
 */
export async function quickSettleOrderCodAction(orderId: string) {
  const session = await requirePermission('manage_orders');

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { totalAmount: true, reference: true },
  });

  if (!order) {
    throw new Error('الطلب غير موجود.');
  }

  const result = await OrderLifecycleService.settleCourierCodToRawaq({
    orderId,
    employeeId: session.employeeId,
    amountFils: order.totalAmount,
    paymentMethod: 'CASH',
    idempotencyKey: `settle-cod-${orderId}-${Date.now()}`,
    reference: order.reference,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return result;
}

/**
 * استبعاد صنف ناقص تم الإبلاغ عنه من قِبل المورد وإعادة احتساب الإجمالي والفاتورة مع حماية استحقاق المكافآت والتوصيل المجاني
 */
export async function removeShortageOrderItemAction(
  orderId: string,
  orderItemId: string,
  reasonOrOptions?: string | { reason?: string; allowRewardBelowThreshold?: boolean }
) {
  const session = await requirePermission('manage_orders');

  let reason: string | undefined;
  let allowRewardBelowThreshold = false;

  if (typeof reasonOrOptions === 'string') {
    reason = reasonOrOptions;
  } else if (typeof reasonOrOptions === 'object' && reasonOrOptions !== null) {
    reason = reasonOrOptions.reason;
    allowRewardBelowThreshold = Boolean(reasonOrOptions.allowRewardBelowThreshold);
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      invoice: true,
      rewardRedemptions: {
        include: {
          rewardRule: true,
        },
      },
      couponRedemption: {
        include: {
          coupon: true,
        },
      },
      fulfillmentOrders: {
        include: {
          items: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('الطلب غير موجود.');
  }

  const targetItem = order.items.find((it) => it.id === orderItemId);
  if (!targetItem) {
    throw new Error('الصنف غير موجود بالطلب.');
  }
  if (targetItem.isRemoved) {
    throw new Error('تم حذف هذا الصنف مسبقاً.');
  }

  // حساب المجموع الجديد للأصناف المتبقية
  const activeItems = order.items.filter((it) => it.id !== orderItemId && !it.isRemoved);
  if (activeItems.length === 0) {
    throw new Error('لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.');
  }

  const newItemsTotal = activeItems.reduce((sum, it) => sum + it.total, 0);

  // جلب إعدادات منطقة التوصيل وقواعد المكافآت الفعالة لتقييم الحد الأدنى وسد الثغرة المالية
  const [shippingZone, activeRewardRules] = await Promise.all([
    order.shippingZoneNameSnapshot
      ? prisma.shippingZone.findFirst({
          where: { nameAr: order.shippingZoneNameSnapshot },
        })
      : prisma.shippingZone.findFirst({ where: { isEnabled: true } }),
    prisma.rewardRule.findMany({ where: { isActive: true } }),
  ]);

  // فحص استحقاق المكافآت والتوصيل المجاني ومنع الثغرة المالية
  const rewardEval = evaluateOrderRewardProtection({
    order: order as any,
    newItemsTotal,
    shippingZone,
    activeRewardRules,
    allowRewardBelowThreshold,
  });

  const previousTotal = order.previousTotalAmount || order.totalAmount;
  const removalExplanation = reason || targetItem.removalReason || 'غير متوفر لدى المورد';

  await prisma.$transaction(async (tx) => {
    // 1. وسم الصنف بأنه محذوف
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        isRemoved: true,
        removalReason: removalExplanation,
      },
    });

    // 2. تحديث FulfillmentItem المقابل إن وجد
    await tx.fulfillmentItem.updateMany({
      where: { orderItemId },
      data: {
        isOutOfStock: true,
        outOfStockQuantity: targetItem.quantity,
        outOfStockReason: removalExplanation,
      },
    });

    // 2.1. إبطال المكافآت أو الكوبونات الملغاة لعدم استيفاء الحد الأدنى
    if (rewardEval.voidRewardRedemptionIds.length > 0) {
      await tx.rewardRedemption.updateMany({
        where: { id: { in: rewardEval.voidRewardRedemptionIds } },
        data: { isVoided: true },
      });
    }
    for (const ruleId of rewardEval.decrementRewardRuleIds) {
      await tx.rewardRule.updateMany({
        where: { id: ruleId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    }
    if (rewardEval.voidCouponRedemptionId) {
      await tx.couponRedemption.update({
        where: { id: rewardEval.voidCouponRedemptionId },
        data: { isVoided: true },
      });
    }
    if (rewardEval.decrementCouponId) {
      await tx.coupon.updateMany({
        where: { id: rewardEval.decrementCouponId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    }

    // 3. تحديث الطلب بالمجاميع والرسوم الجديدة وملاحظات التعديل
    const noteText = reason?.trim() ? ` (ملاحظة: ${reason.trim()})` : '';
    let removalAdjustmentLine = `تم استبعاد صنف (${targetItem.name}) لعدم توفره لدى المحل${noteText} - الإجمالي السابق: ${filsToDisplay(previousTotal)} - الإجمالي الجديد: ${filsToDisplay(rewardEval.newGrossTotal)}.`;
    if (rewardEval.adjustmentNote) {
      removalAdjustmentLine += `\n${rewardEval.adjustmentNote}`;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        hasAdjustment: true,
        previousTotalAmount: previousTotal,
        totalAmount: Math.max(0, rewardEval.newGrossTotal),
        shippingCost: rewardEval.newShippingCost,
        discountAmount: rewardEval.newDiscountAmount,
        rewardDiscount: rewardEval.newRewardDiscount,
        couponDiscount: rewardEval.newCouponDiscount,
        adjustmentNotes: order.adjustmentNotes
          ? `${order.adjustmentNotes}\n${removalAdjustmentLine}`
          : removalAdjustmentLine,
      },
    });

    // 4. تحديث الفاتورة إن وجدت بكافة المجاميع ورسوم التوصيل والخصومات
    if (order.invoice) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: {
          grossTotalFils: Math.max(0, rewardEval.newGrossTotal),
          netSubtotalFils: Math.max(0, newItemsTotal),
          shippingAmountFils: rewardEval.newShippingCost,
          discountAmountFils: rewardEval.newDiscountAmount,
        },
      });
    }

    // 4.1. تحديث سجل البيع Sale إن وجد
    await tx.sale.updateMany({
      where: { reference: `SALE-ORD-${order.reference}` },
      data: {
        subtotal: Math.max(0, newItemsTotal),
        discount: rewardEval.newDiscountAmount,
        total: Math.max(0, rewardEval.newGrossTotal),
      },
    });

    // 4.2. تسجيل حركة إيراد التوصيل DELIVERY_REVENUE إذا كان التوصيل سابقاً مجانياً والآن تم احتساب رسومه
    if (rewardEval.newShippingCost > 0 && order.shippingCost === 0) {
      const origDeliveryRev = await tx.financialTransaction.findFirst({
        where: { orderId, type: 'DELIVERY_REVENUE' },
      });
      if (!origDeliveryRev) {
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `removal:delivery-rev:${orderId}`,
            type: 'DELIVERY_REVENUE',
            direction: 'IN',
            amount: rewardEval.newShippingCost,
            orderId,
            description: `إيراد رسوم التوصيل بعد إلغاء التوصيل المجاني للطلب ${order.reference}`,
            createdByEmployeeId: session.employeeId,
          },
        });
      }
    }

    // 4.3. عكس استحقاق المحل للصنف الملغي فقط (SUPPLIER_OBLIGATION_REVERSAL)
    const itemSupplierDue =
      (targetItem.unitCostSnapshot ?? 0) * targetItem.quantity +
      (targetItem.supplierAmountSnapshot ?? 0);

    if (targetItem.supplierIdSnapshot && itemSupplierDue > 0) {
      const origObligation = await tx.financialTransaction.findFirst({
        where: {
          orderId,
          supplierId: targetItem.supplierIdSnapshot,
          type: 'SUPPLIER_OBLIGATION',
        },
      });

      if (origObligation) {
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `removal:supplier-rev:${orderId}:${orderItemId}`,
            type: 'SUPPLIER_OBLIGATION_REVERSAL',
            direction: 'IN',
            amount: itemSupplierDue,
            orderId,
            supplierId: targetItem.supplierIdSnapshot,
            description: `عكس استحقاق المحل لاستبعاد صنف (${targetItem.name}) من الطلب ${order.reference}`,
            createdByEmployeeId: session.employeeId,
          },
        });
      }
    }

    // 5. تحديث كشف التسليم DeliveryJob مع مراعاة الدفع المسبق
    const isPrepaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
    const newCodToCollect = isPrepaid ? 0 : Math.max(0, rewardEval.newGrossTotal);
    await tx.deliveryJob.updateMany({
      where: { orderId },
      data: {
        codAmountToCollect: newCodToCollect,
      },
    });

    // 6. تسجيل في سجل الحالات
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        notes: `تعديل الطلب: تم استبعاد صنف (${targetItem.name}) - السبب: ${removalExplanation} - الإجمالي الجديد: ${filsToDisplay(rewardEval.newGrossTotal)}${rewardEval.historyNote ? ` - ${rewardEval.historyNote}` : ''}`,
      },
    });

    // 7. تحديث حالة أمر التجهيز المرتبط بالمحل
    for (const f of order.fulfillmentOrders) {
      const fItem = f.items.find((fi) => fi.orderItemId === orderItemId);
      if (fItem) {
        const remainingActiveItems = f.items.filter((fi) => fi.id !== fItem.id && !fi.isOutOfStock);
        if (remainingActiveItems.length === 0) {
          await tx.fulfillmentOrder.update({
            where: { id: f.id },
            data: {
              status: 'CANCELLED',
              issueReason: 'تم استبعاد كافة أصناف هذا المحل لعدم توفرها.',
            },
          });
        } else {
          const allPrepared = remainingActiveItems.every((fi) => fi.preparedQuantity >= fi.quantity);
          await tx.fulfillmentOrder.update({
            where: { id: f.id },
            data: {
              status: allPrepared ? 'READY_FOR_PICKUP' : 'IN_PREPARATION',
              issueReason: null,
            },
          });
        }
      }
    }
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/invoice/view/${order.invoice?.secureToken || order.reference}`);

  return {
    success: true,
    previousTotal,
    newTotal: rewardEval.newGrossTotal,
    removedItemName: targetItem.name,
    rewardStatus: rewardEval.rewardStatus,
    hasViolatedThreshold: rewardEval.hasViolatedThreshold,
    restoredShippingFee: rewardEval.newShippingCost,
    adjustmentNote: rewardEval.adjustmentNote,
  };
}

/**
 * استبدال صنف ناقص بصنف بديل من الكتالوج وإعادة احتساب الإجمالي والفاتورة مع حماية استحقاق المكافآت والتوصيل المجاني
 */
export async function replaceShortageOrderItemAction(
  orderId: string,
  orderItemId: string,
  replacementVariantId: string,
  replacementQty: number = 1,
  reasonOrOptions?: string | { reason?: string; allowRewardBelowThreshold?: boolean }
) {
  await requirePermission('manage_orders');

  let reason: string | undefined;
  let allowRewardBelowThreshold = false;

  if (typeof reasonOrOptions === 'string') {
    reason = reasonOrOptions;
  } else if (typeof reasonOrOptions === 'object' && reasonOrOptions !== null) {
    reason = reasonOrOptions.reason;
    allowRewardBelowThreshold = Boolean(reasonOrOptions.allowRewardBelowThreshold);
  }

  const [order, variant] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoice: true,
        rewardRedemptions: {
          include: {
            rewardRule: true,
          },
        },
        couponRedemption: {
          include: {
            coupon: true,
          },
        },
        fulfillmentOrders: {
          include: { items: true },
        },
      },
    }),
    prisma.productVariant.findUnique({
      where: { id: replacementVariantId },
      include: {
        product: true,
        supplierOffers: {
          where: { isActive: true },
          include: {
            supplier: {
              include: {
                locations: true,
              },
            },
          },
          take: 1,
        },
      },
    }),
  ]);

  if (!order) throw new Error('الطلب غير موجود.');
  if (order.status === 'CANCELLED') throw new Error('لا يمكن استبدال صنف في طلب ملغي.');
  if (order.status === 'DELIVERED') throw new Error('لا يمكن استبدال صنف في طلب تم تسليمه.');
  if (!variant) throw new Error('المنتج البديل غير موجود.');

  const targetItem = order.items.find((it) => it.id === orderItemId);
  if (!targetItem) throw new Error('الصنف المراد استبداله غير موجود.');
  if (targetItem.isRemoved) throw new Error('تم حذف هذا الصنف مسبقاً.');

  const unitPrice = variant.price;
  const itemTotal = unitPrice * replacementQty;

  const previousTotal = order.previousTotalAmount || order.totalAmount;
  const otherItems = order.items.filter((it) => it.id !== orderItemId && !it.isRemoved);
  const newItemsTotal = otherItems.reduce((sum, it) => sum + it.total, 0) + itemTotal;

  // جلب إعدادات منطقة التوصيل وقواعد المكافآت لتقييم الأمان المالي
  const [shippingZone, activeRewardRules] = await Promise.all([
    order.shippingZoneNameSnapshot
      ? prisma.shippingZone.findFirst({
          where: { nameAr: order.shippingZoneNameSnapshot },
        })
      : prisma.shippingZone.findFirst({ where: { isEnabled: true } }),
    prisma.rewardRule.findMany({ where: { isActive: true } }),
  ]);

  const rewardEval = evaluateOrderRewardProtection({
    order: order as any,
    newItemsTotal,
    shippingZone,
    activeRewardRules,
    allowRewardBelowThreshold,
  });

  const offer = variant.supplierOffers[0];
  const userNote = reason?.trim() ? ` (ملاحظة: ${reason.trim()})` : '';

  await prisma.$transaction(async (tx) => {
    // 1. وسم الصنف القديم بأنه محذوف ومستبدل
    await tx.orderItem.update({
      where: { id: orderItemId },
      data: {
        isRemoved: true,
        removalReason: `تم استبداله بالصنف البديل: ${variant.product.nameAr}${variant.size ? ` (${variant.size})` : ''}${userNote}`,
      },
    });

    // 2. تحديث أصناف التجهيز القديمة
    await tx.fulfillmentItem.updateMany({
      where: { orderItemId },
      data: {
        isOutOfStock: true,
        outOfStockQuantity: targetItem.quantity,
        outOfStockReason: `تم استبداله بالصنف البديل: ${variant.product.nameAr}`,
      },
    });

    // 3. تحديث حالة أوامر التجهيز القديمة للمحل السابق
    for (const f of order.fulfillmentOrders) {
      const fItem = f.items.find((fi) => fi.orderItemId === orderItemId);
      if (fItem) {
        const remainingActiveItems = f.items.filter((fi) => fi.id !== fItem.id && !fi.isOutOfStock);
        const isSameSupplier = offer?.supplierId && offer.supplierId === f.supplierId;

        if (remainingActiveItems.length === 0 && !isSameSupplier) {
          await tx.fulfillmentOrder.update({
            where: { id: f.id },
            data: {
              status: 'CANCELLED',
              issueReason: 'تم استبدال صنف المحل بصنف من محل آخر.',
            },
          });
        } else if (remainingActiveItems.length > 0) {
          const allPrepared = remainingActiveItems.every((fi) => fi.preparedQuantity >= fi.quantity);
          await tx.fulfillmentOrder.update({
            where: { id: f.id },
            data: {
              status: allPrepared ? 'READY_FOR_PICKUP' : 'IN_PREPARATION',
              issueReason: null,
            },
          });
        }
      }
    }

    // 4. إنشاء الصنف الجديد بالطلب
    const newOrderItem = await tx.orderItem.create({
      data: {
        orderId,
        productId: variant.productId,
        variantId: variant.id,
        sku: variant.sku,
        name: variant.product.nameAr,
        size: variant.size || variant.name || 'افتراضي',
        quantity: replacementQty,
        unitPrice,
        total: itemTotal,
        supplierIdSnapshot: offer?.supplierId,
        supplierOfferIdSnapshot: offer?.id,
        unitCostSnapshot: offer?.unitCost,
      },
    });

    // 5. ربط الصنف الجديد بأمر تجهيز المحل الصحيح (إن كان الطلب قد بدأ مرحلة التجهيز)
    if (order.fulfillmentOrders && order.fulfillmentOrders.length > 0 && offer?.supplierId) {
      const supplier = offer.supplier;
      let location: any = supplier.locations?.[0];
      if (!location) {
        location = await tx.supplierLocation.findFirst({
          where: { supplierId: offer.supplierId },
        });
      }
      if (location) {
        const targetFO = await tx.fulfillmentOrder.upsert({
          where: {
            orderId_supplierId_locationId: {
              orderId,
              supplierId: offer.supplierId,
              locationId: location.id,
            },
          },
          create: {
            orderId,
            supplierId: offer.supplierId,
            locationId: location.id,
            supplierNameSnapshot: supplier.name,
            pickupAddressSnapshot: location.addressDetails || supplier.address || 'المقر الرئيسي',
            contactPhoneSnapshot: supplier.phone || '',
            status: 'IN_PREPARATION',
            packagesCount: 1,
            internalAdminNotes: `أمر تجهيز محدث - استبدال صنف للطلب #${order.reference}`,
          },
          update: {
            status: 'IN_PREPARATION',
            issueReason: null,
          },
        });

        await tx.fulfillmentItem.create({
          data: {
            fulfillmentOrderId: targetFO.id,
            orderItemId: newOrderItem.id,
            productId: variant.productId,
            variantId: variant.id,
            productTitle: variant.product.nameAr,
            variantTitle: variant.size || variant.name || 'افتراضي',
            sku: variant.sku,
            quantity: replacementQty,
            preparedQuantity: 0,
            isOutOfStock: false,
          },
        });
      }
    }

    // 5.1. إبطال المكافآت أو الكوبونات إذا تم إلغاؤها لعدم استيفاء الحد الأدنى
    if (rewardEval.voidRewardRedemptionIds.length > 0) {
      await tx.rewardRedemption.updateMany({
        where: { id: { in: rewardEval.voidRewardRedemptionIds } },
        data: { isVoided: true },
      });
    }
    for (const ruleId of rewardEval.decrementRewardRuleIds) {
      await tx.rewardRule.updateMany({
        where: { id: ruleId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    }
    if (rewardEval.voidCouponRedemptionId) {
      await tx.couponRedemption.update({
        where: { id: rewardEval.voidCouponRedemptionId },
        data: { isVoided: true },
      });
    }
    if (rewardEval.decrementCouponId) {
      await tx.coupon.updateMany({
        where: { id: rewardEval.decrementCouponId, usageCount: { gt: 0 } },
        data: { usageCount: { decrement: 1 } },
      });
    }

    // 6. تحديث بيانات الطلب والإجمالي والملاحظات ورسوم التوصيل والخصومات
    let adjustmentLine = `تم استبدال (${targetItem.name}) بالصنف (${variant.product.nameAr}${variant.size ? ` - ${variant.size}` : ''})${userNote} - الإجمالي السابق: ${filsToDisplay(previousTotal)} - الإجمالي الجديد: ${filsToDisplay(rewardEval.newGrossTotal)}.`;
    if (rewardEval.adjustmentNote) {
      adjustmentLine += `\n${rewardEval.adjustmentNote}`;
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        hasAdjustment: true,
        previousTotalAmount: previousTotal,
        totalAmount: Math.max(0, rewardEval.newGrossTotal),
        shippingCost: rewardEval.newShippingCost,
        discountAmount: rewardEval.newDiscountAmount,
        rewardDiscount: rewardEval.newRewardDiscount,
        couponDiscount: rewardEval.newCouponDiscount,
        adjustmentNotes: order.adjustmentNotes
          ? `${order.adjustmentNotes}\n${adjustmentLine}`
          : adjustmentLine,
      },
    });

    // 7. تحديث الفاتورة
    if (order.invoice) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: {
          grossTotalFils: Math.max(0, rewardEval.newGrossTotal),
          netSubtotalFils: Math.max(0, newItemsTotal),
          shippingAmountFils: rewardEval.newShippingCost,
          discountAmountFils: rewardEval.newDiscountAmount,
        },
      });
    }

    // 7.1. تحديث سجل البيع Sale إن وجد
    await tx.sale.updateMany({
      where: { reference: `SALE-ORD-${order.reference}` },
      data: {
        subtotal: Math.max(0, newItemsTotal),
        discount: rewardEval.newDiscountAmount,
        total: Math.max(0, rewardEval.newGrossTotal),
      },
    });

    // 7.2. تسجيل حركة إيراد التوصيل DELIVERY_REVENUE إذا كان التوصيل سابقاً مجانياً والآن تم احتساب رسومه
    if (rewardEval.newShippingCost > 0 && order.shippingCost === 0) {
      const origDeliveryRev = await tx.financialTransaction.findFirst({
        where: { orderId, type: 'DELIVERY_REVENUE' },
      });
      if (!origDeliveryRev) {
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `replace:delivery-rev:${orderId}`,
            type: 'DELIVERY_REVENUE',
            direction: 'IN',
            amount: rewardEval.newShippingCost,
            orderId,
            description: `إيراد رسوم التوصيل بعد إلغاء التوصيل المجاني للطلب ${order.reference}`,
            createdByEmployeeId: (await requireAuth()).employeeId,
          },
        });
      }
    }

    // 8. تحديث كشف التسليم COD مع مراعاة الدفع المسبق
    const isPrepaidRepl = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
    await tx.deliveryJob.updateMany({
      where: { orderId },
      data: {
        codAmountToCollect: isPrepaidRepl ? 0 : Math.max(0, rewardEval.newGrossTotal),
      },
    });

    // 9. تسجيل الحركة في سجل الحالات
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        notes: `استبدال صنف: (${targetItem.name}) -> (${variant.product.nameAr}) - الإجمالي الجديد: ${filsToDisplay(rewardEval.newGrossTotal)}${rewardEval.historyNote ? ` - ${rewardEval.historyNote}` : ''}`,
      },
    });
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/shops');
  revalidatePath(`/invoice/view/${order.invoice?.secureToken || order.reference}`);

  return {
    success: true,
    previousTotal,
    newTotal: rewardEval.newGrossTotal,
    replacedWith: variant.product.nameAr,
    rewardStatus: rewardEval.rewardStatus,
    hasViolatedThreshold: rewardEval.hasViolatedThreshold,
    restoredShippingFee: rewardEval.newShippingCost,
    adjustmentNote: rewardEval.adjustmentNote,
  };
}

/**
 * إضافة منتج جديد للطلب/الفاتورة مع ملاحظة تعديل اختيارية وإعادة احتساب الحسابات
 */
export async function addOrderItemAction(params: {
  orderId: string;
  variantId: string;
  quantity?: number;
  customUnitPriceFils?: number;
  adjustmentNote?: string;
}) {
  await requirePermission('manage_orders');

  const { orderId, variantId, quantity = 1, customUnitPriceFils, adjustmentNote } = params;

  if (quantity < 1) throw new Error('الكمية يجب أن تكون 1 على الأقل.');

  const [order, variant] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        invoice: true,
        fulfillmentOrders: {
          include: { items: true },
        },
      },
    }),
    prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: true,
        supplierOffers: {
          where: { isActive: true },
          include: {
            supplier: {
              include: {
                locations: true,
              },
            },
          },
          take: 1,
        },
      },
    }),
  ]);

  if (!order) throw new Error('الطلب غير موجود.');
  if (order.status === 'CANCELLED') throw new Error('لا يمكن إضافة منتجات لطلب ملغي.');
  if (order.status === 'DELIVERED') throw new Error('لا يمكن إضافة منتجات لطلب تم تسليمه.');
  if (!variant) throw new Error('المنتج المختار غير موجود.');

  const unitPrice =
    customUnitPriceFils !== undefined && customUnitPriceFils >= 0
      ? customUnitPriceFils
      : variant.price;
  const itemTotal = unitPrice * quantity;

  const previousTotal = order.previousTotalAmount || order.totalAmount;
  const activeItems = order.items.filter((it) => !it.isRemoved);
  const newItemsTotal = activeItems.reduce((sum, it) => sum + it.total, 0) + itemTotal;
  const newGrossTotal = newItemsTotal + order.shippingCost - (order.discountAmount || 0);

  const offer = variant.supplierOffers[0];

  await prisma.$transaction(async (tx) => {
    // 1. إنشاء الصنف الجديد
    const newOrderItem = await tx.orderItem.create({
      data: {
        orderId,
        productId: variant.productId,
        variantId: variant.id,
        sku: variant.sku,
        name: variant.product.nameAr,
        size: variant.size || variant.name || 'افتراضي',
        quantity,
        unitPrice,
        total: itemTotal,
        supplierIdSnapshot: offer?.supplierId,
        supplierOfferIdSnapshot: offer?.id,
        unitCostSnapshot: offer?.unitCost,
      },
    });

    // 2. ربط الصنف بأمر تجهيز المحل إذا كان الطلب في مرحلة التجهيز
    if (order.fulfillmentOrders && order.fulfillmentOrders.length > 0 && offer?.supplierId) {
      const supplier = offer.supplier;
      let location: any = supplier.locations?.[0];
      if (!location) {
        location = await tx.supplierLocation.findFirst({
          where: { supplierId: offer.supplierId },
        });
      }
      if (location) {
        const targetFO = await tx.fulfillmentOrder.upsert({
          where: {
            orderId_supplierId_locationId: {
              orderId,
              supplierId: offer.supplierId,
              locationId: location.id,
            },
          },
          create: {
            orderId,
            supplierId: offer.supplierId,
            locationId: location.id,
            supplierNameSnapshot: supplier.name,
            pickupAddressSnapshot: location.addressDetails || supplier.address || 'المقر الرئيسي',
            contactPhoneSnapshot: supplier.phone || '',
            status: 'IN_PREPARATION',
            packagesCount: 1,
            internalAdminNotes: `أمر تجهيز محدث - إضافة صنف جديد للطلب #${order.reference}`,
          },
          update: {
            status: 'IN_PREPARATION',
            issueReason: null,
          },
        });

        await tx.fulfillmentItem.create({
          data: {
            fulfillmentOrderId: targetFO.id,
            orderItemId: newOrderItem.id,
            productId: variant.productId,
            variantId: variant.id,
            productTitle: variant.product.nameAr,
            variantTitle: variant.size || variant.name || 'افتراضي',
            sku: variant.sku,
            quantity,
            preparedQuantity: 0,
            isOutOfStock: false,
          },
        });
      }
    }

    // 3. صياغة وتحديث ملاحظة التعديل على الطلب
    const noteText = adjustmentNote?.trim()
      ? ` (ملاحظة: ${adjustmentNote.trim()})`
      : '';
    const newAdjustmentLine = `تمت إضافة (${variant.product.nameAr}${variant.size ? ` - ${variant.size}` : ''} × ${quantity})${noteText} - الإجمالي السابق: ${filsToDisplay(previousTotal)} - الإجمالي الجديد: ${filsToDisplay(newGrossTotal)}.`;

    await tx.order.update({
      where: { id: orderId },
      data: {
        hasAdjustment: true,
        previousTotalAmount: previousTotal,
        totalAmount: Math.max(0, newGrossTotal),
        adjustmentNotes: order.adjustmentNotes
          ? `${order.adjustmentNotes}\n${newAdjustmentLine}`
          : newAdjustmentLine,
      },
    });

    // 4. تحديث الفاتورة إن وجدت
    if (order.invoice) {
      await tx.invoice.update({
        where: { id: order.invoice.id },
        data: {
          grossTotalFils: Math.max(0, newGrossTotal),
          netSubtotalFils: Math.max(0, newItemsTotal),
        },
      });
    }

    // 5. تحديث DeliveryJob (مبلغ التحصيل COD)
    await tx.deliveryJob.updateMany({
      where: { orderId },
      data: {
        codAmountToCollect: Math.max(0, newGrossTotal),
      },
    });

    // 6. تسجيل في سجل الحالات
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: order.status,
        notes: `إضافة منتج للطلب: ${variant.product.nameAr} (${quantity} قطع) - الإجمالي الجديد: ${filsToDisplay(newGrossTotal)}`,
      },
    });
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/shops');
  revalidatePath(`/invoice/view/${order.invoice?.secureToken || order.reference}`);

  return {
    success: true,
    previousTotal,
    newTotal: newGrossTotal,
    addedProduct: variant.product.nameAr,
  };
}

/**
 * البحث في الكتالوج عن منتجات لإضافتها للطلب أو استبدالها (دون إظهار أي SKU)
 */
export async function searchProductsForCatalogAction(query: string) {
  if (!query || query.trim().length < 2) return [];

  const products = await prisma.product.findMany({
    where: {
      isVisible: true,
      OR: [
        { nameAr: { contains: query.trim(), mode: 'insensitive' } },
        { nameEn: { contains: query.trim(), mode: 'insensitive' } },
        { sku: { contains: query.trim(), mode: 'insensitive' } },
      ],
    },
    take: 12,
    include: {
      variants: {
        include: {
          supplierOffers: {
            where: { isActive: true },
            include: {
              supplier: {
                select: { name: true },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  return products.flatMap((p) =>
    p.variants.map((v) => ({
      variantId: v.id,
      productId: p.id,
      productName: p.nameAr,
      variantTitle: v.size || v.name || 'افتراضي',
      price: v.price,
      supplierName: v.supplierOffers[0]?.supplier?.name || 'مخزن رَواق',
    }))
  );
}

// للتوافق العكسي
export const searchProductsForReplacementAction = searchProductsForCatalogAction;

/**
 * إلغاء الطلب كاملاً من مركز الطلبات الموحد وعكس آثاره المالية واللوجستية
 */
export async function cancelUnifiedOrderAction(orderId: string, reason?: string) {
  const session = await requireAuth();

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryJob: true,
        fulfillmentOrders: true,
      },
    });

    if (!order) {
      throw new Error('الطلب غير موجود.');
    }

    if (order.status === 'CANCELLED') {
      throw new Error('الطلب ملغي مسبقاً.');
    }

    if (['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new Error('لا يمكن إلغاء طلب تم تسليمه للعميل أو اكتماله.');
    }

    // 1. عكس العمليات المالية للطلب عبر المعاملة المركزية
    await cancelOrderAndReverseFinancials(orderId, session.employeeId, true);

    // 2. تحديث الحالات اللوجستية للمرحلة الثانية
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          fulfillmentStatus: 'CANCELLED',
          adjustmentNotes: reason
            ? `${order.adjustmentNotes ? order.adjustmentNotes + '\n' : ''}سبب الإلغاء: ${reason}`
            : order.adjustmentNotes,
        },
      });

      // إلغاء أوامر التجهيز المسندة للمحلات
      await tx.fulfillmentOrder.updateMany({
        where: {
          orderId,
          status: { notIn: ['DELIVERED', 'CANCELLED'] },
        },
        data: {
          status: 'CANCELLED',
          issueReason: reason || 'تم إلغاء الطلب بالكامل من قِبل الإدارة.',
        },
      });

      // إلغاء مهمة التوصيل
      if (order.deliveryJob) {
        await tx.deliveryJob.update({
          where: { id: order.deliveryJob.id },
          data: {
            status: 'CANCELLED',
          },
        });
      }

      await tx.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'ORDER_CANCELLED_UNIFIED',
          entityType: 'Order',
          entityId: orderId,
          details: JSON.stringify({
            reference: order.reference,
            reason: reason || 'إلغاء الطلب كاملاً',
          }),
        },
      });
    });

    revalidatePath('/admin/orders');
    return { success: true, message: 'تم إلغاء الطلب بنجاح.' };
  } catch (error: any) {
    return { success: false, error: error.message || 'تعذر إلغاء الطلب.' };
  }
}
