'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { headers } from 'next/headers';
import {
  createSupplierAccessSession,
  verifyCourierPackagePickup,
} from '@/lib/fulfillment/supplier-session';
import {
  generateDeliveryManifest,
  createPickupBatchForSupplier,
} from '@/lib/fulfillment/delivery-manifest';
import { executeOrderFulfillmentSplit } from '@/lib/fulfillment/order-splitter';
import { OrderLifecycleService } from '@/lib/orders/order-lifecycle-service';
import { revalidatePath } from 'next/cache';

/**
 * إحصائيات لوحة قيادة التجهيز (Action-Driven Dashboard Stats)
 */
export async function getFulfillmentDashboardStats() {
  await requirePermission('orders.view');

  const [needsActionCount, processingCount, readyForPickupCount, outForDeliveryCount] =
    await Promise.all([
      // 1. طلبات تحتاج تدخلك فوراً: مشاكل ونواقص أو تعثر توصيل
      prisma.order.count({
        where: {
          OR: [
            { fulfillmentStatus: 'FAILED_DELIVERY' },
            {
              fulfillmentOrders: {
                some: { status: 'ISSUE_REPORTED' },
              },
            },
          ],
        },
      }),

      // 2. قيد التجهيز لدى الموردين
      prisma.order.count({
        where: {
          fulfillmentStatus: { in: ['PROCESSING', 'PARTIALLY_READY', 'SPLIT_PENDING'] },
        },
      }),

      // 3. جاهزة لجدولة الاستلام (الموردون أنهوا التغليف)
      prisma.order.count({
        where: {
          fulfillmentStatus: 'READY_FOR_PICKUP',
        },
      }),

      // 4. قيد التوصيل النهائي للزبائن
      prisma.order.count({
        where: {
          fulfillmentStatus: { in: ['OUT_FOR_DELIVERY', 'IN_TRANSIT', 'RECEIVED_AT_HUB'] },
        },
      }),
    ]);

  return {
    needsActionCount,
    processingCount,
    readyForPickupCount,
    outForDeliveryCount,
  };
}

/**
 * قائمة العمل اللوجستية مع تحديد "الإجراء التالي" لكل طلب
 */
