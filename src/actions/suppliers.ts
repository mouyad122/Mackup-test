'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const supplierSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
});

const offerSchema = z.object({
  supplierId: z.string().uuid(),
  variantId: z.string().uuid(),
  unitCost: z.coerce.number().finite().min(0).max(1000000),
  sharePercent: z.coerce.number().finite().min(0).max(100),
  stock: z.coerce.number().int().min(0).max(1000000),
  supplierSku: z.string().trim().max(100).optional(),
});

export async function createSupplier(formData: FormData) {
  await requirePermission('manage:settings');
  const input = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  await prisma.supplier.create({ data: input.data });
  revalidatePath('/admin/suppliers');
}

export async function saveSupplierOffer(formData: FormData) {
  const session = await requirePermission('manage:settings');
  const input = offerSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return;
  const { supplierId, variantId, unitCost, sharePercent, stock, supplierSku } = input.data;
  const [supplier, variant] = await Promise.all([
    prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true, isActive: true } }),
    prisma.productVariant.findUnique({ where: { id: variantId }, select: { id: true } }),
  ]);
  if (!supplier?.isActive || !variant) return;

  await prisma.$transaction(async tx => {
    const where = { supplierId_variantId: { supplierId, variantId } };
    const previous = await tx.supplierOffer.findUnique({ where, select: { id: true, stock: true } });
    const offer = await tx.supplierOffer.upsert({
      where,
      create: {
        supplierId, variantId, unitCost: Math.round(unitCost * 1000),
        supplierProfitShareBps: Math.round(sharePercent * 100), stock, supplierSku: supplierSku || null,
      },
      update: {
        unitCost: Math.round(unitCost * 1000),
        supplierProfitShareBps: Math.round(sharePercent * 100), stock, supplierSku: supplierSku || null,
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
