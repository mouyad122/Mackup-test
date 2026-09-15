import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function IngredientsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultIngredients = {
    titleAr: 'مكوناتنا',
    titleEn: 'Our Ingredients',
    contentAr: `في ميكاب ديمو، نؤمن بأن المكياج هو رسالة صامتة، ولذلك نحرص على انتقاء أفضل المكونات والزيوت العطرية من مصادرها الطبيعية الموثوقة حول العالم.

1. **الزيوت الطبيعية:**
   نحن نستخدم زيوتاً عطرية نقية خالية من الإضافات الكيميائية الضارة، لنضمن لك ثباتاً عالياً ورائحة فواحة لا تتغير مع مرور الوقت.

2. **العود والمسك:**
   يتم استيراد أفخم أنواع العود والمسك والعنبر من أعرق المصادر في الشرق الأوسط وآسيا لتشكيل قاعدة مكياجنا الشرقية الأصيلة.

3. **الكحول الطبي:**
   نستخدم كحولاً مخصصاً لصناعة المكياج التجميلية عالي النقاء، مما يجعله آمناً على البشرة ولا يسبب أي تحسس.`,
    contentEn: `At Makeup Demo, we believe that makeup is a silent message, which is why we carefully select the best ingredients and essential oils from reliable natural sources worldwide.

1. **Natural Oils:**
   We use pure essential oils free of harmful chemical additives, ensuring high longevity and a vibrant scent that doesn't alter over time.

2. **Oud & Musk:**
   The finest types of Oud, Musk, and Amber are imported from the most prestigious sources in the Middle East and Asia to form the base of our authentic oriental makeup.

3. **Cosmetic Alcohol:**
   We use high-purity cosmetic alcohol designed specifically for makeupry, making it safe for the skin and hypoallergenic.`
  };

  const cms = await getCMSContent('ingredients_page', defaultIngredients);

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-8 border-b pb-4">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        <div className="text-zinc-700 leading-relaxed whitespace-pre-line text-sm md:text-base">
          {isAr ? cms.contentAr : cms.contentEn}
        </div>
      </div>
    </div>
  );
}
