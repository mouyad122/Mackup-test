import { prisma } from '@/lib/db';
import { FULFILLMENT_STATUS, PACKAGE_STATUS } from '@/lib/fulfillment/types';
import { getArabicStatusHistoryNote } from '@/lib/order-status';

export interface CompleteOrderDeliveryInput {
  orderId: string;
  source: 'CAPTAIN' | 'ADMIN' | 'DELIVERY_BATCH';
  actorId?: string;
  actorName?: string;
  notes?: string;
  collectedCodAmount?: number; // In Fils
  paymentMethod?: 'CASH' | 'CARD';
}

export interface DeliveryTransitionResult {
  success: boolean;
  orderId: string;
  reference: string;
  alreadyDelivered?: boolean;
}

/**
 * خدمة دورة حياة الطلب المركزية الموحدة (RAWAQ Unified Order Lifecycle Service)
 * تضمن اتساق الحالات التجارية واللوجستية والمالية مع منع أي انتقال غير مطابق للواقع الميداني.
 */
export class OrderLifecycleService {
  /**
   * تأكيد تسليم طلب للزبونة بصورة موحدة وذرية
   * تفحص اكتمال الطرود، وخروج الشحنة، ومنع التكرار، وتحديث كافة الكيانات المرتبطة دفعة واحدة.
   */
  static async completeOrderDelivery(
    input: CompleteOrderDeliveryInput,
    outerTx?: any
  ): Promise<DeliveryTransitionResult> {
    const runInTransaction = async (tx: any) => {
      const { orderId, source, actorId, actorName, notes } = input;

      // 1. قفل صريح على سطر الطلب في PostgreSQL لمنع تضارب العمليات المتزامنة
      await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;

      // 2. تحميل الطلب بكافة ملحقاته (الطرود، التعيين، مهمة التوصيل، الفاتورة)
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          deliveryAssignment: {
            include: {
              captain: true,
            },
          },
          deliveryJob: true,
          deliveryBatch: true,
          fulfillmentOrders: {
            include: {
              packages: true,
            },
          },
          invoice: true,
        },
      });

      if (!order) {
        throw new Error(`الطلب #${orderId} غير موجود.`);
      }

      // 3. التحقق من الـ Idempotency: إذا كان مسلماً مسبقاً
      if (order.status === 'DELIVERED' && order.fulfillmentStatus === 'DELIVERED') {
        return {
          success: true,
          orderId: order.id,
          reference: order.reference,
          alreadyDelivered: true,
        };
      }

      // 4. التحقق من الحالات النهائية التي تمنع التسليم
      if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
        throw new Error(`لا يمكن تسليم طلب ملغي أو مسترد (المرجع: ${order.reference}).`);
      }

      // 5. التحقق الصارم من سلامة وموقع الطرود (Package Physical Integrity)
      const allPackages = order.fulfillmentOrders.flatMap((f: any) => f.packages);

      if (allPackages.length > 0) {
        // فحص هل توجد طرود لم يستلمها المندوب بعد من الموردين
        const unpickedPackages = allPackages.filter(
          (p: any) =>
            !['PICKED_UP', 'RECEIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(p.status)
        );

        if (unpickedPackages.length > 0) {
          // إذا كان الطلب مدرجاً في كشف انطلقت رحلته الميدانية أو تؤكد شركة التوصيل تسليمه
          // فهذا إثبات تشغيلي لاكتمال الاستلام من المورد، فتُرقى الطرود وأوامر التجهيز تلقائياً
          const isConfirmedInTransit =
            input.source === 'DELIVERY_BATCH' ||
            order.deliveryBatch?.status === 'IN_DELIVERY' ||
            order.deliveryBatch?.status === 'COMPLETED' ||
            order.status === 'SHIPPED' ||
            order.fulfillmentStatus === 'OUT_FOR_DELIVERY';

          if (isConfirmedInTransit) {
            await tx.package.updateMany({
              where: { id: { in: unpickedPackages.map((p: any) => p.id) } },
              data: { status: 'OUT_FOR_DELIVERY' },
            });
            await tx.fulfillmentOrder.updateMany({
              where: { id: { in: order.fulfillmentOrders.map((f: any) => f.id) } },
              data: { status: 'PICKED_UP' },
            });
          } else {
            throw new Error(
              `لا يمكن إتمام تسليم الطلب #${order.reference}؛ يوجد (${unpickedPackages.length}) طرد لم يتم استلامها بعد من الموردين!`
            );
          }
        }

        // فحص التجميع المركزي (CROSS_DOCK): يجب أن تكون الطرود قد وصلت وفُحصت في نقطة التجميع
        if (order.fulfillmentStrategy === 'CROSS_DOCK') {
          const notAtHubOrOut = allPackages.filter(
            (p: any) =>
              !['RECEIVED_AT_HUB', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(p.status)
          );

          const isConfirmedInTransit =
            input.source === 'DELIVERY_BATCH' ||
            order.deliveryBatch?.status === 'IN_DELIVERY' ||
            order.deliveryBatch?.status === 'COMPLETED' ||
            order.status === 'SHIPPED' ||
            order.fulfillmentStatus === 'OUT_FOR_DELIVERY';

          if (notAtHubOrOut.length > 0 && !isConfirmedInTransit) {
            throw new Error(
              `الطلب #${order.reference} يخضع لنمط التجميع المركزي (CROSS_DOCK)؛ ولم تصل كافة طروده لنقطة التجميع وتُفحص بعد.`
            );
          }
        }
      }

      // 6. التحقق من أن الطلب ليس في حالة ابتدائية (PENDING أو AWAITING_WHATSAPP)
      if (['AWAITING_WHATSAPP', 'PENDING'].includes(order.status)) {
        throw new Error(`الطلب #${order.reference} لم يتم تأكيده بعد ولا يمكن تسليمه مباشرة.`);
      }

      // 7. تحديث الحالة التجارية وحالة التجهيز دفعة واحدة
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'DELIVERED',
          fulfillmentStatus: FULFILLMENT_STATUS.DELIVERED,
        },
      });

      // 8. تحديث حالة كافة الطرود إلى DELIVERED
      if (allPackages.length > 0) {
        await tx.package.updateMany({
          where: {
            id: { in: allPackages.map((p: any) => p.id) },
          },
          data: {
            status: PACKAGE_STATUS.DELIVERED,
          },
        });
      }

      // 9. معالجة مهمة التوصيل اللوجستية (DeliveryJob) ومبلغ الـ COD
      if (order.deliveryJob) {
        const isPrepaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
        const requiresCod = order.deliveryJob.codAmountToCollect > 0 && !isPrepaid;

        let newCodStatus = order.deliveryJob.codStatus;
        let isCodCollected = order.deliveryJob.isCodCollected;
        let collectedAt = order.deliveryJob.collectedAt;
        let collectedByCourier = order.deliveryJob.collectedByCourier;

        // إذا تم تأكيد تسليم الطلب وكان يتطلب COD (غير مدفوع مسبقاً):
        // فإن تسليم الطرد للزبونة يثبت استلام شركة التوصيل للنقد الميداني
        const effectiveCod = input.collectedCodAmount !== undefined
          ? input.collectedCodAmount
          : (requiresCod ? order.deliveryJob.codAmountToCollect : 0);

        if (effectiveCod > 0 || requiresCod) {
          isCodCollected = true;
          newCodStatus = 'COLLECTED_BY_COURIER';
          collectedAt = collectedAt || new Date();
          collectedByCourier = collectedByCourier || actorName || 'شركة التوصيل';
        } else if (!requiresCod) {
          newCodStatus = 'NOT_APPLICABLE';
        }

        await tx.deliveryJob.update({
          where: { id: order.deliveryJob.id },
          data: {
            status: 'DELIVERED',
            isCodCollected,
            codStatus: newCodStatus,
            collectedAt,
            collectedByCourier,
          },
        });
      }

      // 10. معالجة تعيين المندوب والمستحقات (DeliveryAssignment)
      if (order.deliveryAssignment) {
        await tx.deliveryAssignment.update({
          where: { id: order.deliveryAssignment.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            notes: notes || order.deliveryAssignment.notes,
          },
        });

        // تحرير المندوب ليصبح متاحاً للطلبات التالية
        if (order.deliveryAssignment.captainId) {
          await tx.captain.update({
            where: { id: order.deliveryAssignment.captainId },
            data: { status: 'AVAILABLE' },
          });
        }

        // تسجيل استحقاق أجر المندوب في الدفتر المالي (مرة واحدة فقط وبشكل غير مكرر)
        if (order.deliveryAssignment.captainEarning > 0) {
          const earningKey = `captain-earning:${order.deliveryAssignment.id}`;
          const existingEarning = await tx.financialTransaction.findUnique({
            where: { businessEventKey: earningKey },
          });

          if (!existingEarning) {
            await tx.financialTransaction.create({
              data: {
                businessEventKey: earningKey,
                type: 'CAPTAIN_EARNING',
                direction: 'OUT',
                amount: order.deliveryAssignment.captainEarning,
                orderId: order.id,
                captainId: order.deliveryAssignment.captainId,
                deliveryAssignmentId: order.deliveryAssignment.id,
                description: `Captain earning for ${order.reference}`,
                createdByEmployeeId: actorId || order.deliveryAssignment.assignedByEmployeeId,
              },
            });
          }
        }
      }

      // 11. توثيق السجل الزمني التجاري (OrderStatusHistory)
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: 'DELIVERED',
          notes: getArabicStatusHistoryNote('DELIVERED', {
            employeeName: actorName,
            captainName: order.deliveryAssignment?.captain?.name,
            extraNote: `تم تأكيد التسليم النهائي بنجاح عبر (${source}). ${notes || ''}`.trim(),
          }),
        },
      });

      // 12. توثيق سجل التدقيق اللوجستي (FulfillmentAuditLog)
      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: order.id,
          fromStatus: order.fulfillmentStatus || order.status,
          toStatus: FULFILLMENT_STATUS.DELIVERED,
          actorType: source === 'CAPTAIN' ? 'COURIER' : 'ADMIN',
          actorId: actorId || actorName || source,
          notes: `تسليم موثق ومطابق لكافة الطرود (${allPackages.length} طرد) عبر ${source}.`,
        },
      });

      // 13. توثيق سجل التدقيق العام للنظام (AuditLog)
      if (actorId) {
        await tx.auditLog.create({
          data: {
            employeeId: actorId,
            action: 'ORDER_DELIVERY_COMPLETED',
            entityType: 'Order',
            entityId: order.id,
            details: JSON.stringify({
              reference: order.reference,
              source,
              packagesCount: allPackages.length,
            }),
          },
        });
      }

      return {
        success: true,
        orderId: order.id,
        reference: order.reference,
      };
    };

    if (outerTx) {
      return await runInTransaction(outerTx);
    }

    return await prisma.$transaction(runInTransaction, { isolationLevel: 'Serializable' });
  }

  /**
   * تأكيد استلام المندوب للنقد من الزبونة في الميدان (COD = COLLECTED_BY_COURIER)
   */
  static async confirmCourierCodCollection(input: {
    orderId: string;
    courierName: string;
    amountFils: number;
    notes?: string;
  }): Promise<{ success: boolean; codStatus: string }> {
    return await prisma.$transaction(async (tx) => {
      const job = await tx.deliveryJob.findUnique({
        where: { orderId: input.orderId },
        include: { order: true },
      });

      if (!job) {
        throw new Error('مهمة التوصيل غير موجودة.');
      }

      if (job.codStatus === 'SETTLED_TO_RAWAQ') {
        throw new Error('تم توريد وتسوية هذا المبلغ إلى خزينة رَواق مسبقاً.');
      }

      await tx.deliveryJob.update({
        where: { id: job.id },
        data: {
          isCodCollected: true,
          codStatus: 'COLLECTED_BY_COURIER',
          collectedAt: new Date(),
          collectedByCourier: input.courierName,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: input.orderId,
          fromStatus: job.codStatus,
          toStatus: 'COLLECTED_BY_COURIER',
          actorType: 'COURIER',
          actorId: input.courierName,
          notes: `أكد المندوب (${input.courierName}) استلام مبلغ الدفع عند الاستلام (${input.amountFils / 1000} د.أ) نقداً من الزبونة.`,
        },
      });

      return { success: true, codStatus: 'COLLECTED_BY_COURIER' };
    });
  }

  /**
   * تسوية وإيداع النقد المحصل من المندوب في خزينة رَواق وتحديث الفاتورة (COD = SETTLED_TO_RAWAQ)
   * يفصل التحصيل عن التسوية ويربط المبالغ المحصلة بالفاتورة رسمياً.
   */
  static async settleCourierCodToRawaq(input: {
    orderId: string;
    employeeId: string;
    amountFils: number;
    paymentMethod: 'CASH' | 'CARD';
    idempotencyKey: string;
    reference?: string;
  }): Promise<{ success: boolean; codStatus: string }> {
    return await prisma.$transaction(async (tx) => {
      const job = await tx.deliveryJob.findUnique({
        where: { orderId: input.orderId },
        include: {
          order: {
            include: {
              invoice: true,
            },
          },
        },
      });

      if (!job) {
        throw new Error('مهمة التوصيل غير موجودة.');
      }

      if (job.codStatus === 'SETTLED_TO_RAWAQ') {
        return { success: true, codStatus: 'SETTLED_TO_RAWAQ' };
      }

      const invoice = job.order.invoice;
      if (!invoice) {
        throw new Error('لا توجد فاتورة مرتبطة بهذا الطلب.');
      }

      const eventKey = `cod-settlement:${input.orderId}:${input.idempotencyKey}`;
      const priorSettlement = await tx.financialTransaction.findUnique({
        where: { businessEventKey: eventKey },
      });

      if (priorSettlement) {
        return { success: true, codStatus: 'SETTLED_TO_RAWAQ' };
      }

      // 1. تحديث مهمة التوصيل إلى SETTLED_TO_RAWAQ
      await tx.deliveryJob.update({
        where: { id: job.id },
        data: {
          codStatus: 'SETTLED_TO_RAWAQ',
          codSettledAt: new Date(),
          codSettledByEmployeeId: input.employeeId,
        },
      });

      // 2. تحديث مبالغ الفاتورة الرسمية وتسجيل الدفعة
      const isCash = input.paymentMethod === 'CASH';
      const newCash = invoice.cashAppliedFils + (isCash ? input.amountFils : 0);
      const newCard = invoice.cardAppliedFils + (!isCash ? input.amountFils : 0);
      const totalCollected = newCash + newCard;
      const newPaymentStatus = totalCollected >= invoice.grossTotalFils ? 'PAID' : 'PARTIALLY_PAID';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          cashAppliedFils: newCash,
          cardAppliedFils: newCard,
          paymentStatus: newPaymentStatus,
        },
      });

      // إذا اكتمل الدفع، تحديث حالة دفع الطلب
      if (newPaymentStatus === 'PAID') {
        await tx.order.update({
          where: { id: input.orderId },
          data: { paymentStatus: 'PAID' },
        });
      }

      // 3. ربط الدفعة بـ Sale إن وُجد
      if (invoice.saleId) {
        await tx.payment.create({
          data: {
            saleId: invoice.saleId,
            method: input.paymentMethod,
            amount: input.amountFils,
            amountTendered: isCash ? input.amountFils : null,
          },
        });
      }

      // 4. تسجيل الحدث المالي لمنع التكرار
      await tx.financialTransaction.create({
        data: {
          businessEventKey: eventKey,
          type: 'COD_SETTLEMENT',
          direction: 'IN',
          amount: input.amountFils,
          orderId: input.orderId,
          saleId: invoice.saleId,
          description: `COD settled from courier for order ${job.order.reference}`,
          createdByEmployeeId: input.employeeId,
        },
      });

      // 5. تسجيل التدقيق
      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: input.orderId,
          fromStatus: job.codStatus,
          toStatus: 'SETTLED_TO_RAWAQ',
          actorType: 'ADMIN',
          actorId: input.employeeId,
          notes: `تم تدقيق وتوريد مبلغ COD (${input.amountFils / 1000} د.أ) إلى حسابات رَواق.`,
        },
      });

      return { success: true, codStatus: 'SETTLED_TO_RAWAQ' };
    });
  }

  /**
   * إسناد مندوب التوصيل وربطه بـ DeliveryJob والمواقع الجغرافية
   */
  static async assignOrderDeliveryCaptain(input: {
    orderId: string;
    captainId: string;
    employeeId: string;
  }): Promise<{ success: boolean; assignmentId: string }> {
    return await prisma.$transaction(async (tx) => {
      const [order, captain] = await Promise.all([
        tx.order.findUnique({
          where: { id: input.orderId },
          include: {
            deliveryAssignment: true,
            deliveryJob: true,
            fulfillmentOrders: {
              include: { packages: true },
            },
          },
        }),
        tx.captain.findUnique({ where: { id: input.captainId } }),
      ]);

      if (!order) throw new Error('الطلب غير موجود.');
      if (!captain?.isActive || captain.status !== 'AVAILABLE') {
        throw new Error('المندوب المحدد غير متاح حالياً.');
      }

      // حساب أجر المندوب بناء على منطقة التوصيل
      const zone = order.shippingZoneNameSnapshot
        ? await tx.shippingZone.findFirst({ where: { nameAr: order.shippingZoneNameSnapshot } })
        : null;

      const captainEarning = zone?.captainEarning ?? 0;

      // إنشاء أو تحديث DeliveryAssignment
      let assignment = order.deliveryAssignment;
      if (!assignment) {
        assignment = await tx.deliveryAssignment.create({
          data: {
            orderId: order.id,
            captainId: captain.id,
            captainEarning,
            customerDeliveryFee: order.shippingCost,
            actualCarrierCost: order.actualDeliveryCost,
            assignedByEmployeeId: input.employeeId,
            status: 'ASSIGNED',
          },
        });
      } else {
        await tx.deliveryAssignment.update({
          where: { id: assignment.id },
          data: {
            captainId: captain.id,
            captainEarning,
            status: 'ASSIGNED',
          },
        });
      }

      // تحديث حالة المندوب ليصبح BUSY
      await tx.captain.update({
        where: { id: captain.id },
        data: { status: 'BUSY' },
      });

      // مزامنة DeliveryJob
      if (order.deliveryJob) {
        await tx.deliveryJob.update({
          where: { id: order.deliveryJob.id },
          data: { status: 'ASSIGNED' },
        });
      }

      // تحديث حالة الطلب
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'ASSIGNED' },
      });

      // توثيق السجل
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'ASSIGNED',
          notes: `تم إسناد الطلب للمندوب (${captain.name}) وتحديد وجهات التوصيل.`,
        },
      });

      return { success: true, assignmentId: assignment.id };
    });
  }

  /**
   * خروج الشحنة المجمعة للتسليم النهائي (OUT_FOR_DELIVERY)
   * يفحص استلام كافة الطرود من الموردين ومن نقطة التجميع
   */
  static async dispatchOrderFinalDelivery(input: {
    orderId: string;
    courierName: string;
    actorEmployeeId?: string;
  }): Promise<{ success: boolean }> {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: {
          fulfillmentOrders: {
            include: { packages: true },
          },
          deliveryAssignment: true,
          deliveryJob: true,
        },
      });

      if (!order) throw new Error('الطلب غير موجود.');

      const allPackages = order.fulfillmentOrders.flatMap((f: any) => f.packages);
      if (allPackages.length === 0) {
        throw new Error('لا توجد طرود مسجلة لهذا الطلب.');
      }

      // فحص هل كل الطرود بحوزة المندوب أو في نقطة التجميع
      const allPickedUp = allPackages.every(
        (p: any) =>
          p.status === PACKAGE_STATUS.PICKED_UP ||
          p.status === PACKAGE_STATUS.RECEIVED_AT_HUB ||
          p.status === PACKAGE_STATUS.OUT_FOR_DELIVERY
      );

      if (!allPickedUp) {
        throw new Error('لا يمكن خروج الطلب للتوصيل؛ توجد طرود لم يستلمها المندوب بعد من الموردين!');
      }

      // تحديث كافة الطرود
      await tx.package.updateMany({
        where: { id: { in: allPackages.map((p: any) => p.id) } },
        data: { status: PACKAGE_STATUS.OUT_FOR_DELIVERY },
      });

      // تحديث حالة الطلب
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'OUT_FOR_DELIVERY',
          fulfillmentStatus: FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
        },
      });

      // تحديث DeliveryJob
      if (order.deliveryJob) {
        await tx.deliveryJob.update({
          where: { id: order.deliveryJob.id },
          data: { status: 'OUT_FOR_DELIVERY' },
        });
      }

      // تحديث DeliveryAssignment
      if (order.deliveryAssignment) {
        await tx.deliveryAssignment.update({
          where: { id: order.deliveryAssignment.id },
          data: { status: 'OUT_FOR_DELIVERY' },
        });
      }

      // توثيق السجل
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'OUT_FOR_DELIVERY',
          notes: `خرج الطلب للتوصيل النهائي للزبونة برفقة (${input.courierName}).`,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: order.id,
          fromStatus: order.fulfillmentStatus || 'IN_TRANSIT',
          toStatus: FULFILLMENT_STATUS.OUT_FOR_DELIVERY,
          actorType: 'ADMIN',
          actorId: input.actorEmployeeId || input.courierName,
          notes: `انطلقت الشحنة المجمعة (${allPackages.length} طرد) للتسليم النهائي للزبونة.`,
        },
      });

      return { success: true };
    });
  }

  /**
   * تسجيل وصول الطرد وفحصه في نقطة تجميع رَواق المركزية (CROSS_DOCK Hub Check-in)
   */
  static async checkinCrossDockPackageAtHub(input: {
    packageCode: string;
    actorEmployeeId: string;
    employeeName?: string;
  }): Promise<{ success: boolean; allPackagesAtHub: boolean }> {
    return await prisma.$transaction(async (tx) => {
      const pkg = await tx.package.findUnique({
        where: { packageCode: input.packageCode },
        include: {
          fulfillmentOrder: {
            include: { order: true },
          },
        },
      });

      if (!pkg) throw new Error(`الطرد ${input.packageCode} غير موجود.`);

      // تحديث حالة الطرد إلى RECEIVED_AT_HUB
      await tx.package.update({
        where: { id: pkg.id },
        data: { status: PACKAGE_STATUS.RECEIVED_AT_HUB },
      });

      // فحص هل كافة طرود هذا الطلب وصلت للمستودع
      const allOrderPackages = await tx.package.findMany({
        where: {
          fulfillmentOrder: { orderId: pkg.fulfillmentOrder.orderId },
        },
      });

      const allAtHub = allOrderPackages.every(
        (p: any) => p.id === pkg.id || p.status === PACKAGE_STATUS.RECEIVED_AT_HUB
      );

      if (allAtHub) {
        await tx.order.update({
          where: { id: pkg.fulfillmentOrder.orderId },
          data: { fulfillmentStatus: FULFILLMENT_STATUS.RECEIVED_AT_HUB },
        });
      }

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'PACKAGE',
          entityId: pkg.id,
          fromStatus: pkg.status,
          toStatus: PACKAGE_STATUS.RECEIVED_AT_HUB,
          actorType: 'ADMIN',
          actorId: input.actorEmployeeId,
          notes: `تم فحص واستلام الطرد في نقطة تجميع رَواق المركزية بواسطة (${input.employeeName || input.actorEmployeeId}).`,
        },
      });

      return { success: true, allPackagesAtHub: allAtHub };
    });
  }

  /**
   * تسجيل تعذر تسليم الطلب للزبونة (FAILED_DELIVERY)
   */
  static async failOrderDelivery(input: {
    orderId: string;
    reason: string;
    actorId?: string;
  }): Promise<{ success: boolean }> {
    return await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { deliveryAssignment: true, deliveryJob: true },
      });

      if (!order) throw new Error('الطلب غير موجود.');

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'FAILED_DELIVERY',
          fulfillmentStatus: FULFILLMENT_STATUS.FAILED_DELIVERY,
        },
      });

      if (order.deliveryJob) {
        await tx.deliveryJob.update({
          where: { id: order.deliveryJob.id },
          data: { status: 'FAILED' },
        });
      }

      if (order.deliveryAssignment) {
        await tx.deliveryAssignment.update({
          where: { id: order.deliveryAssignment.id },
          data: { status: 'FAILED', notes: input.reason },
        });

        await tx.captain.update({
          where: { id: order.deliveryAssignment.captainId },
          data: { status: 'AVAILABLE' },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'FAILED_DELIVERY',
          notes: `تعذر تسليم الطلب: ${input.reason}`,
        },
      });

      await tx.fulfillmentAuditLog.create({
        data: {
          entityType: 'ORDER',
          entityId: order.id,
          fromStatus: order.fulfillmentStatus || order.status,
          toStatus: FULFILLMENT_STATUS.FAILED_DELIVERY,
          actorType: 'COURIER',
          actorId: input.actorId,
          notes: `تعذر تسليم الشحنة للزبونة: ${input.reason}`,
        },
      });

      return { success: true };
    });
  }
}
