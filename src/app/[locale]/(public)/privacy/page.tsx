import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الخصوصية | رَواق' : 'Privacy Policy | Rawaq',
  };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultPrivacy = {
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    contentAr: `في رَواق، نلتزم بحماية خصوصية زوارنا وعملائنا.

**المعلومات التي نجمعها:**
- نجمع المعلومات الأساسية مثل الاسم، رقم الهاتف، وعنوان التوصيل عند إجراء طلب.
- قد نجمع بيانات التصفح لتحسين تجربة المستخدم عبر الموقع.

**استخدام المعلومات:**
- نستخدم معلوماتك لمعالجة طلباتك وتوصيلها بنجاح.
- قد نستخدم رقم هاتفك (واتساب) لإرسال تحديثات الطلب أو العروض الترويجية (يمكنك إلغاء الاشتراك في أي وقت).

**حماية البيانات:**
- لا نقوم ببيع أو مشاركة معلوماتك الشخصية مع أطراف ثالثة إلا لغايات توصيل الطلبات (مثل شركات الشحن المعتمدة لدينا).`,
    contentEn: `At Rawaq, we are committed to protecting the privacy of our visitors and customers.

**Information We Collect:**
- We collect essential information such as name, phone number, and delivery address when you place an order.
- We may collect browsing data to improve user experience on the site.

**Use of Information:**
- We use your information to process and deliver your orders successfully.
- We may use your phone number (WhatsApp) to send order updates or promotional offers (you can opt-out at any time).

**Data Protection:**
- We do not sell or share your personal information with third parties, except for the purpose of order delivery (e.g., our authorized shipping partners).`
  };

  const cms = await getCMSContent('privacy_policy', defaultPrivacy);

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">YOUR DATA</p>
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
