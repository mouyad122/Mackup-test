'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { reverseCaptainSettlement, reverseSupplierSettlement } from './operations';

export type SettleBatchResult =
  | { success: true; reference: string; differenceFils: number; hasDifference: boolean; isPartial?: boolean; outstandingBalanceFils?: number; error?: never }
  | { success: false; error: string; reference?: never; differenceFils?: never; hasDifference?: never; isPartial?: never; outstandingBalanceFils?: never };

export async function settleDeliveryBatchAction(formData: FormData): Promise<SettleBatchResult> {
  const session = await requirePermission('manage:settings');

  const schema = z.object({
    batchId: z.string().uuid(),
    policy: z.enum(['NET_SETTLEMENT', 'GROSS_REMITTANCE']).default('NET_SETTLEMENT'),
    actualReceivedAmount: z.coerce.number().min(0).max(100000),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('BANK_TRANSFER'),
    reference: z.string().trim().max(120).optional(),
    isDiscrepancy: z.enum(['true', 'false']).optional(),
    discrepancyAmount: z.coerce.number().min(0).optional(),
    differenceReason: z.string().trim().max(500).optional(),
    differenceCategory: z.enum([
      'REMITTANCE_SHORTAGE',
      'UNAUTHORIZED_FEE',
      'PRICE_MISMATCH',
      'RETURN_FAILED_DELIVERY',
      'INPUT_ERROR',
      'OTHER',
    ]).optional(),
    idempotencyKey: z.string().uuid(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: 'بيانات التسوية غير مكتملة أو غير صالحة.' };
  }

  const {
    batchId,
    policy,
    actualReceivedAmount,
    paymentMethod,
    reference,
    isDiscrepancy,
    discrepancyAmount,
    differenceReason,
    differenceCategory,
    idempotencyKey,
  } = parsed.data;

  const actualReceivedFils = Math.round(actualReceivedAmount * 1000);

  try {
    const result = await prisma.$transaction(async tx => {
      const batch = await tx.deliveryBatch.findUnique({
        where: { id: batchId },
        include: {
          orders: {
            include: {
              deliveryJob: true,
            },
          },
        },
      });

      if (!batch) throw new Error('الطلبية المجمعة غير موجودة.');

      // التحقق من الحركات السابقة لمنع التكرار ودعم التسويات الجزئية
      const eventKey = `batch-remittance:${batch.id}:${idempotencyKey}`;
      const existingTx = await tx.financialTransaction.findUnique({
        where: { businessEventKey: eventKey },
      });
      if (existingTx) throw new Error('تم تنفيذ هذه الدفعة مسبقاً.');

      // حساب المبالغ المجمعة من الطلبات المسلمة مع استبعاد المدفوع مسبقاً
      const deliveredOrders = batch.orders.filter(o => o.status === 'DELIVERED');
      if (deliveredOrders.length === 0) {
        throw new Error('لا توجد طلبات مسلمة في هذه الطلبية لإجراء التسوية.');
      }

      let collectedCodFils = 0;
      let carrierCostFils = 0;

      for (const order of deliveredOrders) {
        const isPrepaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
        // COD المطلوب تحصيله من الزبون (المبلغ المتبقي فقط بعد استبعاد أي دفع مسبق)
        const codDueFromCustomer = isPrepaid ? 0 : (order.deliveryJob?.codAmountToCollect ?? order.totalAmount ?? 0);

        // إثبات التحصيل الفعلي: لا يُفترض تلقائياً بمجرد التسليم إذا وُجد DeliveryJob غير مثبت التحصيل
        const isVerifiedCollected = Boolean(
          order.deliveryJob?.isCodCollected ||
          order.deliveryJob?.codStatus === 'COLLECTED_BY_COURIER' ||
          order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ'
        );

        const actualCollected = isVerifiedCollected
          ? ((order.deliveryJob as any)?.collectedAmount ?? order.deliveryJob?.codAmountToCollect ?? codDueFromCustomer)
          : (!order.deliveryJob ? codDueFromCustomer : (order.deliveryJob?.isCodCollected ? codDueFromCustomer : 0));

        collectedCodFils += actualCollected;
        carrierCostFils += (order.actualDeliveryCost ?? order.shippingCost ?? 0);
      }

      // صافي التوريد المتوقع = COD المحصل فعلياً - رسوم التوصيل المسموح بخصمها (في حال Net Settlement)
      const expectedRemittanceFils = policy === 'NET_SETTLEMENT'
        ? Math.max(0, collectedCodFils - carrierCostFils)
        : collectedCodFils;

      // حساب التوريدات السابقة
      const previousRemittances = await tx.financialTransaction.findMany({
        where: {
          OR: [
            { businessEventKey: `batch-settlement:${batch.id}` },
            { businessEventKey: { startsWith: `batch-remittance:${batch.id}:` } },
          ],
          type: 'COD_SETTLEMENT',
        },
      });
      const previouslyRemittedFils = previousRemittances.reduce((sum, r) => sum + r.amount, 0);
      const remainingBeforeThisFils = Math.max(0, expectedRemittanceFils - previouslyRemittedFils);

      if (remainingBeforeThisFils <= 0 && previouslyRemittedFils > 0 && actualReceivedFils === 0) {
        throw new Error('تم توريد وتسوية كامل مبالغ هذه الطلبية مسبقاً.');
      }

      // 1. تسجيل قيد استلام النقد في الدفتر المالي (إن كان المبلغ المورد أكبر من 0)
      if (actualReceivedFils > 0) {
        await tx.financialTransaction.create({
          data: {
            businessEventKey: eventKey,
            type: 'COD_SETTLEMENT',
            direction: 'IN',
            amount: actualReceivedFils,
            description: `توريد نقد COD من شركة التوصيل (${batch.courierCompany || 'الناقل'}) لطلبية ${batch.reference} [${reference || 'دفعة'}]`,
            createdByEmployeeId: session.employeeId,
          },
        });
      }

      const totalRemittedAfterThisFils = previouslyRemittedFils + actualReceivedFils;
      const outstandingBalanceFils = Math.max(0, expectedRemittanceFils - totalRemittedAfterThisFils);
      const isFullSettlement = outstandingBalanceFils === 0 && totalRemittedAfterThisFils > 0;

      // 2. إذا وُجد فرق مالي غير مفسر صُرّح به، نفتح بطاقة فرق في ReconciliationDifference
      let differenceRecord = null;
      const flaggedDiffFils = discrepancyAmount ? Math.round(discrepancyAmount * 1000) : 0;
      const hasExplicitDifference = (isDiscrepancy === 'true' && flaggedDiffFils > 0) || Boolean(differenceReason && flaggedDiffFils > 0);

      if (hasExplicitDifference) {
        const diffRef = `DIFF-${batch.reference}-${Date.now().toString().slice(-4)}`;
        differenceRecord = await tx.reconciliationDifference.create({
          data: {
            reference: diffRef,
            entityType: 'DELIVERY_BATCH',
            entityId: batch.id,
            entityName: batch.courierCompany || batch.reference,
            expectedAmount: expectedRemittanceFils,
            actualAmount: totalRemittedAfterThisFils,
            differenceAmount: flaggedDiffFils,
            reasonCategory: differenceCategory || 'PRICE_MISMATCH',
            notes: differenceReason || `فارق بقيمة ${flaggedDiffFils / 1000} د.أ مصرح به في كشف التوصيل`,
            status: 'OPEN',
            createdByEmployeeId: session.employeeId,
          },
        });
      }

      // 3. تحديث DeliveryJob للطلبات المسلمة لتأكيد التوريد لرواق
      const jobIds = deliveredOrders.map(o => o.deliveryJob?.id).filter(Boolean) as string[];
      if (jobIds.length > 0 && isFullSettlement) {
        await tx.deliveryJob.updateMany({
          where: { id: { in: jobIds } },
          data: {
            codStatus: 'SETTLED_TO_RAWAQ',
            codSettledAt: new Date(),
            codSettledByEmployeeId: session.employeeId,
          },
        });
      }

      // 4. تحديث حالة الطلبية المجمعة (COMPLETED أو PARTIALLY_SETTLED)
      await tx.deliveryBatch.update({
        where: { id: batch.id },
        data: {
          status: isFullSettlement ? 'COMPLETED' : 'PARTIALLY_SETTLED',
        },
      });

      // 5. توثيق سجل التدقيق
      await tx.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'DELIVERY_BATCH_RECONCILED',
          entityType: 'DeliveryBatch',
          entityId: batch.id,
          details: JSON.stringify({
            reference: batch.reference,
            policy,
            expectedRemittanceFils,
            actualReceivedFils,
            totalRemittedAfterThisFils,
            outstandingBalanceFils,
            isFullSettlement,
            hasExplicitDifference,
            deliveredOrdersCount: deliveredOrders.length,
          }),
        },
      });

      return {
        success: true as const,
        reference: batch.reference,
        differenceFils: flaggedDiffFils,
        hasDifference: hasExplicitDifference,
        isPartial: !isFullSettlement,
        outstandingBalanceFils,
      };
    }, { isolationLevel: 'Serializable' });

    revalidatePath('/admin/reconciliation');
    revalidatePath('/admin/settings');
    return result;
  } catch (err: any) {
    return { success: false as const, error: err?.message || 'تعذر اعتماد تسوية شركة التوصيل.' };
  }
}

