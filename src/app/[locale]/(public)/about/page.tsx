import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const cms = await getCMSContent('brand_story', {
    titleAr: 'قصة دار ميكاب ديمو',
    titleEn: 'The Story of Makeup Demo',
    contentAr: 'تأسست دار ميكاب ديمو لتقديم فخامة أصيلة تناسب ذوقكم العطري الفريد. نحن نمزج التراث الشرقي مع الحداثة لنصنع عبقاً يدوم ويترك انطباعاً لا ينسى.',
    contentEn: 'Makeup Demo was established to offer authentic luxury tailored to your unique taste. We blend oriental heritage with modern trends to create a lasting impression.'
  });

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-8 border-b pb-4">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        <p className="text-lg text-zinc-700 leading-relaxed whitespace-pre-line">
          {isAr ? cms.contentAr : cms.contentEn}
        </p>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center border-t border-[var(--color-ivory-100)] pt-8">
          <div>
            <h3 className="font-bold text-[var(--color-champagne-600)] text-xl mb-2">
              {isAr ? 'أصالة' : 'Authenticity'}
            </h3>
            <p className="text-sm text-zinc-500">
              {isAr ? 'مكونات طبيعية ونقية' : 'Pure natural ingredients'}
            </p>
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-champagne-600)] text-xl mb-2">
              {isAr ? 'ثبات' : 'Longevity'}
            </h3>
            <p className="text-sm text-zinc-500">
              {isAr ? 'تركيزات تدوم طويلاً' : 'Formulations made to last'}
            </p>
          </div>
          <div>
            <h3 className="font-bold text-[var(--color-champagne-600)] text-xl mb-2">
              {isAr ? 'حرفية' : 'Craftsmanship'}
            </h3>
            <p className="text-sm text-zinc-500">
              {isAr ? 'مزيج فريد ومتقن' : 'Uniquely crafted blends'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
