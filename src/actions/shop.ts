'use server';

import { prisma } from '@/lib/db';

export async function getPaginatedProducts({
  skip = 0,
  take = 40,
  categoryId = '',
  brandId = '',
  finish = '',
  skinType = '',
  q = '',
  orderBy = 'createdAt_desc'
}: {
  skip?: number;
  take?: number;
  categoryId?: string;
  brandId?: string;
  finish?: string;
  skinType?: string;
  q?: string;
  orderBy?: string;
}) {
  const where: any = { isVisible: true };
  
  if (categoryId) where.categoryId = categoryId;
  if (brandId) where.brandId = brandId;
  if (finish) where.finish = finish;
  if (skinType) where.skinType = skinType;
  
  if (q) {
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } }
    ];
  }

  let orderByClause: any = { createdAt: 'desc' };
  
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
      orderBy: orderByClause
    }),
    prisma.product.count({ where })
  ]);

  return { success: true, products, total };
}
