'use server';

import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function getPaginatedProducts({
  skip = 0,
  take = 40,
  categoryId = '',
  q = '',
}: {
  skip?: number;
  take?: number;
  categoryId?: string;
  q?: string;
}) {
  const where: Prisma.ProductWhereInput = { isVisible: true };
  
  if (categoryId) where.categoryId = categoryId;
  
  if (q) {
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } }
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take,
      include: {
        variants: { orderBy: { price: 'asc' } },
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where })
  ]);

  for (const product of products) for (const variant of product.variants) {
    variant.stock = variant.isActive ? 1 : 0;
  }
  return { success: true, products, total };
}
