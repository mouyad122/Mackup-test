import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const locale = searchParams.get('locale') || 'ar';
  const limit = Math.min(parseInt(searchParams.get('limit') || '6'), 10);

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: {
          isVisible: true,
          OR: [
            { nameAr: { contains: q, mode: 'insensitive' } },
            { nameEn: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          images: {
            where: { isMain: true },
            take: 1,
            select: { url: true },
          },
          variants: {
            where: { isActive: true },
            take: 1,
            orderBy: { price: 'asc' },
            select: { price: true },
          },
        },
      }),
      prisma.category.findMany({
        where: {
          isVisible: true,
          name: { contains: q, mode: 'insensitive' },
        },
        take: 4,
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
    ]);

    const results = [
      ...categories.map((c) => ({
        id: c.id,
        nameAr: c.name,
        nameEn: c.name,
        slug: c.slug || c.id,
        type: 'category' as const,
      })),
      ...products.map((p) => ({
        id: p.id,
        nameAr: p.nameAr,
        nameEn: p.nameEn,
        slug: p.slug,
        image: p.images[0]?.url,
        price: p.variants[0]?.price,
        type: 'product' as const,
      })),
    ].slice(0, limit);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('[Search API]', error);
    return NextResponse.json({ results: [] });
  }
}
