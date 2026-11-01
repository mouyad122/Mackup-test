import { prisma } from '@/lib/db';

export interface DeliveryManifest {
  orderReference: string;
  orderDate: Date;
  strategy: string;
  totalPackagesExpected: number;
  pickupStops: Array<{
    sequence: number;
    supplierName: string;
    ownerName?: string | null;
    contactPhone: string;
    pickupLocation: string;
    mapLocationUrl?: string | null;
    packages: Array<{
      packageCode: string;
      status: string;
      itemsSummary: string;
    }>;
  }>;
  dropoff: {
    recipientName: string;
    recipientPhone: string;
    city: string;
    area: string;
    addressDetails: string;
    codAmountFils: number;
    isCodPrepaid: boolean;
  };
  formattedWhatsAppText: string;
}

/**
 * توليد كشف الاستلام والتسليم (Delivery Manifest) للطلب
 */
export async function generateDeliveryManifest(orderId: string): Promise<DeliveryManifest> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      deliveryJob: true,
      fulfillmentOrders: {
        include: {
          supplier: true,
          location: true,
          packages: {
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

  if (!order) {
    throw new Error('الطلب غير موجود.');
  }

  const pickupStops = order.fulfillmentOrders.map((f, index) => {
    return {
      sequence: index + 1,
      supplierName: f.supplier?.name || f.supplierNameSnapshot,
      ownerName: f.supplier?.ownerName || null,
      contactPhone: f.supplier?.phone || f.contactPhoneSnapshot,
      pickupLocation: f.supplier?.address || f.pickupAddressSnapshot,
      mapLocationUrl: f.supplier?.mapLocationUrl || f.location?.mapLocationUrl || null,
      packages: f.packages.map((p) => ({
        packageCode: p.packageCode,
        status: p.status,
        itemsSummary: p.items
          .map((pi) => `${pi.fulfillmentItem.productTitle} (${pi.quantity})`)
          .join(' + ') || 'طرد مجمع',
      })),
    };
  });

  const totalPackagesExpected = pickupStops.reduce(
    (acc, stop) => acc + stop.packages.length,
    0
  );

  const dropoff = {
    recipientName: order.deliveryJob?.recipientName || order.customerName,
    recipientPhone: order.deliveryJob?.recipientPhone || order.customerPhone,
    city: order.deliveryJob?.city || order.shippingZoneNameSnapshot || 'عمان',
    area: order.deliveryJob?.area || order.shippingZoneNameSnapshot || 'المنطقة',
    addressDetails: order.deliveryJob?.addressDetails || 'العنوان المسجل',
    codAmountFils: order.deliveryJob?.codAmountToCollect ?? (order.paymentStatus === 'PAID' ? 0 : order.totalAmount),
    isCodPrepaid: (order.deliveryJob?.codAmountToCollect ?? (order.paymentStatus === 'PAID' ? 0 : order.totalAmount)) === 0,
  };

  // صياغة نص واتساب منسق وجاهز للإرسال لمندوب شركة التوصيل فوراً
  let whatsapp = `📦 *رَواق | كشف استلام وتسليم شحنة*\n`;
  whatsapp += `رقم الطلب: #${order.reference}\n`;
  whatsapp += `إجمالي الطرود المطلوب جمعها: ${totalPackagesExpected} طرد\n`;
  whatsapp += `------------------------------------\n`;
  whatsapp += `📍 *أولاً: محطات الاستلام من المحلات*\n\n`;

  pickupStops.forEach((stop) => {
    whatsapp += `*محطة ${stop.sequence}: ${stop.supplierName}*`;
    if (stop.ownerName) {
      whatsapp += ` (المسؤول: ${stop.ownerName})`;
    }
    whatsapp += `\n`;
    whatsapp += `📞 هاتف: ${stop.contactPhone}\n`;
    whatsapp += `🏠 الموقع: ${stop.pickupLocation}\n`;
    if (stop.mapLocationUrl) {
      whatsapp += `📍 رابط الخريطة: ${stop.mapLocationUrl}\n`;
    }
    whatsapp += `📦 الطرود:\n`;
    stop.packages.forEach((pkg) => {
      whatsapp += `  • [${pkg.packageCode}] -> ${pkg.itemsSummary}\n`;
    });
    whatsapp += `\n`;
  });

  whatsapp += `------------------------------------\n`;
  whatsapp += `🏁 *ثانياً: التسليم النهائي للزبونة*\n`;
  whatsapp += `👤 العميل: ${dropoff.recipientName}\n`;
  whatsapp += `📱 هاتف: ${dropoff.recipientPhone}\n`;
  whatsapp += `🏙️ العنوان: ${dropoff.city} - ${dropoff.area} (${dropoff.addressDetails})\n`;
  whatsapp += `💵 *المبلغ المطلوب تحصيله (COD):* ${
    dropoff.isCodPrepaid
      ? '0 دينار (مدفوع مسبقاً ✅)'
      : `${(dropoff.codAmountFils / 1000).toFixed(2)} دينار أردني`
  }\n`;
  whatsapp += `------------------------------------\n`;
  whatsapp += `يرجى التأكد من مسح أو مطابقة رموز كافة الطرود قبل التسليم.`;

  return {
    orderReference: order.reference,
    orderDate: order.createdAt,
    strategy: order.fulfillmentStrategy || 'DIRECT_PICKUP',
    totalPackagesExpected,
    pickupStops,
    dropoff,
    formattedWhatsAppText: whatsapp,
  };
}

/**
 * تجميع الطرود الجاهزة للاستلام من مورد وموقع محدد في دفعة استلام واحدة (Pickup Batch)
 */
export async function createPickupBatchForSupplier(
  supplierId: string,
  locationId: string,
  courierName?: string
) {
  // جلب كافة الطرود في هذا الموقع الجاهزة للاستلام ولم تُربط بدفعة استلام
  const readyPackages = await prisma.package.findMany({
    where: {
      status: 'READY_FOR_PICKUP',
      pickupBatchId: null,
      fulfillmentOrder: {
        supplierId,
        locationId,
      },
    },
    include: {
      fulfillmentOrder: {
        include: {
          supplier: true,
          location: true,
          order: true,
        },
      },
    },
  });

  if (readyPackages.length === 0) {
    throw new Error('لا توجد طرود جاهزة للاستلام لهذا المورد حالياً.');
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const batchCountToday = await prisma.pickupBatch.count({
    where: {
      createdAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  const batchCode = `BATCH-${supplierId.slice(-4)}-${dateStr}-${String(batchCountToday + 1).padStart(2, '0')}`;

  const batch = await prisma.$transaction(async (tx) => {
    const newBatch = await tx.pickupBatch.create({
      data: {
        batchCode,
        supplierId,
        locationId,
        courierName: courierName || 'مندوب التوصيل المعتمد',
        scheduledDate: new Date(),
        status: 'SCHEDULED',
      },
    });

    // ربط كافة الطرود الجاهزة بهذه الدفعة
    await tx.package.updateMany({
      where: {
        id: { in: readyPackages.map((p) => p.id) },
      },
      data: {
        pickupBatchId: newBatch.id,
      },
    });

    return newBatch;
  });

  return {
    batchId: batch.id,
    batchCode: batch.batchCode,
    packagesCount: readyPackages.length,
    ordersCount: new Set(readyPackages.map((p) => p.fulfillmentOrder.orderId)).size,
  };
}
