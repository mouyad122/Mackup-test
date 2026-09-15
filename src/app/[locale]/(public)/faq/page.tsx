import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultFaqs = [
    {
      qAr: 'ما هي جودة وتركيز المكياج لديكم؟',
      qEn: 'What is the quality and concentration of your makeup?',
      aAr: 'مكياجنا مستوحاة ومصممة بأعلى معايير الحرفية وبتركيز Extrait de Parfum لضمان أطول ثبات وانتشار ممكن.',
      aEn: 'Our makeup are crafted at Extrait de Parfum concentrations to ensure the highest possible longevity and sillage.'
    },
    {
      qAr: 'كم يستغرق توصيل الطلب؟',
      qEn: 'How long does delivery take?',
      aAr: 'يستغرق التوصيل داخل عمان من 24 إلى 48 ساعة، وباقي محافظات المملكة خلال 3 أيام عمل.',
      aEn: 'Delivery takes 24 to 48 hours within Amman, and up to 3 working days for other Jordanian governorates.'
    },
    {
      qAr: 'هل يمكنني إرجاع أو استبدال المنتج؟',
      qEn: 'Can I return or exchange my order?',
      aAr: 'نعم، يمكن الإرجاع أو الاستبدال خلال 3 أيام من الاستلام بشرط أن يكون المنتج في حالته الأصلية وغير مفتوح الغلاف (للمنتجات الجاهزة).',
      aEn: 'Yes, returns and exchanges are available within 3 days of delivery, provided the item is unopened and in its original condition (for finished products).'
    }
  ];

  const faqs = await getCMSContent('faq_content', defaultFaqs);

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-8 border-b pb-4">
          {isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
        </h1>
        
        <div className="space-y-6">
          {faqs.map((faq: any, idx: number) => (
            <div key={idx} className="border-b border-zinc-150 pb-4">
              <h3 className="font-bold text-lg text-[var(--color-charcoal-900)] mb-2">
                {isAr ? faq.qAr : faq.qEn}
              </h3>
              <p className="text-zinc-600 leading-relaxed">
                {isAr ? faq.aAr : faq.aEn}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
