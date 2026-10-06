'use server';
import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function adjustVariantStock(formData: FormData) {
  const session = await requirePermission('manage:inventory');
  const parsed = z.object({ variantId: z.string().uuid(), quantityDelta: z.coerce.number().int().min(-100000).max(100000).refine(n=>n!==0), type: z.enum(['RECEIVED','RETURN','ADJUSTMENT','DAMAGED']), reason: z.string().trim().min(3).max(300) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  const { variantId, quantityDelta, type, reason } = parsed.data;
  if ((type === 'RECEIVED' || type === 'RETURN') && quantityDelta < 0) throw new Error('الاستلام والإرجاع يجب أن يزيدا المخزون.');
  if (type === 'DAMAGED' && quantityDelta > 0) throw new Error('التالف يجب أن يخفض المخزون.');
  await prisma.$transaction(async tx=>{
    const variant=await tx.productVariant.findUnique({where:{id:variantId},select:{id:true,sku:true,stock:true}});
    if(!variant) throw new Error('الدرجة غير موجودة.');
    const updated=await tx.productVariant.updateMany({where:{id:variantId,...(quantityDelta<0?{stock:{gte:Math.abs(quantityDelta)}}:{})},data:{stock:{increment:quantityDelta}}});
    if(updated.count!==1) throw new Error('المخزون لا يكفي لهذا التخفيض.');
    const after=variant.stock+quantityDelta;
    await tx.inventoryMovement.create({data:{sku:variant.sku,type,quantity:quantityDelta,quantityBefore:variant.stock,quantityAfter:after,employeeId:session.employeeId,reference:reason}});
    await tx.stockAdjustment.create({data:{sku:variant.sku,oldStock:variant.stock,newStock:after,reason:`${type}: ${reason}`}});
    await tx.auditLog.create({data:{employeeId:session.employeeId,action:'INVENTORY_ADJUSTED',entityType:'ProductVariant',entityId:variantId,details:JSON.stringify({type,quantityDelta,quantityBefore:variant.stock,quantityAfter:after,reason})}});
  });
  revalidatePath('/admin/inventory');
}

/** Inspect goods returned from a cancelled in-transit order before making any units sellable again. */
export async function inspectCancelledOrderReturn(orderId: string, formData: FormData) {
  const session = await requirePermission('manage:inventory');
  const ids = formData.getAll('orderItemId').map(String);
  const quantities = formData.getAll('quantity').map(value => Number(value));
  const outcomes = formData.getAll('outcome').map(String);
  const parsed = z.array(z.object({ orderItemId: z.string().uuid(), quantity: z.number().int().min(0), outcome: z.enum(['RESTOCKABLE', 'DAMAGED', 'SUPPLIER_RETURN', 'WRITE_OFF']) })).min(1).safeParse(ids.map((orderItemId, index) => ({ orderItemId, quantity: quantities[index], outcome: outcomes[index] })));
  if (!parsed.success) throw new Error('بيانات فحص المرتجع غير صالحة.');
  await prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || !['CANCELLED', 'REFUNDED'].includes(order.status)) throw new Error('يمكن فحص مرتجع طلب ملغى أو مسترد فقط.');
    if (!order.notes?.includes('[RETURN_PENDING]')) throw new Error('لا يوجد مرتجع ينتظر الفحص لهذا الطلب.');
    const previouslyRestored = await tx.inventoryMovement.count({ where: { reference: { in: [`ORDER_CANCELLATION_${order.reference}`, `REFUNDED_BEFORE_DISPATCH_${order.reference}`] } } });
    if (previouslyRestored > 0) throw new Error('تمت استعادة مخزون هذا الطلب قبل فحص المرتجع.');
    const marker = '[RETURN_INSPECTED]';
    if (order.notes?.includes(marker)) throw new Error('تم فحص مرتجع هذا الطلب مسبقاً.');
    const grouped = new Map<string, number>();
    for (const line of parsed.data) grouped.set(line.orderItemId, (grouped.get(line.orderItemId) ?? 0) + line.quantity);
    if (grouped.size !== order.items.length || order.items.some(item => !grouped.has(item.id) || (grouped.get(item.id) ?? 0) > item.quantity)) {
      throw new Error('أدخل كمية الفحص لكل صنف، على ألا تتجاوز كمية الطلب.');
    }
    const claimed = await tx.order.updateMany({
      where: { id: order.id, status: order.status, notes: order.notes },
      data: { notes: `${order.notes ?? ''}\n${marker}` },
    });
    if (claimed.count !== 1) throw new Error('بدأ فحص هذا المرتجع بالتزامن.');
    for (const line of parsed.data) {
      const item = order.items.find(candidate => candidate.id === line.orderItemId)!;
      if (line.quantity === 0) {
        await tx.stockAdjustment.create({ data: { sku: item.sku, oldStock: 0, newStock: 0, reason: `INSPECTED_RETURN:${order.id}:${item.id}:NOT_RECEIVED` } });
        continue;
      }
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant) throw new Error(`الدرجة غير موجودة: ${item.sku}`);
      if (line.outcome === 'RESTOCKABLE') {
        const changed = await tx.productVariant.updateMany({ where: { id: variant.id }, data: { stock: { increment: line.quantity } } });
        if (changed.count !== 1) throw new Error(`تعذر إعادة تخزين ${item.sku}`);
        if (item.supplierOfferIdSnapshot) {
          const offer = await tx.supplierOffer.update({ where: { id: item.supplierOfferIdSnapshot }, data: { stock: { increment: line.quantity } } });
          await tx.supplierInventoryMovement.create({ data: { supplierOfferId: item.supplierOfferIdSnapshot, quantityDelta: line.quantity, quantityBefore: offer.stock - line.quantity, quantityAfter: offer.stock, reason: 'INSPECTED_RETURN_RESTOCKABLE', reference: order.reference, actorEmployeeId: session.employeeId } });
        }
        await tx.inventoryMovement.create({ data: { sku: variant.sku, type: 'RETURN', quantity: line.quantity, quantityBefore: variant.stock, quantityAfter: variant.stock + line.quantity, employeeId: session.employeeId, reference: `INSPECTED_RETURN_${order.reference}` } });
        const returnedCost = (item.unitCostSnapshot ?? 0) * line.quantity;
        if (returnedCost > 0) await tx.financialTransaction.create({ data: {
          businessEventKey: `return-inspection:${order.id}:${item.id}:restock-cost`,
          type: 'PRODUCT_COST_REVERSAL', direction: 'IN', amount: returnedCost, orderId: order.id,
          supplierId: item.supplierIdSnapshot, description: `Restockable returned goods cost reversal for ${order.reference}`,
          createdByEmployeeId: session.employeeId,
        } });
      } else {
        await tx.stockAdjustment.create({ data: { sku: variant.sku, oldStock: variant.stock, newStock: variant.stock, reason: `${line.outcome}: inspected return from ${order.reference}, quantity ${line.quantity}` } });
        await tx.inventoryMovement.create({ data: { sku: variant.sku, type: line.outcome, quantity: 0, quantityBefore: variant.stock, quantityAfter: variant.stock, employeeId: session.employeeId, reference: `INSPECTED_RETURN_${order.reference}; qty=${line.quantity}` } });
        if (line.outcome === 'SUPPLIER_RETURN' && item.supplierIdSnapshot && item.unitCostSnapshot !== null) {
          const returnedCost = item.unitCostSnapshot * line.quantity;
          if (returnedCost > 0) {
            await tx.financialTransaction.create({ data: {
              businessEventKey: `return-inspection:${order.id}:${item.id}:supplier-cost`,
              type: 'PRODUCT_COST_REVERSAL', direction: 'IN', amount: returnedCost, orderId: order.id,
              supplierId: item.supplierIdSnapshot, description: `Returned goods cost reversal for ${order.reference}`,
              createdByEmployeeId: session.employeeId,
            } });
          }
          const supplierCredit = returnedCost + (order.status === 'REFUNDED' ? (item.supplierAmountSnapshot ?? 0) : 0);
          if (supplierCredit > 0) {
            await tx.financialTransaction.create({ data: {
              businessEventKey: `return-inspection:${order.id}:${item.id}:supplier-obligation`,
              type: 'SUPPLIER_OBLIGATION_REVERSAL', direction: 'IN', amount: supplierCredit, orderId: order.id,
              supplierId: item.supplierIdSnapshot, description: `Supplier credit for returned goods ${order.reference}`,
              createdByEmployeeId: session.employeeId,
            } });
          }
        }
      }
    }
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'RETURN_INSPECTED', entityType: 'Order', entityId: order.id, details: JSON.stringify(parsed.data) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/inventory');
  revalidatePath(`/admin/orders/${orderId}`);
}
