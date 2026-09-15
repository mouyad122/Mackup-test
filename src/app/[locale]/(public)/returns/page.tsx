import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
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
