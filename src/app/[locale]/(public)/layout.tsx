import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FloatingCart } from '@/components/FloatingCart';
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

  return (
    <div data-brand="rawaq" className="rawaq-storefront flex flex-col min-h-screen" dir={dir} lang={locale}>
      <Header />
      <div className="flex-grow flex-1 bg-[var(--surface-primary)]">
        {children}
      </div>
      <Footer locale={locale} />
      <FloatingCart locale={locale} rewardRule={activeReward} />
    </div>
  );
}
