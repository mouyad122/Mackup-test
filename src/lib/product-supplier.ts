import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';

const explicitNumber = z.union([z.number(), z.string().trim().min(1)]).transform(Number).pipe(z.number().finite());

export const productSupplierSchema = z.object({
  supplierId: z.string().uuid(),
  supplierUnitCost: explicitNumber.pipe(z.number().min(0).max(1000000)),
  supplierOfferUpdatedAt: z.string().datetime().nullish(),
});

export async function assignProductSupplier(
  tx: Prisma.TransactionClient,
  variantId: string,
  input: z.infer<typeof productSupplierSchema>,
) {
  const supplier = await tx.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier?.isActive) throw new Error('اختر متجراً / مورداً فعالاً لهذه القطعة.');
  const profitMargin = await getSupplierProfitMargin(tx, input.supplierId);

  const where = { supplierId_variantId: { supplierId: input.supplierId, variantId } };
  const previous = await tx.supplierOffer.findUnique({ where });
  if (input.supplierOfferUpdatedAt && previous?.updatedAt.toISOString() !== input.supplierOfferUpdatedAt) {
    throw new Error('تغير مخزون المورد أو عرضه أثناء التعديل. حدّث الصفحة ثم أعد المحاولة.');
  }

  // Keep historical offers, but checkout must use the explicitly selected store.
  await tx.supplierOffer.updateMany({
    where: { variantId, supplierId: { not: input.supplierId }, isActive: true },
    data: { isActive: false },
  });
  const data = {
    unitCost: Math.round(input.supplierUnitCost * 1000),
    supplierProfitShareBps: profitMargin * 100,
    // Legacy quantities are retained for historical records but product setup
    // no longer accepts or adjusts supplier inventory quantities.
    stock: previous?.stock ?? 0,
    isActive: true,
  };
  const offer = await tx.supplierOffer.upsert({
    where,
    create: { supplierId: input.supplierId, variantId, ...data },
    update: data,
  });
}
