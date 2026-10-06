'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isTerminalDeliveryOrderStatus } from '@/lib/business-finance';

const paymentSchema = z.object({
  amount: z.coerce.number().finite().positive().max(100000),
  paymentMethod: z.enum(['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER']),
  reference: z.string().trim().max(120).optional(), notes: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().uuid(),
});

export async function createCaptain(formData: FormData) {
  await requirePermission('manage:settings');
  const parsed = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(7).max(30), notes: z.string().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.captain.create({ data: parsed.data });
  revalidatePath('/admin/captains');
}

export async function updateCaptain(id: string, formData: FormData) {
  await requirePermission('manage:settings');
  const parsed = z.object({ name: z.string().trim().min(2).max(120), phone: z.string().trim().min(7).max(30), notes: z.string().trim().max(500).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await prisma.captain.update({ where: { id }, data: parsed.data });
  revalidatePath('/admin/captains');
}

export async function setCaptainActive(id: string, isActive: boolean) {
  await requirePermission('manage:settings');
  const activeAssignments = await prisma.deliveryAssignment.count({ where: { captainId: id, status: { in: ['ASSIGNED', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } });
  if (!isActive && activeAssignments > 0) throw new Error('لا يمكن إيقاف مندوب لديه توصيلات نشطة.');
  await prisma.captain.update({ where: { id }, data: { isActive, status: isActive ? (activeAssignments > 0 ? 'BUSY' : 'AVAILABLE') : 'INACTIVE' } });
  revalidatePath('/admin/captains');
}

export async function assignCaptain(formData: FormData) {
  const session = await requirePermission('manage:settings');
  const input = z.object({ orderId: z.string().uuid(), captainId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const { orderId, captainId } = input.data;
  await prisma.$transaction(async tx => {
    const [order, captain] = await Promise.all([
      tx.order.findUnique({ where: { id: orderId }, include: { deliveryAssignment: true } }),
      tx.captain.findUnique({ where: { id: captainId } }),
    ]);
    if (!order || !captain?.isActive || captain.status !== 'AVAILABLE' || order.status !== 'PREPARED') throw new Error('يجب أن يكون الطلب مجهزاً بالكامل وأن يكون المندوب متاحاً');
    if (order.deliveryAssignment) throw new Error('تم تعيين مندوب لهذا الطلب مسبقاً');
    const zone = order.shippingZoneNameSnapshot
      ? await tx.shippingZone.findFirst({ where: { nameAr: order.shippingZoneNameSnapshot } })
      : null;
    if (!zone || zone.captainEarning === null) throw new Error('حدد أجر المندوب لهذه المنطقة قبل تعيين الطلب.');
    const captainEarning = zone.captainEarning;
    const assignment = await tx.deliveryAssignment.create({ data: {
      orderId, captainId, captainEarning, customerDeliveryFee: order.shippingCost,
      actualCarrierCost: order.actualDeliveryCost, assignedByEmployeeId: session.employeeId,
    } });
    await tx.captain.update({ where: { id: captainId }, data: { status: 'BUSY' } });
    await tx.order.update({ where: { id: orderId }, data: { status: 'ASSIGNED' } });
    await tx.orderStatusHistory.create({ data: { orderId, status: 'ASSIGNED', notes: `Delivery assigned to ${captain.name}` } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_ASSIGNED', entityType: 'DeliveryAssignment', entityId: assignment.id, details: JSON.stringify({ orderId, captainId }) } });
  });
  revalidatePath('/admin/captains');
  revalidatePath('/admin/orders');
}

export async function reassignCaptain(assignmentId: string, captainId: string) {
  const session = await requirePermission('manage:settings');
  const input = z.object({ assignmentId: z.string().uuid(), captainId: z.string().uuid() }).safeParse({ assignmentId, captainId });
  if (!input.success) return;
  await prisma.$transaction(async tx => {
    const assignment = await tx.deliveryAssignment.findUnique({ where: { id: assignmentId }, include: { captain: true, order: true } });
    const nextCaptain = await tx.captain.findUnique({ where: { id: captainId } });
    if (!assignment || !nextCaptain?.isActive || nextCaptain.status !== 'AVAILABLE') throw new Error('المندوب الجديد غير متاح');
    if (['DELIVERED', 'CANCELLED'].includes(assignment.status)) throw new Error('لا يمكن تغيير مندوب توصيل منتهٍ');
    if (assignment.captainId === captainId) return;
    await tx.deliveryAssignment.update({ where: { id: assignment.id }, data: { captainId } });
    await tx.captain.update({ where: { id: assignment.captainId }, data: { status: 'AVAILABLE' } });
    await tx.captain.update({ where: { id: captainId }, data: { status: 'BUSY' } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_REASSIGNED', entityType: 'DeliveryAssignment', entityId: assignment.id, details: JSON.stringify({ previousCaptainId: assignment.captainId, captainId, orderId: assignment.orderId, financialSnapshotUnchanged: true }) } });
  });
  revalidatePath('/admin/captains');
  revalidatePath('/admin/deliveries');
}

export async function updateDeliveryStatus(assignmentId: string, status: string, notes?: string) {
  const session = await requirePermission('manage:settings');
  const allowed = ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];
  if (!allowed.includes(status)) throw new Error('حالة التوصيل غير صالحة');
  await prisma.$transaction(async tx => {
    const assignment = await tx.deliveryAssignment.findUnique({ where: { id: assignmentId }, include: { order: true, captain: true } });
    if (!assignment) throw new Error('التعيين غير موجود');
    if (isTerminalDeliveryOrderStatus(assignment.order.status)) throw new Error('الطلب ملغى أو مسترد أو مكتمل؛ لا يمكن متابعة التوصيل.');
    if (assignment.status === 'DELIVERED' || assignment.status === 'CANCELLED') throw new Error('لا يمكن تغيير حالة توصيل منتهية');
    const transitions: Record<string, string[]> = {
      ASSIGNED: ['PICKED_UP', 'FAILED'],
      PICKED_UP: ['OUT_FOR_DELIVERY', 'FAILED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
      FAILED: ['PICKED_UP'],
    };
    if (!transitions[assignment.status]?.includes(status)) throw new Error('انتقال حالة التوصيل غير صالح');
    const assignmentClaim = await tx.deliveryAssignment.updateMany({ where: { id: assignmentId, status: assignment.status }, data: { status, notes, deliveredAt: status === 'DELIVERED' ? new Date() : undefined } });
    if (assignmentClaim.count !== 1) throw new Error('تم تحديث حالة التوصيل بالتزامن؛ أعد المحاولة.');
    if (status === 'DELIVERED' || status === 'FAILED') {
      await tx.captain.update({ where: { id: assignment.captainId }, data: { status: 'AVAILABLE' } });
    }
    const nextOrderStatus = status === 'DELIVERED' ? 'DELIVERED' : status === 'FAILED' ? 'FAILED_DELIVERY' : status === 'OUT_FOR_DELIVERY' ? 'OUT_FOR_DELIVERY' : 'ASSIGNED';
    const orderClaim = await tx.order.updateMany({ where: { id: assignment.orderId, status: { notIn: ['CANCELLED', 'REFUNDED', 'DELIVERED'] } }, data: { status: nextOrderStatus } });
    if (orderClaim.count !== 1) throw new Error('الطلب ملغى أو مسترد أو مكتمل؛ لا يمكن تحديث التوصيل.');
    await tx.orderStatusHistory.create({ data: { orderId: assignment.orderId, status: status === 'DELIVERED' ? 'DELIVERED' : status, notes: notes || `Delivery status: ${status}` } });
    if (status === 'DELIVERED' && assignment.captainEarning > 0) {
      await tx.financialTransaction.create({ data: {
        businessEventKey: `captain-earning:${assignment.id}`,
        type: 'CAPTAIN_EARNING', direction: 'OUT', amount: assignment.captainEarning,
        orderId: assignment.orderId, captainId: assignment.captainId, deliveryAssignmentId: assignment.id,
        description: `Captain earning for ${assignment.order.reference}`, createdByEmployeeId: session.employeeId,
      } });
    }
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'DELIVERY_STATUS_UPDATED', entityType: 'DeliveryAssignment', entityId: assignment.id, details: JSON.stringify({ status, notes }) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/captains');
  revalidatePath('/admin/orders');
}

export async function settleSupplier(supplierId: string, formData: FormData) {
  const session = await requirePermission('manage:settings');
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;
  const amount = Math.round(data.amount * 1000);
  await prisma.$transaction(async tx => {
    const [obligations, reversals, payments] = await Promise.all([
      tx.financialTransaction.aggregate({ where: { supplierId, type: 'SUPPLIER_OBLIGATION' }, _sum: { amount: true } }),
      tx.financialTransaction.aggregate({ where: { supplierId, type: 'SUPPLIER_OBLIGATION_REVERSAL' }, _sum: { amount: true } }),
      tx.financialTransaction.aggregate({ where: { supplierId, type: 'SUPPLIER_PAYMENT' }, _sum: { amount: true } }),
    ]);
    const outstanding = (obligations._sum.amount ?? 0) - (reversals._sum.amount ?? 0) - (payments._sum.amount ?? 0);
    if (amount > outstanding) throw new Error('قيمة التسوية تتجاوز رصيد المورد المستحق');
    const settlement = await tx.supplierSettlement.create({ data: { supplierId, amount, paymentMethod: data.paymentMethod, reference: data.reference || null, notes: data.notes || null, createdByEmployeeId: session.employeeId } });
    await tx.financialTransaction.create({ data: { businessEventKey: `supplier-settlement:${data.idempotencyKey}`, type: 'SUPPLIER_PAYMENT', direction: 'OUT', amount, supplierId, description: data.notes || 'Supplier settlement', createdByEmployeeId: session.employeeId } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'SUPPLIER_SETTLEMENT_CREATED', entityType: 'SupplierSettlement', entityId: settlement.id, details: JSON.stringify({ amount, paymentMethod: data.paymentMethod }) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/supplier-settlements');
  revalidatePath('/admin/suppliers');
}

export async function settleCaptain(captainId: string, formData: FormData) {
  const session = await requirePermission('manage:settings');
  const parsed = paymentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;
  const amount = Math.round(data.amount * 1000);
  await prisma.$transaction(async tx => {
    const [earnings, payments] = await Promise.all([
      tx.financialTransaction.aggregate({ where: { captainId, type: 'CAPTAIN_EARNING' }, _sum: { amount: true } }),
      tx.financialTransaction.aggregate({ where: { captainId, type: 'CAPTAIN_PAYMENT' }, _sum: { amount: true } }),
    ]);
    const outstanding = (earnings._sum.amount ?? 0) - (payments._sum.amount ?? 0);
    if (amount > outstanding) throw new Error('قيمة التسوية تتجاوز رصيد المندوب المستحق');
    const settlement = await tx.captainSettlement.create({ data: { captainId, amount, paymentMethod: data.paymentMethod, reference: data.reference || null, notes: data.notes || null, createdByEmployeeId: session.employeeId } });
    await tx.financialTransaction.create({ data: { businessEventKey: `captain-settlement:${data.idempotencyKey}`, type: 'CAPTAIN_PAYMENT', direction: 'OUT', amount, captainId, description: data.notes || 'Captain settlement', createdByEmployeeId: session.employeeId } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'CAPTAIN_SETTLEMENT_CREATED', entityType: 'CaptainSettlement', entityId: settlement.id, details: JSON.stringify({ amount, paymentMethod: data.paymentMethod }) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/captain-settlements');
  revalidatePath('/admin/captains');
}

export async function createExpense(formData: FormData) {
  const session = await requirePermission('manage:settings');
  const parsed = z.object({ category: z.enum(['MARKETING', 'PACKAGING', 'SOFTWARE', 'SALARIES', 'OPERATIONS', 'MISC', 'OTHER']), amount: z.coerce.number().finite().positive().max(1000000), expenseDate: z.string().optional(), description: z.string().trim().min(2).max(500), reference: z.string().trim().max(120).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const data = parsed.data;
  const amount = Math.round(data.amount * 1000);
  await prisma.$transaction(async tx => {
    const transaction = await tx.financialTransaction.create({ data: { type: 'EXPENSE', direction: 'OUT', amount, description: data.description, createdByEmployeeId: session.employeeId } });
    await tx.expense.create({ data: { category: data.category, amount, description: data.description, reference: data.reference || null, expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(), createdByEmployeeId: session.employeeId, financialTransactionId: transaction.id } });
  });
  revalidatePath('/admin/expenses');
  revalidatePath('/admin/financials');
}
