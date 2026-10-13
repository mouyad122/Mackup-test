import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الإرجاع | رَواق' : 'Returns Policy | Rawaq',
  };
}

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultReturns = {
    titleAr: 'سياسة الإرجاع والاستبدال',
    titleEn: 'Returns & Exchange Policy',
    contentAr: `يسعدنا تقديم خدمة مريحة لاستبدال أو إرجاع مشترياتكم وفق الشروط التالية:

1. **المنتجات العامة:**
   - يمكن إرجاع المنتج أو استبداله خلال 3 أيام من تاريخ الاستلام.
   - يجب أن يكون المنتج في حالته الأصلية، غير مستخدم، وبغلافه الأصلي غير المفتوح.

2. **الصحة والسلامة (الاستثناءات):**
   - حرصاً منا على صحتكم وسلامتكم، منتجات المكياج والعناية بالبشرة التي تم فتحها أو استخدامها أو إزالة غلافها البلاستيكي لا يمكن إرجاعها أو استبدالها بأي حال من الأحوال، إلا في حال وجود عيب مصنعي.

3. **آلية معالجة الطلبات:**
   - يرجى التواصل معنا عبر واتساب لترتيب عملية الإرجاع أو الاستبدال.
   - سيتم تطبيق رسوم شحن إضافية لخدمة النقل ما لم يكن السبب خطأ مصنعياً.`,
    contentEn: `We are pleased to provide a flexible return/exchange service under the following conditions:

1. **General Products:**
   - Returns and exchanges are accepted within 3 days of delivery.
   - Products must be unused, in their original packaging, and with the plastic wrap intact.

2. **Health & Safety (Exceptions):**
   - For your health and safety, makeup and skincare products that have been opened, used, or had their plastic seal removed cannot be returned or exchanged under any circumstances, unless there is a manufacturing defect.

3. **Return Process:**
   - Please contact us via WhatsApp to arrange returns and exchanges.
   - Standard shipping fees will apply unless the return is due to a factory defect.`
  };

  const cms = await getCMSContent('returns_policy', defaultReturns);

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4B32] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">YOUR PEACE OF MIND</p>
        <h1 className="mt-4 text-4xl md:text-5xl !text-white">{isAr ? cms.titleAr : cms.titleEn}</h1>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-8 max-w-4xl mx-auto -mt-10 relative z-10">
        <div className="rounded-3xl border border-[#E9DDCC] bg-white p-8 sm:p-12 shadow-[0_4px_24px_rgba(139,30,45,.04)]">
          <div className="prose prose-zinc max-w-none text-[#746A64] leading-loose whitespace-pre-line prose-headings:text-[#2B2B2B] prose-strong:text-[#2B2B2B] marker:text-[#B7935F]">
            {isAr ? cms.contentAr : cms.contentEn}
          </div>
        </div>
      </section>
    </main>
  );
}