export async function getFulfillmentOrdersList(filter?: {
  status?: string;
  supplierId?: string;
  search?: string;
}) {
  await requirePermission('orders.view');

  const orders = await prisma.order.findMany({
    where: {
      ...(filter?.status ? { fulfillmentStatus: filter.status } : {}),
      ...(filter?.supplierId
        ? {
            fulfillmentOrders: {
              some: { supplierId: filter.supplierId },
            },
          }
        : {}),
      ...(filter?.search
        ? {
            OR: [
              { reference: { contains: filter.search, mode: 'insensitive' } },
              { customerName: { contains: filter.search, mode: 'insensitive' } },
              { customerPhone: { contains: filter.search } },
            ],
          }
        : {}),
    },
    include: {
      fulfillmentOrders: {
        include: {
          supplier: true,
          location: true,
          items: true,
          packages: true,
        },
      },
      deliveryJob: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return orders.map((order) => {
    // استنتاج الإجراء التالي بذكاء
    let nextAction = 'بانتظار الإجراء';
    let nextActionColor = 'text-zinc-600 bg-zinc-100';

    const hasIssue = order.fulfillmentOrders.some((f) => f.status === 'ISSUE_REPORTED');
    const allSuppliersReady =
      order.fulfillmentOrders.length > 0 &&
      order.fulfillmentOrders.every(
        (f) => f.status === 'READY_FOR_PICKUP' || f.status === 'PICKED_UP'
      );
    const allPickedUp =
      order.fulfillmentOrders.length > 0 &&
      order.fulfillmentOrders.every((f) => f.status === 'PICKED_UP');

    if (hasIssue) {
      nextAction = 'مطلوب تدخل: مراجعة نقص صنف لدى مورد';
      nextActionColor = 'text-rose-800 bg-rose-100 border border-rose-300';
    } else if (order.fulfillmentOrders.length === 0) {
      nextAction = 'مطلوب إجراء: بدء تقسيم الطلب للموردين';
      nextActionColor = 'text-amber-800 bg-amber-100 border border-amber-300';
    } else if (allPickedUp) {
      nextAction = 'جاهز للتسليم النهائي للزبونة';
      nextActionColor = 'text-emerald-800 bg-emerald-100 border border-emerald-300';
    } else if (allSuppliersReady) {
      nextAction = 'إرسال كشف الاستلام لشركة التوصيل';
      nextActionColor = 'text-purple-800 bg-purple-100 border border-purple-300';
    } else {
      nextAction = 'متابعة تجهيز الموردين';
      nextActionColor = 'text-blue-800 bg-blue-100 border border-blue-300';
    }

    return {
      id: order.id,
      reference: order.reference,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      city: order.deliveryJob?.city || order.shippingZoneNameSnapshot || 'عمان',
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus || 'UNFULFILLED',
      fulfillmentStrategy: order.fulfillmentStrategy || 'DIRECT_PICKUP',
      suppliersCount: order.fulfillmentOrders.length,
      readySuppliersCount: order.fulfillmentOrders.filter(
        (f) => f.status === 'READY_FOR_PICKUP' || f.status === 'PICKED_UP'
      ).length,
      totalPackages: order.fulfillmentOrders.reduce((acc, f) => acc + f.packages.length, 0),
      nextAction,
      nextActionColor,
      fulfillmentOrders: order.fulfillmentOrders,
      createdAt: order.createdAt,
    };
  });
}

/**
 * إصدار رابط جلسة جديد للمورد مع نص الواتساب باستخدام رابط الموقع الفعلي
 */
export async function createSupplierSessionAction(supplierId: string, customBaseUrl?: string) {
  const session = await requirePermission('manage_orders');
  try {
    let resolvedBaseUrl = customBaseUrl?.trim();

    if (!resolvedBaseUrl) {
      try {
        const headerList = await headers();
        const host = headerList.get('x-forwarded-host') || headerList.get('host');
        const proto =
          headerList.get('x-forwarded-proto') ||
          (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1')) ? 'http' : 'https');
        if (host) {
          resolvedBaseUrl = `${proto}://${host}`;
        }
      } catch {
        // Fallback when headers() is unavailable
      }
    }

    if (!resolvedBaseUrl) {
      resolvedBaseUrl =
        process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://rawaq.jo';
    }

    resolvedBaseUrl = resolvedBaseUrl.replace(/\/+$/, '');

    const result = await createSupplierAccessSession(supplierId, {
      employeeId: session.employeeId,
      expiresInHours: 72,
      baseUrl: resolvedBaseUrl,
    });
    return { success: true, ...result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر إصدار رابط المورد.' };
  }
}

/**
 * استخراج كشف التوصيل المنسق للطلب
 */
export async function getOrderDeliveryManifestAction(orderId: string) {
  await requirePermission('orders.view');
  try {
    const manifest = await generateDeliveryManifest(orderId);
    return { success: true, manifest };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر استخراج كشف التوصيل.' };
  }
}

/**
 * تأكيد استلام الطرد من المورد بواسطة الإدارة أو المندوب
 */
export async function confirmPackagePickupAction(packageCode: string, courierName: string) {
  const session = await requirePermission('manage_orders');
  try {
    const res = await verifyCourierPackagePickup(packageCode, courierName, {
      role: 'ADMIN',
      employeeId: session.employeeId,
    });
    revalidatePath('/admin/fulfillment');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تأكيد استلام الطرد.' };
  }
}

/**
 * تجميع الطرود الجاهزة للمورد في دفعة استلام واحدة
 */
export async function createSupplierPickupBatchAction(
  supplierId: string,
  locationId: string,
  courierName?: string
) {
  await requirePermission('manage_orders');
  try {
    const batch = await createPickupBatchForSupplier(supplierId, locationId, courierName);
    revalidatePath('/admin/fulfillment');
    return { success: true, ...batch };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر إنشاء دفعة الاستلام.' };
  }
}

/**
 * تشغيل تقسيم الطلب يدوياً إذا رغب المدير
 */
export async function triggerManualOrderSplitAction(orderId: string) {
  await requirePermission('manage_orders');
  try {
    const res = await executeOrderFulfillmentSplit(orderId);
    revalidatePath('/admin/fulfillment');
    return { success: true, ...res };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تقسيم الطلب.' };
  }
}

/**
 * تأكيد تسليم الطلب النهائي للزبونة من خلال الخدمة المركزية الموحدة
 */
export async function completeOrderDeliveryAction(
  orderId: string,
  options?: {
    notes?: string;
    collectedCodAmount?: number;
    paymentMethod?: 'CASH' | 'CARD';
  }
) {
  const session = await requirePermission('manage_orders');
  try {
    const res = await OrderLifecycleService.completeOrderDelivery({
      orderId,
      source: 'ADMIN',
      actorId: session.employeeId,
      actorName: session.employee?.name || 'مدير العمليات',
      notes: options?.notes,
      collectedCodAmount: options?.collectedCodAmount,
      paymentMethod: options?.paymentMethod,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath('/admin/fulfillment');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تأكيد تسليم الطلب.' };
  }
}

/**
 * إطلاق الشحنة للتسليم النهائي للزبونة مع التحقق الصارم من استلام كافة الطرود
 */
export async function dispatchFinalDeliveryAction(orderId: string, courierName: string) {
  const session = await requirePermission('manage_orders');
  try {
    const res = await OrderLifecycleService.dispatchOrderFinalDelivery({
      orderId,
      courierName,
      actorEmployeeId: session.employeeId,
    });
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');
    revalidatePath('/admin/fulfillment');
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر إطلاق الشحنة للتسليم.' };
  }
}
