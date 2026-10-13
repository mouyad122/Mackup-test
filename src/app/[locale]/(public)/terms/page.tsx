import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الشروط والأحكام | رَواق' : 'Terms & Conditions | Rawaq',
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultTerms = {
    titleAr: 'الشروط والأحكام',
    titleEn: 'Terms & Conditions',
    contentAr: `مرحباً بك في موقع رَواق. باستخدامك لهذا الموقع، فإنك توافق على الشروط والأحكام التالية:

**1. عام:**
- تحتفظ رَواق بالحق في تعديل هذه الشروط والأحكام في أي وقت دون إشعار مسبق.
- يُعد استخدامك المستمر للموقع بعد أي تغييرات بمثابة قبول منك لهذه التغييرات.

**2. المنتجات والأسعار:**
- نبذل قصارى جهدنا لضمان دقة أسعار وتفاصيل المنتجات.
- في حال حدوث خطأ في تسعير منتج قمت بطلبه، سنقوم بإبلاغك وإعطائك خيار تأكيد الطلب بالسعر الصحيح أو إلغائه.

**3. الطلبات:**
- تخضع جميع الطلبات للتوفر وتأكيد سعر الطلب.
- قد نرفض معالجة طلب ما في أي وقت وفقاً لتقديرنا المطلق.

**4. حقوق الملكية الفكرية:**
- جميع المحتويات الموجودة على هذا الموقع، بما في ذلك النصوص والرسومات والشعارات والصور، هي ملك لرَواق ومحمية بموجب حقوق النشر.`,
    contentEn: `Welcome to Rawaq. By using this website, you agree to the following terms and conditions:

**1. General:**
- Rawaq reserves the right to modify these terms and conditions at any time without prior notice.
- Your continued use of the site following any changes constitutes your acceptance of such changes.

**2. Products and Prices:**
- We make every effort to ensure the accuracy of product prices and details.
- In the event of an error in the pricing of a product you have ordered, we will inform you and give you the option of reconfirming your order at the correct price or cancelling it.

**3. Orders:**
- All orders are subject to availability and confirmation of the order price.
- We may refuse to process a transaction for any reason or refuse service to anyone at any time at our sole discretion.

**4. Intellectual Property Rights:**
- All content on this site, including text, graphics, logos, and images, is the property of Rawaq and is protected by copyright laws.`
  };

  const cms = await getCMSContent('terms_conditions', defaultTerms);

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4B32] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">OUR AGREEMENT</p>
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