export async function settleCaptainClearingAction(formData: FormData) {
  const session = await requirePermission('manage:settings');

  const schema = z.object({
    captainId: z.string().uuid(),
    actionType: z.enum(['PAY_EARNINGS', 'RECEIVE_COD', 'OFFSET_CLEARING']),
    amount: z.coerce.number().positive().max(100000),
    paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']).default('CASH'),
    reference: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().uuid(),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: 'بيانات التسوية غير صالحة.' };
  }

  const { captainId, actionType, amount, paymentMethod, reference, notes, idempotencyKey } = parsed.data;
  const amountFils = Math.round(amount * 1000);

  try {
    await prisma.$transaction(async tx => {
      const captain = await tx.captain.findUnique({ where: { id: captainId } });
      if (!captain) throw new Error('الكابتن غير موجود.');

      if (actionType === 'OFFSET_CLEARING') {
        // مقاصة مالية موثقة: خصم أجر الكابتن من النقد الموجود في عهدته
        // 1. قيد سداد أجر الكابتن (OUT)
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `clearing-earning:${idempotencyKey}`,
            type: 'CAPTAIN_PAYMENT',
            direction: 'OUT',
            amount: amountFils,
            captainId,
            description: `مقاصة أجر توصيل مقابل عهدة نقدية لـ ${captain.name} ${notes ? `(${notes})` : ''}`,
            createdByEmployeeId: session.employeeId,
          },
        });

        // 2. قيد توريد عهدة نقدية إلى رَواق (IN) مساوية لقيمة الأجر المقتطع
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `clearing-custody:${idempotencyKey}`,
            type: 'COD_SETTLEMENT',
            direction: 'IN',
            amount: amountFils,
            captainId,
            description: `مقاصة توريد عهدة COD مقيدة مقابل أجر التوصيل لـ ${captain.name}`,
            createdByEmployeeId: session.employeeId,
          },
        });

        await tx.auditLog.create({
          data: {
            employeeId: session.employeeId,
            action: 'CAPTAIN_CLEARING_EXECUTED',
            entityType: 'Captain',
            entityId: captainId,
            details: JSON.stringify({ amountFils, notes }),
          },
        });
      } else if (actionType === 'RECEIVE_COD') {
        // استلام عهدة نقدية من الكابتن وتوريدها للخزينة
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `captain-remittance:${idempotencyKey}`,
            type: 'COD_SETTLEMENT',
            direction: 'IN',
            amount: amountFils,
            captainId,
            description: `توريد عهدة نقدية من المندوب (${captain.name}) للخزينة ${notes ? `· ${notes}` : ''}`,
            createdByEmployeeId: session.employeeId,
          },
        });

        await tx.auditLog.create({
          data: {
            employeeId: session.employeeId,
            action: 'CAPTAIN_COD_REMITTED',
            entityType: 'Captain',
            entityId: captainId,
            details: JSON.stringify({ amountFils, paymentMethod }),
          },
        });
      }
    }, { isolationLevel: 'Serializable' });

    revalidatePath('/admin/reconciliation');
    revalidatePath('/admin/captain-settlements');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تنفيذ الإجراء المالي للكابتن.' };
  }
}

