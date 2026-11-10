import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الاستبدال والإرجاع | رَواق' : 'Returns & Exchange Policy | Rawaq',
    description: isAr
      ? 'سياسة الاستبدال والإرجاع الرسمية لمتجر رَواق وضوابط فتح المنتجات وحماية المستهلك وفق القانون الأردني.'
      : 'Official returns and exchange policy for Rawaq under Jordanian Consumer Protection Laws.',
  };
}

export default async function ReturnsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultReturns = {
    titleAr: 'سياسة الاستبدال والإرجاع وضوابط فتح المنتجات',
    titleEn: 'Returns, Exchanges & Product Opening Policy',
    contentAr: `رَواق | RAWAQ
سياسة الاستبدال والإرجاع الرسمية وضوابط فتح المنتجات
الإصدار: JO-2026-v1.0 (المتوافق مع قانون حماية المستهلك الأردني رقم 7 لسنة 2017)

أولاً: سياسة فتح المنتجات والاستخدام (الحماية الصحية وضمان الجودة)
حرصاً على سلامة وصحة عملائنا الكرام، لا تقبل رَواق طلبات الإرجاع أو الاستبدال الاختيارية للمنتجات التي تم:
1. استخدامها أو تجربتها بأي شكل من الأشكال.
2. نزع أختام الحماية أو الغلاف البلاستيكي أو التغليف الصحي المفرغ من الهواء الخاص بها.
3. إحداث أي تغيير أو تلف في علبتها أو حالتها الأصلية المسلمة.

يشمل هذا المنع بصورة خاصة: مستحضرات التجميل، منتجات العناية بالبشرة، العطور، والمنتجات ذات الاستخدام الشخصي.

ثانياً: المنتجات المعيبة أو غير المطابقة للمواصفات (الحقوق القانونية المكفولة)
يُستثنى من منع الإرجاع أعلاه أي منتج تبين وجود عيب مصنعي فيه أو عدم مطابقته للمواصفات المصرح بها وقت الشراء:
- عملاً بأحكام المادتين (6) و(7) من قانون حماية المستهلك الأردني رقم (7) لسنة 2017، يحق للعميلة طلب إرجاع السلعة المعيبة أو استبدالها واسترداد ثمنها.
- لا يُعتبر مجرد فتح صندوق الشحن الخارجي سبباً لرفض الإرجاع القانوني إذا كان فتح الصندوق ضرورياً لاكتشاف العيب أو عدم المطابقة.

ثالثاً: خطوات تقديم طلب الإرجاع أو الشكوى
1. التواصل مع فريق خدمة عملاء رَواق الرسمي عبر واتساب أو قنوات الاتصال المعتمدة.
2. تزويد الفريق برقم الطلب (#ORD) وتوضيح سبب الطلب مع صور واضحة للمنتج والتغليف.
3. يُنظم استلام الطرد بالتنسيق مع شركة التوصيل لإجراء الفحص الفني واعتماد القرار النظامي.
4. تُرد المبالغ المستحقة وفق الآلية المصرفية أو وسيلة الدفع المعتمدة وفق الأنظمة المعمول بها.

رَواق | أناقة من روح الأصالة 🌿`,
    contentEn: `RAWAQ | Returns, Exchanges & Product Opening Policy
Edition: JO-2026-v1.0 (Compliant with Jordanian Consumer Protection Law No. 7 of 2017)

1. Opened Products & Hygiene Protection Policy
For customer health, safety, and hygiene standards, Rawaq does not accept voluntary returns or exchanges for items that have been:
- Used or sampled.
- Had protective, tamper-evident, or hygienic plastic seals removed or breached.
- Altered from their original delivered condition.
This strictly applies to cosmetics, skincare, and fragrance lines.

2. Defective or Non-Conforming Items (Statutory Consumer Rights)
Under Articles 6 and 7 of the Jordanian Consumer Protection Law No. 7 of 2017:
- Consumers are entitled to repair, replacement, or refund for defective or non-conforming goods.
- Opening the outer shipping carton does not waive statutory defect rights when necessary to inspect the goods.

3. Return Procedures
Please reach out to official Rawaq support with your order reference (#ORD) and supporting photos.

Rawaq | Elegance Rooted in Heritage 🌿`
  };

  const cms = await getCMSContent('returns_policy', defaultReturns);

  return (
    <main className="min-h-screen bg-[#F7F3EA]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">FAIR & TRANSPARENT</p>
        <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold font-heading !text-white">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-[#D9C6A8] font-mono">
          {isAr ? 'حماية المستهلك وضمان الجودة — الإصدار JO-2026-v1.0' : 'Consumer Rights & Quality Assurance — Edition JO-2026-v1.0'}
        </p>
      </section>

      <section className="py-12 sm:py-16 px-5 sm:px-8 max-w-4xl mx-auto -mt-10 relative z-10">
        <div className="rounded-3xl border border-[#E9DDCC] bg-white p-7 sm:p-12 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E9DDCC] pb-4 text-xs font-semibold text-stone-500">
            <span>{isAr ? 'قانون حماية المستهلك الأردني رقم (7) لسنة 2017' : 'Jordanian Consumer Protection Law'}</span>
            <span className="font-mono text-[#3F4832] font-bold">JO-2026-v1.0</span>
          </div>

          <div className="prose prose-zinc max-w-none text-[#4A4643] leading-relaxed whitespace-pre-line text-sm sm:text-base prose-headings:text-[#2B2B2B] prose-strong:text-[#2B2B2B]">
            {isAr ? cms.contentAr : cms.contentEn}
          </div>
        </div>
      </section>
    </main>
  );
}
