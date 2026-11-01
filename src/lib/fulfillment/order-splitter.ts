import { prisma } from '@/lib/db';
import { FULFILLMENT_STRATEGY, FULFILLMENT_STATUS, SUPPLIER_FULFILLMENT_STATUS } from './types';

interface SplitResult {
  orderId: string;
  strategy: string;
  fulfillmentOrdersCount: number;
  itemsAssigned: number;
  deliveryJobId?: string;
  isIdempotentSkip?: boolean;
}

/**
 * إدراج مهمة تقسيم الطلب في جدول الـ Outbox داخل نفس المعاملة (Transactional Outbox)
 * عملية كتابة ذرية وسريعة جداً لا تؤثر على مسار الشراء (Zero Overhead)
 */
export async function enqueueOrderFulfillmentSplit(
  orderId: string,
  tx?: any
): Promise<void> {
  const db = tx || prisma;

  // إدراج المهمة وتحديث حالة الطلب دفعة واحدة بأقل زمن استجابة (Single Trip)
  await Promise.all([
    db.fulfillmentOutbox.create({
      data: {
        orderId,
        eventType: 'ORDER_CONFIRMED_SPLIT',
        payload: JSON.stringify({ orderId, enqueuedAt: new Date().toISOString() }),
        status: 'PENDING',
      },
    }),
    db.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.SPLIT_PENDING,
      },
    }),
  ]);
}

/**
 * المحرك الرئيسي لتقسيم الطلب إلى أوامر تجهيز منفصلة لكل مورد وموقع استلام.
 * المعالجة ذرية بالكامل مع قفل صريح على مستوى السطر (SELECT ... FOR UPDATE)
 * لضمان عدم حدوث أي تضارب أو تكرار عند تشغيل عمال متزامنين (Race Conditions Immunity).
 */
