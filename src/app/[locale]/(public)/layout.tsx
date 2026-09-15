import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { FloatingCart } from '@/components/FloatingCart';
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

  return (
    <div className="flex flex-col min-h-screen" dir={dir} lang={locale}>
      <Header />
      <main className="flex-grow flex-1 bg-[var(--color-ivory-100)]">
        {children}
      </main>
      <Footer locale={locale} />
      <FloatingCart locale={locale} />
    </div>
  );
}
