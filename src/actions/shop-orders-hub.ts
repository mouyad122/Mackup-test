'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import {
  createSupplierAccessSession,
  verifyCourierPackagePickup,
} from '@/lib/fulfillment/supplier-session';
import { revalidatePath } from 'next/cache';

export interface ShopOperationsData {
  kpis: {
    activeShopsCount: number;
    readyPackagesCount: number;
    preparingOrdersCount: number;
    shortageAlertsCount: number;
  };
  shops: Array<{
    id: string;
    name: string;
    ownerName: string | null;
    phone: string | null;
    address: string | null;
    mapLocationUrl: string | null;
    profitMargin: number;
    counts: {
      totalActiveOrders: number;
      readyPackages: number;
      preparingOrders: number;
      shortageAlerts: number;
    };
    fulfillmentOrders: Array<any>;
  }>;
}

/**
 * جلب البيانات المجمعة لمركز تشغيل ومتابعة المحلات
 */
export async function getShopOperationsHubDataAction(): Promise<ShopOperationsData> {
  await requirePermission('orders.view');

  // جلب كافة أوامر التجهيز النشطة وغير المكتملة
  const activeFulfillmentOrders = await prisma.fulfillmentOrder.findMany({
    where: {
      status: {
        in: [
          'DRAFT',
          'NOTIFIED',
          'IN_PREPARATION',
          'READY_FOR_PICKUP',
          'ISSUE_REPORTED',
          'PICKED_UP',
        ],
      },
      order: {
        status: {
          notIn: ['CANCELLED', 'REFUNDED', 'DELIVERED'],
        },
      },
    },
    include: {
      supplier: {
        include: {
          locations: true,
        },
      },
      order: {
        include: {
          items: true,
          invoice: true,
          deliveryJob: true,
        },
      },
      packages: {
        include: {
          items: {
            include: {
              fulfillmentItem: true,
            },
          },
        },
      },
      items: {
        include: {
          orderItem: {
            select: {
              name: true,
              size: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // تجميع الأوامر حسب المحل (Supplier)
  const shopsMap = new Map<string, any>();

  let totalReadyPackages = 0;
  let totalPreparingOrders = 0;
  let totalShortageAlerts = 0;

  for (const fOrder of activeFulfillmentOrders) {
    const supplier = fOrder.supplier;
    if (!supplier) continue;

    if (!shopsMap.has(supplier.id)) {
      shopsMap.set(supplier.id, {
        id: supplier.id,
        name: supplier.name,
        ownerName: supplier.ownerName,
        phone: supplier.phone,
        address: supplier.address || supplier.locations?.[0]?.addressDetails || 'الموقع الرئيسي',
        mapLocationUrl: supplier.mapLocationUrl || supplier.locations?.[0]?.mapLocationUrl || null,
        profitMargin: supplier.profitMargin || 0,
        counts: {
          totalActiveOrders: 0,
          readyPackages: 0,
          preparingOrders: 0,
          shortageAlerts: 0,
        },
        fulfillmentOrders: [],
      });
    }

    const shop = shopsMap.get(supplier.id);

    const mappedItems = fOrder.items.map((it: any) => ({
      ...it,
      productTitle: it.productTitle || it.orderItem?.name || it.orderItem?.product?.title || 'منتج',
      productName: it.productTitle || it.orderItem?.name || it.orderItem?.product?.title || 'منتج',
      variantTitle: it.variantTitle || (it.orderItem?.size && it.orderItem.size !== 'DEFAULT' && it.orderItem.size !== 'STANDARD' ? it.orderItem.size : null),
    }));

    shop.fulfillmentOrders.push({
      ...fOrder,
      items: mappedItems,
    });
    shop.counts.totalActiveOrders += 1;

    // حساب حالات الطرود والأوامر
    const readyPkgs = fOrder.packages.filter((p) => p.status === 'READY_FOR_PICKUP').length;
    shop.counts.readyPackages += readyPkgs;
    totalReadyPackages += readyPkgs;

    if (fOrder.status === 'ISSUE_REPORTED' || fOrder.items.some((it) => it.isOutOfStock)) {
      shop.counts.shortageAlerts += 1;
      totalShortageAlerts += 1;
    } else if (fOrder.status === 'READY_FOR_PICKUP') {
      // counted in ready
    } else if (fOrder.status !== 'PICKED_UP') {
      shop.counts.preparingOrders += 1;
      totalPreparingOrders += 1;
    }
  }

  const shopsArray = Array.from(shopsMap.values()).sort((a, b) => {
    // الأولوية للمحلات التي لديها نواقص أولاً، ثم الجاهزة للاستلام
    if (a.counts.shortageAlerts !== b.counts.shortageAlerts) {
      return b.counts.shortageAlerts - a.counts.shortageAlerts;
    }
    if (a.counts.readyPackages !== b.counts.readyPackages) {
      return b.counts.readyPackages - a.counts.readyPackages;
    }
    return b.counts.totalActiveOrders - a.counts.totalActiveOrders;
  });

  return {
    kpis: {
      activeShopsCount: shopsArray.length,
      readyPackagesCount: totalReadyPackages,
      preparingOrdersCount: totalPreparingOrders,
      shortageAlertsCount: totalShortageAlerts,
    },
    shops: shopsArray,
  };
}

/**
 * تأكيد استلام مجموعة من الطرود الجاهزة من محل معين دفعة واحدة
 */
export async function batchConfirmShopPackagesPickupAction(packageCodes: string[]) {
  const session = await requirePermission('orders.confirm');

  if (!packageCodes || packageCodes.length === 0) {
    return { success: false, error: 'لم يتم تحديد أي طرود للاستلام.' };
  }

  try {
    const results = [];
    for (const code of packageCodes) {
      const res = await verifyCourierPackagePickup(code, 'إدارة رَواق', {
        employeeId: session.employeeId,
        role: 'ADMIN',
      });
      results.push(res);
    }

    revalidatePath('/admin/orders');
    revalidatePath('/admin/orders/shops');
    return {
      success: true,
      message: `تم تأكيد استلام ${results.length} طرد بنجاح.`,
      count: results.length,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'حدث خطأ أثناء استلام الطرود.' };
  }
}

/**
 * إنشاء جلسة واتساب ورابط موحد لكافة طلبات المحل المفتوحة
 */
export async function createShopMasterSessionLinkAction(
  supplierId: string,
  customOrigin?: string
) {
  await requirePermission('orders.confirm');

  try {
    const res = await createSupplierAccessSession(supplierId, {
      baseUrl: customOrigin,
    });
    return { success: true, ...res };
  } catch (error: any) {
    return { success: false, error: error.message || 'تعذر إنشاء الرابط الموحد للمحل.' };
  }
}

/**
 * إصدار كشف استلام المندوب الخاص بالمحل (Shop Pickup Sheet)
 */
export async function generateShopPickupManifestAction(supplierId: string) {
  await requirePermission('orders.view');

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      locations: true,
      fulfillmentOrders: {
        where: {
          status: { in: ['READY_FOR_PICKUP', 'IN_PREPARATION'] },
          order: { status: { notIn: ['CANCELLED', 'REFUNDED', 'DELIVERED'] } },
        },
        include: {
          order: true,
          packages: {
            where: { status: 'READY_FOR_PICKUP' },
            include: {
              items: {
                include: {
                  fulfillmentItem: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    throw new Error('المحل غير موجود.');
  }

  const pickupLocation =
    supplier.address || supplier.locations?.[0]?.addressDetails || 'المقر الرئيسي';
  const mapUrl = supplier.mapLocationUrl || supplier.locations?.[0]?.mapLocationUrl || null;

  const readyPackages = supplier.fulfillmentOrders.flatMap((f) =>
    f.packages.map((pkg) => ({
      packageCode: pkg.packageCode,
      orderReference: f.order.reference,
      customerName: f.order.customerName,
      customerPhone: f.order.customerPhone,
      city: f.order.shippingZoneNameSnapshot || 'عمان',
      itemsCount: pkg.items.reduce((s, it) => s + it.quantity, 0),
      itemsSummary: pkg.items
        .map((pi) => `${pi.fulfillmentItem.productTitle} (×${pi.quantity})`)
        .join(' + '),
    }))
  );

  let whatsappText = `📦 *رَواق | كشف استلام من محل: ${supplier.name}*\n`;
  if (supplier.ownerName) {
    whatsappText += `👤 المسؤول: ${supplier.ownerName}\n`;
  }
  whatsappText += `📞 هاتف المحل: ${supplier.phone || 'غير مسجل'}\n`;
  whatsappText += `🏠 عنوان المحل: ${pickupLocation}\n`;
  if (mapUrl) {
    whatsappText += `📍 موقع المحل على الخريطة: ${mapUrl}\n`;
  }
  whatsappText += `------------------------------------\n`;
  whatsappText += `إجمالي الطرود الجاهزة للاستلام: ${readyPackages.length} طرد\n\n`;

  if (readyPackages.length === 0) {
    whatsappText += `(لا توجد طرود معلنة كجاهزة للاستلام حالياً، يرجى التنسيق مع المحل للتجهيز)\n`;
  } else {
    readyPackages.forEach((pkg, idx) => {
      whatsappText += `*طرد ${idx + 1}: [${pkg.packageCode}]*\n`;
      whatsappText += `  • تابع للطلب: #${pkg.orderReference} (${pkg.customerName} - ${pkg.city})\n`;
      whatsappText += `  • المحتويات: ${pkg.itemsSummary}\n\n`;
    });
  }

  whatsappText += `------------------------------------\n`;
  whatsappText += `يرجى من مندوب الاستلام فحص الطرود ومطابقة الباركود عند الاستلام.`;

  return {
    shopName: supplier.name,
    ownerName: supplier.ownerName,
    phone: supplier.phone,
    pickupLocation,
    mapUrl,
    packagesCount: readyPackages.length,
    packages: readyPackages,
    whatsappText,
  };
}
