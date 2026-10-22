import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function IngredientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultIngredients = {
    titleAr: 'مكوناتنا',
    titleEn: 'Our Ingredients',
    contentAr: `تختلف المكونات والتفاصيل من منتج إلى آخر. راجعي وصف المنتج وملصق العبوة للاطلاع على المعلومات الخاصة به، وتواصلي معنا إذا احتجتِ إلى مساعدة في فهمها.`,
    contentEn: `Ingredients and product details vary by item. Check the product description and packaging for its specific information, and contact us if you need help understanding it.`
  };

  const cms = await getCMSContent('ingredients_page', defaultIngredients);

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[#3F4832] mb-8 border-b pb-4">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        <div className="text-zinc-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
          {isAr ? cms.contentAr : cms.contentEn}
        </div>
      </div>
    </div>
  );
}
