import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { SUPPLIER_FULFILLMENT_STATUS, FULFILLMENT_STATUS, PACKAGE_STATUS } from './types';
import { getMessageTemplate, compileTemplate } from '@/lib/message-templates';

export interface CreateSessionResult {
  sessionId: string;
  rawToken: string;
  magicUrl: string;
  expiresAt: Date;
  whatsappMessage: string;
  supplierPhone?: string | null;
  whatsappUrl?: string | null;
  supplierName?: string;
}

/**
 * إنشاء جلسة وصول مؤقتة وآمنة للمورد برمز تشفيري 256-bit
 */
export async function createSupplierAccessSession(
  supplierId: string,
  options?: {
    assignedFulfillmentIds?: string[];
    employeeId?: string;
    expiresInHours?: number;
    baseUrl?: string;
  }
): Promise<CreateSessionResult> {
  const expiresInHours = options?.expiresInHours || 72;
  const baseUrl = (
    options?.baseUrl && (options.baseUrl.startsWith('http://') || options.baseUrl.startsWith('https://'))
      ? options.baseUrl
      : (process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://rawaq.jo')
  ).replace(/\/+$/, '');

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      fulfillmentOrders: {
        where: {
          status: { in: ['DRAFT', 'NOTIFIED', 'IN_PREPARATION', 'READY_FOR_PICKUP'] },
        },
        include: {
          order: true,
          items: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new Error('المورد غير موجود.');
  }

  // 1. توليد رمز عشوائي تشفيري 256-bit
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  // حصر الأوامر المسندة للجلسة
  const assignedIds = options?.assignedFulfillmentIds || supplier.fulfillmentOrders.map((f) => f.id);

  // 2. حفظ بصمة الرمز (Hash) وليس الرمز الخام
  const session = await prisma.supplierAccessSession.create({
    data: {
      supplierId,
      tokenHash,
      assignedFulfillmentIds: JSON.stringify(assignedIds),
      expiresAt,
      createdByEmployeeId: options?.employeeId,
    },
  });

  // تحديث حالة الأوامر المفتوحة إلى NOTIFIED إذا كانت DRAFT
  await prisma.fulfillmentOrder.updateMany({
    where: {
      id: { in: assignedIds },
      status: SUPPLIER_FULFILLMENT_STATUS.DRAFT,
    },
    data: {
      status: SUPPLIER_FULFILLMENT_STATUS.NOTIFIED,
    },
  });

  const magicUrl = `${baseUrl}/supplier-portal/${rawToken}`;

  // 3. صياغة نص رسالة الواتساب الجاهزة للإرسال بنقرة واحدة للمحل اعتماداً على القالب
  const totalOrders = assignedIds.length;
  const greetingName = supplier.ownerName
    ? `${supplier.ownerName} - ${supplier.name}`
    : supplier.name;

  const prepTemplate = await getMessageTemplate('SHOP_PREP_LINK');
  const whatsappMessage = compileTemplate(prepTemplate.content, {
    shopName: greetingName,
    ordersCount: totalOrders,
    prepLink: magicUrl,
    expiresInHours,
  });

  let cleanPhone = (supplier.phone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('07')) cleanPhone = '962' + cleanPhone.substring(1);
  else if (cleanPhone.startsWith('7')) cleanPhone = '962' + cleanPhone;

  const encodedMessage = encodeURIComponent(whatsappMessage);
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  return {
    sessionId: session.id,
    rawToken,
    magicUrl,
    expiresAt,
    whatsappMessage,
    supplierPhone: supplier.phone,
    whatsappUrl,
    supplierName: supplier.name,
  };
}

/**
 * التحقق من صلاحية الجلسة واسترجاع بيانات المورد المحمية
 */
export async function validateSupplierSession(rawToken: string) {
  if (!rawToken || rawToken.length < 32) {
    return null;
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const session = await prisma.supplierAccessSession.findUnique({
    where: { tokenHash },
    include: {
      supplier: true,
    },
  });

  if (!session) return null;
  if (session.isRevoked) return null;
  if (session.expiresAt < new Date()) return null;

  // تسجيل وقت الاستخدام والعداد
  await prisma.supplierAccessSession.update({
    where: { id: session.id },
    data: {
      lastAccessedAt: new Date(),
      accessCount: { increment: 1 },
    },
  });

  return session;
}

/**
 * استخراج بيانات بوابة المورد المعزولة تماماً (بدون بيانات العميل أو المبالغ المالية الحساسة)
 */
export async function getSupplierPortalData(rawToken: string) {
  const session = await validateSupplierSession(rawToken);
  if (!session) {
    throw new Error('الرابط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد من إدارة رَواق.');
  }

  const assignedIds: string[] = session.assignedFulfillmentIds
    ? JSON.parse(session.assignedFulfillmentIds)
    : [];

  const fulfillmentOrders = await prisma.fulfillmentOrder.findMany({
    where: {
      supplierId: session.supplierId,
      ...(assignedIds.length > 0 ? { id: { in: assignedIds } } : {}),
    },
    include: {
      order: {
        select: {
          id: true,
          reference: true,
          createdAt: true,
        },
      },
      location: true,
      items: {
        include: {
          orderItem: {
            include: {
              product: {
                include: {
                  images: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
      packages: {
        include: {
          items: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return {
    supplier: {
      id: session.supplier.id,
      name: session.supplier.name,
      ownerName: session.supplier.ownerName,
      phone: session.supplier.phone,
      address: session.supplier.address,
      mapLocationUrl: session.supplier.mapLocationUrl,
    },
    expiresAt: session.expiresAt,
    fulfillmentOrders: fulfillmentOrders.map((f) => ({
      id: f.id,
      orderReference: f.order.reference,
      status: f.status,
      packagesCount: f.packagesCount,
      supplierNotes: f.supplierNotes,
      issueReason: f.issueReason,
      location: {
        label: f.location.label,
        address: f.pickupAddressSnapshot,
      },
      items: f.items.map((it: any) => {
        const productImages = it.orderItem?.product?.images || [];
        const mainImg = productImages.find((img: any) => img.isMain) || productImages[0];
        const imageUrl = mainImg?.url ? mainImg.url.replace('local://', '/') : null;
        return {
          id: it.id,
          productTitle: it.productTitle,
          variantTitle: it.variantTitle,
          sku: it.sku,
          quantity: it.quantity,
          preparedQuantity: it.preparedQuantity,
          isOutOfStock: it.isOutOfStock,
          outOfStockQuantity: it.outOfStockQuantity,
          outOfStockReason: it.outOfStockReason,
          imageUrl,
          images: productImages.map((img: any) => img.url?.replace('local://', '/')).filter(Boolean),
        };
      }),
      packages: f.packages.map((p) => ({
        id: p.id,
        packageCode: p.packageCode,
        status: p.status,
        qrPayload: p.qrPayload,
      })),
      readyAt: f.readyAt,
      pickedUpAt: f.pickedUpAt,
      createdAt: f.createdAt,
    })),
  };
}

/**
 * تحديث حالة أمر التجهيز بواسطة المورد (بدء التجهيز، إعلان الجاهزية، أو الإبلاغ عن نقص)
 */
export async function updateSupplierFulfillmentStatus(
  rawToken: string,
  fulfillmentOrderId: string,
  action: 'START' | 'READY' | 'REPORT_ISSUE',
  payload?: {
    packagesCount?: number;
    issueReason?: string;
    supplierNotes?: string;
  }
) {
  const session = await validateSupplierSession(rawToken);
  if (!session) {
    throw new Error('جلسة الوصول غير صالحة.');
  }

  const fulfillment = await prisma.fulfillmentOrder.findUnique({
    where: { id: fulfillmentOrderId },
    include: {
      order: true,
      items: true,
      packages: true,
    },
  });

  if (!fulfillment || fulfillment.supplierId !== session.supplierId) {
    throw new Error('أمر التجهيز غير موجود أو غير مسند إليك.');
  }

  if (action === 'START') {
    // بدء التجهيز
    await prisma.fulfillmentOrder.update({
      where: { id: fulfillmentOrderId },
      data: {
        status: SUPPLIER_FULFILLMENT_STATUS.IN_PREPARATION,
      },
    });

    await prisma.fulfillmentAuditLog.create({
      data: {
        entityType: 'FULFILLMENT',
        entityId: fulfillmentOrderId,
        fromStatus: fulfillment.status,
        toStatus: SUPPLIER_FULFILLMENT_STATUS.IN_PREPARATION,
        actorType: 'SUPPLIER',
        actorId: session.supplierId,
        notes: 'المورد بدأ تجهيز المنتجات عبر البوابة.',
      },
    });

    return { success: true, status: SUPPLIER_FULFILLMENT_STATUS.IN_PREPARATION };
  }

  if (action === 'REPORT_ISSUE') {
    // إبلاغ عن نقص صنف أو تعذر التجهيز
    if (!payload?.issueReason) {
      throw new Error('يرجى تحديد سبب المشكلة أو النواقص.');
    }

    await prisma.fulfillmentOrder.update({
      where: { id: fulfillmentOrderId },
      data: {
        status: SUPPLIER_FULFILLMENT_STATUS.ISSUE_REPORTED,
        issueReason: payload.issueReason,
        supplierNotes: payload.supplierNotes || fulfillment.supplierNotes,
      },
    });

    // تسجيل التدقيق
    await prisma.fulfillmentAuditLog.create({
      data: {
        entityType: 'FULFILLMENT',
        entityId: fulfillmentOrderId,
        fromStatus: fulfillment.status,
        toStatus: SUPPLIER_FULFILLMENT_STATUS.ISSUE_REPORTED,
        actorType: 'SUPPLIER',
        actorId: session.supplierId,
        notes: `إبلاغ عن مشكلة: ${payload.issueReason}`,
      },
    });

    return { success: true, status: SUPPLIER_FULFILLMENT_STATUS.ISSUE_REPORTED };
  }

  if (action === 'READY') {
    // المورد يعلن الجاهزية ويحدد عدد الطرود
    const packagesCount = Math.max(1, payload?.packagesCount || 1);

    await prisma.$transaction(async (tx) => {
      // 1. توليد الطرود وحزم الأصناف بداخلها
      // حذف الطرود المؤقتة غير المكتملة إن وجدت
      await tx.packageItem.deleteMany({
        where: { package: { fulfillmentOrderId } },
      });
      await tx.package.deleteMany({
        where: { fulfillmentOrderId, status: PACKAGE_STATUS.PACKED },
      });

      // إنشاء طرد أو عدة طرود
      for (let i = 1; i <= packagesCount; i++) {
        const packageCode = `PKG-${fulfillment.order.reference}-${session.supplierId.slice(-4)}-${i}`;
        const newPkg = await tx.package.create({
          data: {
            fulfillmentOrderId,
            packageCode,
            status: PACKAGE_STATUS.READY_FOR_PICKUP,
            qrPayload: JSON.stringify({
              pkg: packageCode,
              orderRef: fulfillment.order.reference,
              supplierId: session.supplierId,
            }),
          },
        });

        // ربط الأصناف بالطرد (إذا كان طرداً واحداً توضع جميع الأصناف فيه)
        for (const item of fulfillment.items) {
          await tx.packageItem.create({
            data: {
              packageId: newPkg.id,
              fulfillmentItemId: item.id,
              quantity: item.quantity,
            },
          });
        }
      }

      // 2. تحديث أمر التجهيز إلى READY_FOR_PICKUP
      await tx.fulfillmentOrder.update({
        where: { id: fulfillmentOrderId },
        data: {
          status: SUPPLIER_FULFILLMENT_STATUS.READY_FOR_PICKUP,
          packagesCount,
          supplierNotes: payload?.supplierNotes || fulfillment.supplierNotes,
          readyAt: new Date(),
        },
      });

      // 3. فحص هل جميع الموردين لهذا الطلب جاهزون؟
      const allOrderFulfillments = await tx.fulfillmentOrder.findMany({
        where: { orderId: fulfillment.orderId },
      });

      const allReady = allOrderFulfillments.every(
        (f) =>
          f.id === fulfillmentOrderId ||
          f.status === SUPPLIER_FULFILLMENT_STATUS.READY_FOR_PICKUP ||
          f.status === SUPPLIER_FULFILLMENT_STATUS.PICKED_UP
      );

      if (allReady) {
        await tx.order.update({
          where: { id: fulfillment.orderId },
          data: {
            fulfillmentStatus: FULFILLMENT_STATUS.READY_FOR_PICKUP,
          },
        });
      } else {
        await tx.order.update({
          where: { id: fulfillment.orderId },
          data: {
            fulfillmentStatus: FULFILLMENT_STATUS.PARTIALLY_READY,
          },
        });
      }

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'FULFILLMENT',
          entityId: fulfillmentOrderId,
          fromStatus: fulfillment.status,
          toStatus: SUPPLIER_FULFILLMENT_STATUS.READY_FOR_PICKUP,
          actorType: 'SUPPLIER',
          actorId: session.supplierId,
          notes: `أعلن المورد جاهزية ${packagesCount} طرد للاستلام.`,
        },
      });
    });

    return { success: true, status: SUPPLIER_FULFILLMENT_STATUS.READY_FOR_PICKUP };
  }

  throw new Error('إجراء غير معروف.');
}

/**
 * إبلاغ المورد عن نقص صنف محدد داخل أمر التجهيز
 */
export async function reportSupplierItemShortage(
  rawToken: string,
  fulfillmentItemId: string,
  missingQuantity: number,
  reason: string
) {
  const session = await validateSupplierSession(rawToken);
  if (!session) {
    throw new Error('جلسة الوصول غير صالحة أو منتهية الصلاحية.');
  }

  const item = await prisma.fulfillmentItem.findUnique({
    where: { id: fulfillmentItemId },
    include: {
      fulfillmentOrder: {
        include: {
          supplier: true,
          order: true,
        },
      },
      orderItem: true,
    },
  });

  if (!item || item.fulfillmentOrder.supplierId !== session.supplierId) {
    throw new Error('الصنف غير موجود أو غير مسند إليك.');
  }

  const effectiveMissing = Math.min(Math.max(1, missingQuantity), item.quantity);

  await prisma.$transaction(async (tx) => {
    // 1. تحديث صنف التجهيز
    await tx.fulfillmentItem.update({
      where: { id: fulfillmentItemId },
      data: {
        isOutOfStock: true,
        outOfStockQuantity: effectiveMissing,
        outOfStockReason: reason,
      },
    });

    // 2. تحديث صنف الطلب الأساسي OrderItem
    await tx.orderItem.update({
      where: { id: item.orderItemId },
      data: {
        missingQuantity: effectiveMissing,
        removalReason: reason,
      },
    });

    // 3. تحديث أمر التجهيز ليصبح ISSUE_REPORTED
    const note = `إبلاغ عن نقص: ${item.productTitle} (الكمية الناقصة: ${effectiveMissing}) - ${reason}`;
    await tx.fulfillmentOrder.update({
      where: { id: item.fulfillmentOrderId },
      data: {
        status: SUPPLIER_FULFILLMENT_STATUS.ISSUE_REPORTED,
        issueReason: note,
      },
    });

    // 4. وضع علامة على الطلب العام Order ليظهر في قائمة التدخل العاجل
    await tx.order.update({
      where: { id: item.fulfillmentOrder.orderId },
      data: {
        hasAdjustment: true,
        adjustmentNotes: `إشعار نقص من المورد ${item.fulfillmentOrder.supplier.name}: ${item.productTitle} - ${reason}`,
      },
    });

    // 5. تسجيل حركة التدقيق
    await tx.fulfillmentAuditLog.create({
      data: {
        entityType: 'FULFILLMENT',
        entityId: item.fulfillmentOrderId,
        fromStatus: item.fulfillmentOrder.status,
        toStatus: SUPPLIER_FULFILLMENT_STATUS.ISSUE_REPORTED,
        actorType: 'SUPPLIER',
        actorId: session.supplierId,
        notes: note,
      },
    });
  });

  return { success: true, message: 'تم إرسال إشعار النقص بنجاح للإدارة لمراجعته وتحديث الفاتورة.' };
}

/**
 * تأكيد استلام الطرد من المورد بواسطة المندوب أو الإدارة حصراً (وليس المورد وحده)
 */
export async function verifyCourierPackagePickup(
  packageCode: string,
  courierName: string,
  actor: { employeeId?: string; role: 'ADMIN' | 'COURIER' }
) {
  const pkg = await prisma.package.findUnique({
    where: { packageCode },
    include: {
      fulfillmentOrder: {
        include: {
          order: true,
          packages: true,
        },
      },
    },
  });

  if (!pkg) {
    throw new Error(`الطرد ${packageCode} غير موجود.`);
  }

  await prisma.$transaction(async (tx) => {
    // 1. تحديث حالة الطرد
    await tx.package.update({
      where: { id: pkg.id },
      data: {
        status: PACKAGE_STATUS.PICKED_UP,
        pickedUpByCourier: courierName,
        pickedUpAt: new Date(),
        handoverMethod: actor.role === 'ADMIN' ? 'ADMIN_CONFIRMATION' : 'COURIER_SCAN',
      },
    });

    // 2. التحقق من اكتمال كافة طرود أمر التجهيز هذا
    const otherPackages = pkg.fulfillmentOrder.packages.filter((p) => p.id !== pkg.id);
    const allFulfillmentPackagesPicked = otherPackages.every(
      (p) => p.status === PACKAGE_STATUS.PICKED_UP
    );

    if (allFulfillmentPackagesPicked) {
      await tx.fulfillmentOrder.update({
        where: { id: pkg.fulfillmentOrderId },
        data: {
          status: SUPPLIER_FULFILLMENT_STATUS.PICKED_UP,
          pickedUpAt: new Date(),
        },
      });
    }

    // 3. التحقق من اكتمال كافة طرود الطلب العام
    const allOrderPackages = await tx.package.findMany({
      where: {
        fulfillmentOrder: {
          orderId: pkg.fulfillmentOrder.orderId,
        },
      },
    });

    const allOrderPackagesPicked = allOrderPackages.every(
      (p) => p.id === pkg.id || p.status === PACKAGE_STATUS.PICKED_UP
    );

    if (allOrderPackagesPicked) {
      // إذا اكتمل استلام كل الطرود من جميع الموردين:
      // لا ننقل الطلب تلقائياً إلى "خرج للتوصيل" بل إلى اكتمال الجمع أو الوصول لنقطة التجميع
      const isCrossDock = pkg.fulfillmentOrder.order.fulfillmentStrategy === 'CROSS_DOCK';
      const nextStatus = isCrossDock
        ? FULFILLMENT_STATUS.RECEIVED_AT_HUB
        : FULFILLMENT_STATUS.IN_TRANSIT; // اكتمل جمع الطرود ولكن لم ينطلق للتسليم النهائي بعد

      await tx.order.update({
        where: { id: pkg.fulfillmentOrder.orderId },
        data: {
          fulfillmentStatus: nextStatus,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: pkg.fulfillmentOrder.orderId,
          fromStatus: FULFILLMENT_STATUS.IN_TRANSIT,
          toStatus: nextStatus,
          actorType: actor.role,
          actorId: actor.employeeId || courierName,
          notes: isCrossDock
            ? 'وصلت جميع الطرود إلى نقطة تجميع رَواق المركزية (Hub).'
            : 'اكتمل جمع كافة طرود الطلب من الموردين وهي بحوزة المندوب.',
        },
      });
    } else {
      await tx.order.update({
        where: { id: pkg.fulfillmentOrder.orderId },
        data: {
          fulfillmentStatus: FULFILLMENT_STATUS.IN_TRANSIT,
        },
      });
    }

    // 4. تسجيل التدقيق
    await tx.fulfillmentAuditLog.create({
      data: {
        entityType: 'PACKAGE',
        entityId: pkg.id,
        fromStatus: pkg.status,
        toStatus: PACKAGE_STATUS.PICKED_UP,
        actorType: actor.role,
        actorId: actor.employeeId || courierName,
        notes: `تم تأكيد استلام الطرد بواسطة (${courierName})`,
      },
    });
  });

  return { success: true, packageCode };
}

/**
 * إجراء صريح من الإدارة أو شركة الشحن لخروج الشحنة للتسليم النهائي للزبونة (OUT_FOR_DELIVERY)
 * يمنع الانتقال إذا كانت هناك أي طرود لم تُستلم بعد من الموردين
 */
export async function dispatchOrderForFinalDelivery(
  orderId: string,
  courierName: string,
  actorEmployeeId?: string
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      fulfillmentOrders: {
        include: {
          packages: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('الطلب غير موجود.');
  }

  const allPackages = order.fulfillmentOrders.flatMap((f) => f.packages);
  if (allPackages.length === 0) {
    throw new Error('لا توجد طرود مسجلة لهذا الطلب.');
  }

  const allPickedUp = allPackages.every(
    (p) => p.status === PACKAGE_STATUS.PICKED_UP || p.status === PACKAGE_STATUS.RECEIVED_AT_HUB
  );

  if (!allPickedUp) {
    throw new Error('لا يمكن خروج الطلب للتوصيل؛ توجد طرود لم يستلمها المندوب بعد من الموردين!');
  }

  await prisma.$transaction(async (tx) => {
    // 1. تحديث حالة كافة الطرود إلى OUT_FOR_DELIVERY
    await tx.package.updateMany({
      where: {
        id: { in: allPackages.map((p) => p.id) },
      },
      data: {
        status: PACKAGE_STATUS.OUT_FOR_DELIVERY,
      },
    });

    // 2. تحديث حالة الطلب إلى OUT_FOR_DELIVERY
    await tx.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus: FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
      },
    });

    // 3. تسجيل التدقيق
    await tx.fulfillmentAuditLog.create({
      data: {
        entityType: 'ORDER',
        entityId: orderId,
        fromStatus: order.fulfillmentStatus || 'IN_TRANSIT',
        toStatus: FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
        actorType: 'ADMIN',
        actorId: actorEmployeeId || courierName,
        notes: `انطلقت الشحنة المجمعة مع المندوب (${courierName}) للتسليم النهائي للزبونة.`,
      },
    });
  });

  return { success: true, orderId };
}
