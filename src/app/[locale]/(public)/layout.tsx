import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FloatingCart } from '@/components/FloatingCart';
import { AnnouncementBar } from '@/components/AnnouncementBar';
import { prisma } from '@/lib/db';
import React from 'react';

export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const dir = locale === 'en' ? 'ltr' : 'rtl';

  const activeReward = await prisma.rewardRule.findFirst({
    where: { isActive: true, minimumAmount: { gt: 0 } },
    orderBy: { minimumAmount: 'asc' }
  });

  // 1. استرجاع الأقسام المفعلة وشجرتها الهرمية لعرضها في شريط التنقل وتسهيل التصفح
  const allCategories = await prisma.category.findMany({
    where: { isVisible: true },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      children: {
        where: { isVisible: true },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          children: {
            where: { isVisible: true },
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  // إظهار الأقسام الرئيسية في شريط التنقل العلوي مع فروعها
  const rootHeaderCategories = allCategories.filter(c => !c.parentId);
  const displayHeaderCategories = rootHeaderCategories.length > 0 ? rootHeaderCategories : allCategories;


  // 2. التحقق من وجود عروض نشطة فعلية (Point 4: compareAt > price)
  const promoVariant = await prisma.productVariant.findFirst({
    where: {
      isActive: true,
      compareAt: { not: null },
      product: { isVisible: true },
    },
    select: {
      price: true,
      compareAt: true,
    },
  });
  const hasActiveOffers = Boolean(promoVariant && promoVariant.compareAt && promoVariant.compareAt > promoVariant.price);

  return (
    <div data-brand="rawaq" className="rawaq-storefront flex flex-col min-h-screen" dir={dir} lang={locale}>
      <AnnouncementBar locale={locale} />
      <Header categories={displayHeaderCategories} hasActiveOffers={hasActiveOffers} />
      <div className="flex-grow flex-1 bg-[var(--surface-primary)]">
        {children}
      </div>
      <Footer locale={locale} />
      <FloatingCart locale={locale} rewardRule={activeReward} />
    </div>
  );
}