export async function resolveDiscrepancyAction(formData: FormData) {
  const session = await requirePermission('manage:settings');

  const schema = z.object({
    diffId: z.string().uuid(),
    action: z.enum(['RESOLVE', 'WRITE_OFF']),
    resolutionNotes: z.string().trim().min(3).max(500),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: 'يرجى تقديم سبب واضح وموثق لمعالجة الفرق.' };
  }

  const { diffId, action, resolutionNotes } = parsed.data;

  try {
    await prisma.$transaction(async tx => {
      const diff = await tx.reconciliationDifference.findUnique({ where: { id: diffId } });
      if (!diff) throw new Error('سجل الفرق غير موجود.');
      if (diff.status !== 'OPEN') throw new Error('تمت معالجة هذا الفرق مسبقاً.');

      const nextStatus = action === 'RESOLVE' ? 'RESOLVED' : 'WRITTEN_OFF';

      await tx.reconciliationDifference.update({
        where: { id: diffId },
        data: {
          status: nextStatus,
          resolutionNotes,
          resolvedByEmployeeId: session.employeeId,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: `RECONCILIATION_DIFFERENCE_${nextStatus}`,
          entityType: 'ReconciliationDifference',
          entityId: diffId,
          details: JSON.stringify({ reference: diff.reference, action, resolutionNotes }),
        },
      });
    }, { isolationLevel: 'Serializable' });

    revalidatePath('/admin/reconciliation');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تحديث حالة الفرق.' };
  }
}

