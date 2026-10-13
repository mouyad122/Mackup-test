'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireSuperAdmin } from '@/lib/dal';

export async function updateGlobalSizePrice(size: string, priceInFils: number, adminId: string) {
  try {
    await requireSuperAdmin();

    if (priceInFils <= 0) {
      return { success: false, error: 'يجب أن يكون السعر قيمة موجبة' };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Get existing global size prices
      const settings = await tx.siteSettings.findUnique({
        where: { key: 'global_size_prices' }
      });

      let currentPrices: Record<string, number> = {
        '50ml': 10000,
        '100ml': 15000,
        '200ml': 25000
      };

      if (settings) {
        try {
          currentPrices = JSON.parse(settings.value);
        } catch (e) {
          // fallback
        }
      }

      currentPrices[size] = priceInFils;

      // 2. Save back to SiteSettings
      await tx.siteSettings.upsert({
        where: { key: 'global_size_prices' },
        update: { value: JSON.stringify(currentPrices) },
        create: { key: 'global_size_prices', value: JSON.stringify(currentPrices) }
      });

      const { count } = await tx.productVariant.updateMany({
        where: { name: size },
        data: { price: priceInFils }
      });

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          employeeId: adminId,
          action: 'GLOBAL_PRICING_UPDATED',
          entityType: 'GlobalPricingSettings',
          entityId: '1',
          details: JSON.stringify({ size, priceInFils, updatedCount: count })
        }
      });

      return { success: true, updatedCount: count };
    });

    return result;
  } catch (error: any) {
    return { success: false, error: 'حدث خطأ أثناء تعديل السعر' };
  }
}

export async function applyPricesToSelection({
  pricesInFils,
  productIds,
  categoryId,
  adminId,
  updateGlobalSettings
}: {
  pricesInFils: Record<string, number>;
  productIds?: string[];
  categoryId?: string;
  adminId: string;
  updateGlobalSettings: boolean;
}) {
  try {
    await requireSuperAdmin();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Optionally update global settings
      if (updateGlobalSettings) {
        await tx.siteSettings.upsert({
          where: { key: 'global_size_prices' },
          update: { value: JSON.stringify(pricesInFils) },
          create: { key: 'global_size_prices', value: JSON.stringify(pricesInFils) }
        });
      }

      // 2. Determine which products to affect
      let whereClause: any = {};
      if (productIds && productIds.length > 0) {
        whereClause.id = { in: productIds };
      } else if (categoryId && categoryId !== 'ALL') {
        whereClause.categoryId = categoryId;
      }

      // Find affected products
      const products = await tx.product.findMany({
        where: whereClause,
        select: { id: true }
      });
      const ids = products.map(p => p.id);

      if (ids.length === 0) return { success: true, updatedCount: 0 };

      // 3. Update their variants
      let updatedCount = 0;
      for (const [size, price] of Object.entries(pricesInFils)) {
        if (price <= 0) continue;
        
        const { count } = await tx.productVariant.updateMany({
          where: {
            productId: { in: ids },
            name: size
          },
          data: {
            price: price
          }
        });
        updatedCount += count;
      }

      // 4. Record audit log
      await tx.auditLog.create({
        data: {
          employeeId: adminId,
          action: 'BULK_PRICING_APPLIED',
          entityType: 'ProductVariant',
          entityId: 'MULTIPLE',
          details: JSON.stringify({ pricesInFils, affectedProducts: ids.length, updatedVariants: updatedCount })
        }
      });

      return { success: true, updatedCount };
    });

    return result;
  } catch (error: any) {
    return { success: false, error: 'حدث خطأ أثناء تعديل الأسعار' };
  }
}


export async function getGlobalSizePrices() {
  const settings = await prisma.siteSettings.findUnique({
    where: { key: 'global_size_prices' }
  });

  if (!settings) {
    return {
      '50ml': 10000,
      '100ml': 15000,
      '200ml': 25000
    };
  }

  try {
    return JSON.parse(settings.value) as Record<string, number>;
  } catch (e) {
    return {
      '50ml': 10000,
      '100ml': 15000,
      '200ml': 25000
    };
  }
}
