'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';

export interface OrderAuditTimelineEvent {
  id: string;
  action: string;
  actionTitle: string;
  timestamp: string;
  actorName: string;
  actorType: string;
  outcome: string;
  severity: string;
  category: string;
  summary: string;
  details?: any;
  changes?: any;
  reason?: string | null;
}

const ACTION_TITLES_AR: Record<string, string> = {
  ORDER_CREATED: 'إنشاء الطلب من المتجر الإلكتروني',
  ORDER_CONFIRMED: 'تأكيد واعتماد الطلب من الإدارة',
  ORDER_CANCELLED: 'إلغاء الطلب والتسويات العكسية',
  ORDER_ITEM_ADJUSTED: 'تعديل أو استبدال صنف في الطلب',
  ORDER_ITEM_ADDED: 'إضافة صنف جديد للطلب',
  ORDER_STATUS_UPDATED: 'تحديث مسار حالة الطلب',
  UPDATE_ORDER_STATUS: 'تحديث حالة الطلب',
  INVOICE_ISSUED: 'إصدار الفاتورة الإلكترونية المعتمدة',
  INVOICE_CORRECTION_ISSUED: 'إصدار تصحيح للفاتورة',
  SUPPLIER_ACCESS_ISSUED: 'إصدار رابط بوابة التجهيز للمحل',
  SUPPLIER_ORDER_READY: 'تأكيد جاهزية وتغليف الطرد من المحل',
  SUPPLIER_ITEM_SHORTAGE_REPORTED: 'إبلاغ المحل عن نقص بالصنف',
  PACKAGE_PICKUP_VERIFIED: 'استلام طرد الطلب من المحل بواسطة الناقل',
  DELIVERY_ASSIGNED: 'تعيين مندوب / شركة التوصيل',
  DELIVERY_BATCH_CREATED: 'ضم الطلب إلى كشف تسليم شركة التوصيل',
  DELIVERY_CONFIRMED: 'تسليم الطلب بنجاح للزبونة',
  DELIVERY_FAILED: 'تعثر أو فشل تسليم الطلب',
  COD_COLLECTED: 'إثبات تحصيل مبلغ الطلب عند الاستلام',
  COD_REMITTANCE_RECORDED: 'توريد وقيد نقدية الطلب في خزينة رَواق',
  TELEGRAM_NOTIFICATION_SENT: 'إرسال إشعار تيليجرام للطلب',
  TELEGRAM_NOTIFICATION_RETRY: 'إعادة إرسال إشعار تيليجرام',
  WHATSAPP_CONFIRMATION_SENT: 'إرسال تأكيد الفاتورة للزبونة عبر واتساب',
};

/**
 * جلب التسلسل الزمني الكامل لدورة حياة الطلب (Order Lifecycle Chronology)
 */
export async function getOrderAuditTimelineAction(orderIdOrRef: string) {
  await requirePermission('orders.view');

  const cleanQuery = orderIdOrRef.trim().replace(/^#/, '');

  // 1. البحث عن الطلب بالمعرّف أو المرجع
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: cleanQuery },
        { reference: cleanQuery },
        { reference: `#${cleanQuery}` },
      ],
    },
    include: {
      items: true,
      deliveryJob: true,
      deliveryAssignment: { include: { captain: { select: { name: true } } } },
      invoice: true,
      fulfillmentOrders: {
        include: {
          supplier: { select: { name: true, phone: true } },
          packages: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    return { success: false, error: 'الطلب المطلوب غير موجود' };
  }

  // 2. جلب كافة سجلات التدقيق المرتبطة بالطلب أو مرجعه أو فواتيره
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityId: order.id },
        { entityId: order.reference },
        { correlationId: order.reference },
        { correlationId: order.id },
      ],
    },
    include: {
      employee: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 3. بناء خط زمني موحد يجمع أحداث التدقيق مع سجل الحالات
  const events: OrderAuditTimelineEvent[] = [];

  // أ. حدث إنشاء الطلب الأساسي
  events.push({
    id: `creation-${order.id}`,
    action: 'ORDER_CREATED',
    actionTitle: '1. إنشاء الطلب عبر المتجر الإلكتروني',
    timestamp: order.createdAt.toISOString(),
    actorName: order.customerName || 'الزبونة (Checkout)',
    actorType: 'CUSTOMER',
    outcome: 'SUCCESS',
    severity: 'NORMAL',
    category: 'ORDERS',
    summary: `أكملت العميلة عملية الشراء بقيمة ${((order.totalAmount || 0) / 1000).toFixed(3)} د.أ (${order.items.length} أصناف).`,
    details: {
      items: order.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.unitPrice })),
      totalAmount: order.totalAmount,
      shippingZone: order.shippingZoneNameSnapshot,
    },
  });

  // ب. أحداث سجل التدقيق المسجلة
  for (const log of auditLogs) {
    if (log.action === 'ORDER_CREATED') continue; // تم إضافته أولاً

    let parsedDetails: any = null;
    let parsedChanges: any = null;
    if (log.details) {
      try { parsedDetails = JSON.parse(log.details); } catch { parsedDetails = log.details; }
    }
    if (log.changes) {
      try { parsedChanges = JSON.parse(log.changes); } catch { parsedChanges = log.changes; }
    }

    const title = ACTION_TITLES_AR[log.action] || log.action;
    const actor = log.actorNameSnapshot || log.employee?.name || (log.actorType === 'ADMIN' ? 'موظف الإدارة' : log.actorType === 'SUPPLIER' ? 'المحل الشريك' : 'النظام الآلي');

    events.push({
      id: log.id,
      action: log.action,
      actionTitle: title,
      timestamp: log.createdAt.toISOString(),
      actorName: actor,
      actorType: log.actorType || 'SYSTEM',
      outcome: log.outcome || 'SUCCESS',
      severity: log.severity || 'NORMAL',
      category: log.category || 'ORDERS',
      summary: log.reason ? `السبب: ${log.reason}` : (parsedDetails?.reference ? `مرجع: ${parsedDetails.reference}` : title),
      details: parsedDetails,
      changes: parsedChanges,
      reason: log.reason,
    });
  }

  // ج. أحداث حالة الطلب التاريخية (إذا لم تكن ممثلة في سجلات التدقيق)
  for (const h of order.statusHistory) {
    const isAlreadyCovered = events.some(
      e => Math.abs(new Date(e.timestamp).getTime() - new Date(h.createdAt).getTime()) < 3000 &&
           (e.action.includes(h.status) || (e.changes?.status?.after === h.status))
    );
    if (!isAlreadyCovered && h.status !== 'PENDING') {
      events.push({
        id: h.id,
        action: `STATUS_${h.status}`,
        actionTitle: `تحديث الحالة إلى: ${h.status}`,
        timestamp: h.createdAt.toISOString(),
        actorName: 'نظام رَواق',
        actorType: 'SYSTEM',
        outcome: 'SUCCESS',
        severity: 'NORMAL',
        category: 'ORDERS',
        summary: h.notes || `تغيرت حالة الطلب إلى ${h.status}`,
      });
    }
  }

  // د. فرز الأحداث تصاعدياً بالوقت
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return {
    success: true,
    order: {
      id: order.id,
      reference: order.reference,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus,
      totalAmountFils: order.totalAmount,
      itemsCount: order.items.length,
      createdAt: order.createdAt.toISOString(),
      invoice: order.invoice ? {
        id: order.invoice.id,
        invoiceNumber: order.invoice.number,
        secureToken: order.invoice.secureToken,
      } : null,
    },
    events,
  };
}