export async function cancelDeliveryBatchSettlementAction(formData: FormData): Promise<{ success: boolean; error?: string; message?: string }> {
  const session = await requirePermission('manage:settings');

  const batchId = formData.get('batchId') as string;
  const reason = (formData.get('reason') as string)?.trim() || 'إلغاء تسوية طلبية معتمد من إدارة الجرد';

  if (!batchId) {
    return { success: false, error: 'معرف الطلبية مفقود.' };
  }

  try {
    const result = await prisma.$transaction(async tx => {
      // البحث عن الطلبية بالـ id أو reference
      const batch = await tx.deliveryBatch.findFirst({
        where: {
          OR: [{ id: batchId }, { reference: batchId }],
        },
        include: {
          orders: {
            select: { id: true, reference: true, deliveryJob: true },
          },
        },
      });

      if (!batch) {
        // فحص ما إذا كان طلباً منفرداً
        const singleOrder = await tx.order.findFirst({
          where: {
            OR: [{ id: batchId }, { reference: batchId }],
          },
          include: { deliveryJob: true },
        });

        if (singleOrder && singleOrder.deliveryJob) {
          await tx.deliveryJob.update({
            where: { id: singleOrder.deliveryJob.id },
            data: {
              codStatus: 'COLLECTED_BY_COURIER',
              codSettledAt: null,
              codSettledByEmployeeId: null,
            },
          });

          await tx.auditLog.create({
            data: {
              employeeId: session.employeeId,
              action: 'DELIVERY_ORDER_SETTLEMENT_CANCELLED',
              entityType: 'Order',
              entityId: singleOrder.id,
              details: JSON.stringify({ reference: singleOrder.reference, reason }),
            },
          });

          return { success: true, reference: singleOrder.reference };
        }

        throw new Error('لم يتم العثور على طلبية التجميع المحددة.');
      }

      // البحث عن الحركات المالية المسجلة للطلبية
      const transactions = await tx.financialTransaction.findMany({
        where: {
          OR: [
            { businessEventKey: `batch-settlement:${batch.id}` },
            { businessEventKey: { startsWith: `batch-remittance:${batch.id}` } },
            { businessEventKey: { startsWith: `reverse-batch-settlement:${batch.id}` } },
          ],
        },
      });

      let netSettledFils = 0;
      for (const t of transactions) {
        if (t.type === 'COD_SETTLEMENT' && t.direction === 'IN') {
          netSettledFils += t.amount;
        } else if (t.type === 'COD_SETTLEMENT_REVERSAL' || t.direction === 'OUT') {
          netSettledFils -= t.amount;
        }
      }

      if (netSettledFils > 0) {
        await tx.financialTransaction.create({
          data: {
            businessEventKey: `reverse-batch-settlement:${batch.id}:${Date.now()}`,
            type: 'COD_SETTLEMENT_REVERSAL',
            direction: 'OUT',
            amount: netSettledFils,
            description: `إلغاء تسوية طلبية ${batch.reference} وإعادة الذمة كعهدة معلقة لدى الناقل · السبب: ${reason}`,
            createdByEmployeeId: session.employeeId,
          },
        });
      }

      // إعادة حالة تحصيل الطلبات إلى COLLECTED_BY_COURIER
      const orderIds = batch.orders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.deliveryJob.updateMany({
          where: {
            orderId: { in: orderIds },
            codStatus: 'SETTLED_TO_RAWAQ',
          },
          data: {
            codStatus: 'COLLECTED_BY_COURIER',
            codSettledAt: null,
            codSettledByEmployeeId: null,
          },
        });
      }

      // إعادة حالة الطلبية إلى IN_DELIVERY
      await tx.deliveryBatch.update({
        where: { id: batch.id },
        data: {
          status: 'IN_DELIVERY',
        },
      });

      // إغلاق أي فروقات مالية معلقة بهذه التسوية
      await tx.reconciliationDifference.updateMany({
        where: {
          entityId: batch.id,
          status: 'OPEN',
        },
        data: {
          status: 'WRITTEN_OFF',
          resolutionNotes: `تم إلغاء تسوية الطلبية ${batch.reference}`,
          resolvedByEmployeeId: session.employeeId,
          resolvedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'DELIVERY_BATCH_SETTLEMENT_CANCELLED',
          entityType: 'DeliveryBatch',
          entityId: batch.id,
          details: JSON.stringify({
            reference: batch.reference,
            reversedAmountFils: netSettledFils,
            reason,
          }),
        },
      });

      return { success: true, reference: batch.reference };
    }, { isolationLevel: 'Serializable' });

    revalidatePath('/admin/reports');
    revalidatePath('/admin/reconciliation');
    revalidatePath('/admin/settings');

    return {
      success: true,
      message: `تم إلغاء تسوية الطلبية ${result.reference} بنجاح وإعادة رصيدها كذمة معلقة.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'تعذر إلغاء تسوية الطلبية.',
    };
  }
}

export async function universalReverseSettlementAction(formData: FormData) {
  const session = await requirePermission('manage:settings');

  const schema = z.object({
    settlementType: z.enum(['SUPPLIER', 'CAPTAIN', 'BATCH', 'DELIVERY_BATCH']),
    settlementId: z.string().trim(),
    reason: z.string().trim().min(3).max(500),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, error: 'بيانات العكس المالي غير صالحة.' };
  }

  const { settlementType, settlementId, reason } = parsed.data;

  if (settlementType === 'SUPPLIER') {
    return reverseSupplierSettlement(settlementId, reason);
  } else if (settlementType === 'BATCH' || settlementType === 'DELIVERY_BATCH') {
    const fd = new FormData();
    fd.append('batchId', settlementId);
    fd.append('reason', reason);
    return cancelDeliveryBatchSettlementAction(fd);
  } else {
    return reverseCaptainSettlement(settlementId, reason);
  }
}