export async function executeOrderFulfillmentSplit(orderId: string): Promise<SplitResult> {
  return await prisma.$transaction(async (tx) => {
    // 1. قفل سطر الطلب في PostgreSQL لمنع تشغيل عاملين متزامنين في نفس اللحظة
    await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

    // 2. جلب الطلب والأصناف والعميل وحالة التجهيز الحالية
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: {
          include: {
            addresses: true,
          },
        },
        fulfillmentOrders: {
          include: {
            items: true,
          },
        },
        deliveryJob: true,
      },
    });

    if (!order) {
      throw new Error(`الطلب #${orderId} غير موجود.`);
    }

    // 3. فحص الـ Idempotency: إذا كان الطلب مقسماً مسبقاً ولديه أوامر تجهيز ومهمة توصيل
    if (order.fulfillmentOrders && order.fulfillmentOrders.length > 0) {
      return {
        orderId,
        strategy: order.fulfillmentStrategy || FULFILLMENT_STRATEGY.DIRECT_PICKUP,
        fulfillmentOrdersCount: order.fulfillmentOrders.length,
        itemsAssigned: order.fulfillmentOrders.reduce((acc, f) => acc + f.items.length, 0),
        deliveryJobId: order.deliveryJob?.id,
        isIdempotentSkip: true,
      };
    }

    // 4. التأكد من وجود مورد افتراضي ومستودع لرَواق
    let defaultSupplier = await tx.supplier.findFirst({
      where: { isActive: true },
      include: {
        locations: {
          where: { isActive: true },
        },
      },
    });

    if (!defaultSupplier) {
      defaultSupplier = await tx.supplier.create({
        data: {
          name: 'المستودع الرئيسي - رَواق',
          phone: '0790000000',
          notes: 'المستودع المركزي للبضائع الداخلية',
          isActive: true,
        },
        include: {
          locations: true,
        },
      });
    }

    // موقع الاستلام للمورد
    const getOrCreateSupplierLocation = async (supplierId: string, supplierName: string, supplierPhone?: string | null) => {
      let loc = await tx.supplierLocation.findFirst({
        where: { supplierId, isActive: true },
      });

      if (!loc) {
        loc = await tx.supplierLocation.create({
          data: {
            supplierId,
            label: `المستودع الرئيسي - ${supplierName}`,
            contactPerson: supplierName,
            contactPhone: supplierPhone || '0790000000',
            city: 'عمان',
            area: 'الرئيسي',
            addressDetails: 'المستودع العام المعتمد للاستلام',
            isDefault: true,
            isActive: true,
          },
        });
      }

      return loc;
    };

    // 5. فرز وتجميع الأصناف بحسب المورد وموقع الاستلام
    type GroupBucket = {
      supplierId: string;
      supplierName: string;
      supplierPhone: string;
      locationId: string;
      locationLabel: string;
      locationAddress: string;
      items: typeof order.items;
    };

    const groupsMap = new Map<string, GroupBucket>();

    for (const item of order.items) {
      const supplierId = item.supplierIdSnapshot || defaultSupplier.id;
      const supplierName = item.supplierNameSnapshot || defaultSupplier.name;

      const location = await getOrCreateSupplierLocation(supplierId, supplierName, defaultSupplier.phone);
      const groupKey = `${supplierId}__${location.id}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          supplierId,
          supplierName,
          supplierPhone: location.contactPhone,
          locationId: location.id,
          locationLabel: location.label,
          locationAddress: `${location.city} - ${location.area} - ${location.addressDetails}`,
          items: [],
        });
      }

      groupsMap.get(groupKey)!.items.push(item);
    }

    const distinctFulfillments = Array.from(groupsMap.values());

    // 6. تحديد استراتيجية التوصيل (احترام الاستراتيجية المحددة مسبقاً إن وجدت مثل CROSS_DOCK)
    let strategy: string = order.fulfillmentStrategy || '';
    if (!strategy || strategy === FULFILLMENT_STRATEGY.DIRECT_PICKUP) {
      if (distinctFulfillments.length === 1) {
        strategy = FULFILLMENT_STRATEGY.DIRECT_PICKUP;
      } else {
        strategy = FULFILLMENT_STRATEGY.DIRECT_MULTI_PICKUP;
      }
    }

    // 7. عنوان الزبونة ووجهة التوصيل (مطابقة منطقة التوصيل المحددة بالطلب مع وجهة ومدينة العميل)
    const defaultAddress = order.customer?.addresses?.find((a) => a.isDefault) || order.customer?.addresses?.[0];
    const customerCity = order.shippingZoneNameSnapshot || defaultAddress?.city || 'عمان';
    const customerArea = defaultAddress?.street || order.shippingZoneNameSnapshot || 'المنطقة المحددة';
    const customerAddress = [defaultAddress?.street, defaultAddress?.building, defaultAddress?.apartment, order.notes]
      .filter(Boolean)
      .join(' - ') || order.notes || 'عنوان العميل المسجل بالطلب';

    const isPrepaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
    const codAmount = isPrepaid ? 0 : order.totalAmount;

    // 8. إنشاء أوامر التجهيز
    let totalItemsCreated = 0;

    for (const group of distinctFulfillments) {
      const fulfillment = await tx.fulfillmentOrder.upsert({
        where: {
          orderId_supplierId_locationId: {
            orderId: order.id,
            supplierId: group.supplierId,
            locationId: group.locationId,
          },
        },
        create: {
          orderId: order.id,
          supplierId: group.supplierId,
          locationId: group.locationId,
          supplierNameSnapshot: group.supplierName,
          pickupAddressSnapshot: group.locationAddress,
          contactPhoneSnapshot: group.supplierPhone,
          status: SUPPLIER_FULFILLMENT_STATUS.DRAFT,
          packagesCount: 1,
          internalAdminNotes: `أمر تجهيز آلي للطلب #${order.reference}`,
        },
        update: {},
      });

      for (const item of group.items) {
        await tx.fulfillmentItem.create({
          data: {
            fulfillmentOrderId: fulfillment.id,
            orderItemId: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productTitle: item.name,
            variantTitle: item.size,
            sku: item.sku,
            quantity: item.quantity,
            preparedQuantity: 0,
            isOutOfStock: false,
          },
        });
        totalItemsCreated++;
      }
    }

    // 9. إنشاء مهمة التوصيل للزبونة
    const deliveryJob = await tx.deliveryJob.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
        city: customerCity,
        area: customerArea,
        addressDetails: customerAddress,
        codAmountToCollect: codAmount,
        isCodCollected: false,
      },
      update: {
        recipientName: order.customerName,
        recipientPhone: order.customerPhone,
        city: customerCity,
        area: customerArea,
        addressDetails: customerAddress,
        codAmountToCollect: codAmount,
      },
    });

    // 10. تحديث حالة الطلب
    await tx.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.PROCESSING,
        fulfillmentStrategy: strategy,
      },
    });

    // 11. تسجيل التدقيق
    await tx.fulfillmentAuditLog.create({
      data: {
        entityType: 'ORDER',
        entityId: order.id,
        fromStatus: FULFILLMENT_STATUS.SPLIT_PENDING,
        toStatus: FULFILLMENT_STATUS.PROCESSING,
        actorType: 'SYSTEM',
        notes: `تم تقسيم الطلب آلياً إلى ${distinctFulfillments.length} أمر تجهيز بنمط (${strategy}) مع حماية التزامن الصارمة.`,
      },
    });

    return {
      orderId,
      strategy,
      fulfillmentOrdersCount: distinctFulfillments.length,
      itemsAssigned: totalItemsCreated,
      deliveryJobId: deliveryJob.id,
    };
  });
}
