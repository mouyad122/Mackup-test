import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const defaultPrivacy = {
    titleAr: 'سياسة الخصوصية',
    titleEn: 'Privacy Policy',
    contentAr: `نحن في ميكاب ديمو نلتزم بحماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية البيانات التي تزودنا بها عند زيارة موقعنا:

1. **البيانات التي نجمعها:**
   - الاسم، رقم الهاتف، وعنوان التوصيل عند إتمام الطلب لتسهيل إرسال رسائل WhatsApp والتوصيل.
   - نحن لا نقوم بحفظ أو معالجة تفاصيل بطاقات الدفع مباشرة على خوادمنا.

2. **كيف نستخدم بياناتك:**
   - لمعالجة طلبات الشراء والشحن والتحقق من المخزون.
   - للتواصل معك بخصوص الطلبات والاستفسارات.

3. **حماية البيانات:**
   - نحن نطبق بروتوكولات حماية متقدمة لضمان أمان معلوماتك ومنع الوصول غير المصرح به.`,
    contentEn: `At Makeup Demo, we are committed to protecting your privacy. This policy explains how we collect, use, and secure your personal information:

1. **Information We Collect:**
   - Full name, phone number, and delivery address during checkout to facilitate WhatsApp ordering and delivery.
   - We do not store or process payment card details directly on our servers.

2. **How We Use Your Data:**
   - To process checkout orders, verify stock, and manage logistics.
   - To communicate with you regarding your purchases.

3. **Security:**
   - We implement standard security protocols to safeguard your personal data from unauthorized access.`
  };

  const cms = await getCMSContent('privacy_policy', defaultPrivacy);

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
