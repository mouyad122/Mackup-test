import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultTerms = {
    titleAr: 'الشروط والأحكام',
    titleEn: 'Terms & Conditions',
    contentAr: `مرحباً بك في ميكاب ديمو. بدخولك واستخدامك لموقعنا الإلكتروني، فإنك توافق على الالتزام بالشروط والأحكام التالية:

1. **الطلبات والتسعير:**
   - جميع الأسعار المعروضة هي بالدينار الأردني (JOD) وقد تخضع لرسوم توصيل إضافية يتم احتسابها بناءً على المنطقة المحددة.
   - نحن نحتفظ بالحق في تعديل الأسعار أو تصحيح الأخطاء دون إشعار مسبق.

2. **الدفع والتوصيل:**
   - يتم الدفع عند الاستلام (Cash on Delivery) أو من خلال الترتيب عبر محادثة WhatsApp.
   - نلتزم بتسليم المنتجات بالتعاون مع شركات الخدمات اللوجستية المعتمدة لدينا.

3. **الملكية الفكرية:**
   - جميع التصاميم والشعارات والمحتوى المعروض على هذا الموقع هي ملك حصري لدار ميكاب ديمو ويمنع نسخها أو استخدامها دون إذن خطي مسبق.`,
    contentEn: `Welcome to Makeup Demo. By accessing and using our website, you agree to comply with the following Terms and Conditions:

1. **Orders & Pricing:**
   - All prices shown are in Jordanian Dinars (JOD) and may be subject to additional shipping fees based on the selected zone.
   - We reserve the right to modify prices or correct errors without prior notice.

2. **Payment & Logistics:**
   - Payments are settled via Cash on Delivery (COD) or bank transfer arranged via WhatsApp.
   - Deliveries are executed in partnership with our approved logistics providers.

3. **Intellectual Property:**
   - All designs, logos, and content displayed on this website are the exclusive property of Makeup Demo.`
  };

  const cms = await getCMSContent('terms_of_service', defaultTerms);

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
