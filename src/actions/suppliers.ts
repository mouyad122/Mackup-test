'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getSupplierProfitMargin, setSupplierProfitMargin } from '@/lib/supplier-margin';

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  profitMargin: z.coerce.number().int().min(0).max(100).default(0),
});

const offerSchema = z.object({
  supplierId: z.string().uuid(),
  variantId: z.string().uuid(),
  unitCost: z.coerce.number().finite().min(0).max(1000000),
  stock: z.union([z.literal(''), z.coerce.number().int().min(0).max(1000000)]).optional(),
  supplierSku: z.string().trim().max(100).optional(),
});

export async function createSupplier(formData: FormData) {
  await requirePermission('manage:settings');
  const input = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const { profitMargin, ...supplierData } = input.data;
  await prisma.$transaction(async tx => {
    const supplier = await tx.supplier.create({ data: supplierData });
    await setSupplierProfitMargin(tx, supplier.id, profitMargin);
  });
  revalidatePath('/admin/suppliers');
}

export async function saveSupplierOffer(formData: FormData) {
  const session = await requirePermission('manage:settings');
  const input = offerSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const { supplierId, variantId, unitCost, stock: rawStock, supplierSku } = input.data;
  const [supplier, variant, profitMargin] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, isActive: true } }),
    prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } }),
    getSupplierProfitMargin(prisma, supplierId),
  ]);
  if (!supplier?.isActive || !variant) return;

  await prisma.$transaction(async tx => {
    const where = { supplierId_variantId: { supplierId, variantId } };
    const previous = await tx.supplierOffer.findUnique({ where, select: { id: true, stock: true } });
    const stock = rawStock === '' || rawStock === undefined ? previous?.stock ?? 0 : rawStock;
    const offer = await tx.supplierOffer.upsert({
      where,
      create: {
        supplierId, variantId, unitCost: Math.round(unitCost * 1000),
        supplierProfitShareBps: profitMargin * 100, stock, supplierSku: supplierSku || null,
      },
      update: {
        unitCost: Math.round(unitCost * 1000),
        supplierProfitShareBps: profitMargin * 100, stock, supplierSku: supplierSku || null,
        isActive: true,
      },
    });
    const quantityBefore = previous?.stock ?? 0;
    if (stock !== quantityBefore) await tx.supplierInventoryMovement.create({ data: {
      supplierOfferId: offer.id, quantityDelta: stock - quantityBefore, quantityBefore, quantityAfter: stock,
      reason: previous ? 'MANUAL_ADJUSTMENT' : 'INITIAL_STOCK', actorEmployeeId: session.employeeId,
    } });
  });
  revalidatePath('/admin/suppliers');
}

export async function setSupplierOfferActive(offerId: string, isActive: boolean) {
  await requirePermission('manage:settings');
  const offer = await prisma.supplierOffer.findUnique({ where: { id: offerId }, include: { supplier: { select: { isActive: true } } } });
  if (!offer || (isActive && !offer.supplier.isActive)) throw new Error('فعّل المورد قبل استخدام عرضه.');
  await prisma.supplierOffer.update({ where: { id: offerId }, data: { isActive } });
  revalidatePath('/admin/suppliers');
}

export async function updateSupplier(id: string, formData: FormData) {
  const session = await requirePermission('manage:settings');
  const input = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) throw new Error('بيانات المورد أو نسبة الربح غير صالحة.');
  await prisma.$transaction(async tx => {
    const previous = await tx.supplier.findUniqueOrThrow({ where: { id } });
    const { profitMargin, ...supplierData } = input.data;
    await tx.supplier.update({ where: { id }, data: supplierData });
    await setSupplierProfitMargin(tx, id, profitMargin);
    await tx.supplierOffer.updateMany({ where: { supplierId: id }, data: { supplierProfitShareBps: input.data.profitMargin * 100 } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'SUPPLIER_UPDATED', entityType: 'Supplier', entityId: id, details: JSON.stringify({ previous, current: input.data }) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/suppliers');
  revalidatePath('/admin/products', 'layout');
}

export async function deleteSupplier(id: string) {
  const session = await requirePermission('manage:settings');
  await prisma.$transaction(async tx => {
    const supplier = await tx.supplier.findUnique({
      where: { id },
      include: { offers: { include: { inventoryMovements: { take: 1 } } }, settlements: { take: 1 } },
    });
    if (!supplier) return;
    if (supplier.settlements.length || supplier.offers.some(offer => offer.inventoryMovements.length)) {
      throw new Error('لا يمكن حذف المورد لأنه مرتبط بسجل مالي أو حركة سابقة. أوقفه بدلاً من ذلك للحفاظ على التاريخ المحاسبي.');
    }
    await tx.supplierOffer.deleteMany({ where: { supplierId: id } });
    await tx.supplier.delete({ where: { id } });
    await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'SUPPLIER_DELETED', entityType: 'Supplier', entityId: id, details: JSON.stringify({ name: supplier.name }) } });
  }, { isolationLevel: 'Serializable' });
  revalidatePath('/admin/suppliers');
  revalidatePath('/admin/products', 'layout');
}
