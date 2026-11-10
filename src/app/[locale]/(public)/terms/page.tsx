import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الشروط والأحكام وسياسة الشراء | رَواق' : 'Terms & Purchase Policy | Rawaq',
    description: isAr
      ? 'الشروط والأحكام الرسمية وسياسات الشراء والاستبدال والإرجاع لمتجر رَواق وفق التشريعات الأردنية النافذة.'
      : 'Official Terms of Service, Purchase and Returns Policy of Rawaq according to Jordanian Laws.',
  };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultTerms = {
    titleAr: 'الشروط والأحكام وسياسة الشراء والاستبدال والإرجاع',
    titleEn: 'Terms & Purchase Policy',
    contentAr: `رَواق | RAWAQ
وثيقة الشروط والأحكام وسياسة الشراء والاستبدال والإرجاع الرسمية
الإصدار المعتمد: JO-2026-v1.0 (وفق أحكام التشريعات الأردنية النافذة)

المادة 1: التعريف بالمنصة
رَواق هي منصة إلكترونية أردنية رائدة متعددة الموردين، تتيح للعملاء استعراض وشراء باقة متنوعة من مستحضرات التجميل، العطور، الأزياء والإكسسوارات من محلات وموردين مستقلين ومرخصين عبر منصة موحدة. تتولى رَواق تنظيم واستقبال الطلبات، تنسيق التجهيز، إصدار الفواتير وخدمة العملاء بالتعاون مع الموردين وشركات التوصيل المعتمدة.

المادة 2: تأكيد الطلب والموافقة المسبقة
- يُعد تقديم الطلب عبر المنصة إقراراً صريحاً بصحة البيانات المدخلة والموافقة التامة على الشروط والأحكام وسياسات البيع المحددة.
- تخضع الطلبات للمراجعة والتحقق من إمكانية التوفير وجاهزية المنتجات لدى المحلات المعتمدة.
- يتم إشعار العميلة بتأكيد الطلب أو أي تعديل عبر وسائل التواصل المعتمدة (بما فيها واتساب ورسائل المنصة).
- يُعرض إجمالي المبلغ بالدينار الأردني ورسوم التوصيل بوضوح وشفافية قبل تقديم الطلب.

المادة 3: سياسة فتح المنتجات واستخدامها (الصحة والسلامة وجودة الأصناف)
حرصاً على سلامة وصحة العملاء وضمان أعلى معايير الجودة، لا تقبل رَواق الإرجاع أو الاستبدال الاختياري للمنتجات التي تم استخدامها، أو إزالة أختام الحماية، أو فتح التغليف الصحي والبلاستيكي الخاص بها، أو تغيير حالتها الأصلية عند الاستلام.
ويشمل ذلك بصورة خاصة مستحضرات التجميل، منتجات العناية بالبشرة، والعطور ذات الطبيعة الشخصية.
ولا يحرم هذا الشرط العميلة من أي حق مكفول قانوناً في حال وجود عيب مصنعي أو عدم مطابقة للمواصفات المعلنة وفق قانون حماية المستهلك الأردني رقم (7) لسنة 2017.

المادة 4: المنتجات المعيبة أو غير المطابقة للمواصفات
- إذا تبين أن المنتج معيب أو تالف أو غير مطابق لما تم طلبه وإعلانه، يحق للعميلة تقديم طلب معالجة أو إرجاع واسترداد الثمن وفقاً للمادتين (6) و(7) من قانون حماية المستهلك الأردني رقم (7) لسنة 2017.
- تقوم رَواق بالتنسيق المباشر مع المورد المختص للتحقق الفني واعتماد الإجراء القانوني المناسب فوراً.
- لا يُرفض طلب الإرجاع القانوني بسبب فتح التغليف الخارجي إذا كان فتحه وسيلة وحيدة ضرورية لاكتشاف العيب أو عدم المطابقة.

المادة 5: آلية تسجيل الشكاوى وطلبات الإرجاع
- يرجى التواصل مع خدمة عملاء رَواق عبر القنوات المعتمدة مع إرفاق رقم الطلب (#ORD) وتوضيح المشكلة وصور توثيقية واضحة للمنتج والتغليف.
- تُنظم عملية استلام المنتج وفحصه بالتعاون مع مندوب التوصيل المعتمد.
- يتم رد المبالغ المستحقة وفق وسيلة الدفع المتفق عليها وبما يتفق مع الأنظمة والتعليمات المالية المعتمدة في المملكة.

المادة 6: التوصيل والاستلام
- يتم التوصيل داخل المملكة الأردنية الهاشمية عبر شركات التوصيل المعتمدة.
- تلتزم العميلة بتزويد المنصة برقم هاتف أردني فعال وعنوان دقيق لتسهيل مهام كابتن التوصيل.
- يُرجى فحص الطرد ظاهرياً عند الاستلام والتأكد من سلامة التغليف ووجود رمز التتبع.

المادة 7: إلغاء الطلبات وإساءة استخدام المنصة
- يحق للعميلة طلب إلغاء الطلب قبل خروجه مع شركة التوصيل عبر التواصل مع الدعم الفني.
- تحتفظ رَواق بحق حظر أو تقييد الحسابات والأرقام التي تسجل طلبات وهمية متكررة أو ترفض استلام الطرود دون مبرر مشروع، صيانةً لحقوق الموردين وشركاء التوصيل.

المادة 8: الأسعار والدفع عند الاستلام
- جميع المعاملات والأسعار محررة بالدينار الأردني (JOD).
- في طلبات الدفع عند الاستلام (Cash on Delivery)، المبلغ المستحق هو المبلغ الصافي المذكور في الفاتورة الرسمية الإلكترونية المعتمدة.

المادة 9: حماية البيانات والمعاملات الإلكترونية
تخضع كافة البيانات لقانون حماية البيانات الشخصية الأردني رقم (24) لسنة 2023 وقانون المعاملات الإلكترونية رقم (15) لسنة 2015 وتعديلاته، حيث يتم توثيق الموافقة على الشروط إلكترونياً وتخزينها لحفظ حقوق الأطراف.

المادة 10: فض النزاعات
تحرص رَواق دوماً على تسوية أي ملاحظات ودياً وبأعلى مستويات الإنصاف والمهنية، دون الإخلال بحق المستهلك في اللجوء للجهات الرقابية الرسمية ومديرية حماية المستهلك في وزارة الصناعة والتجارة والتموين، أو القضاء الأردني المختص.

المادة 11: القانون المعمول به والاختصاص القضائي
تخضع هذه الشروط وتُفسر وتُطبق وفق التشريعات والقوانين النافذة في المملكة الأردنية الهاشمية، وتختص محاكم عمّان بالنظر في أي نزاع ينشأ عنها.

رَواق | أناقة من روح الأصالة 🌿`,
    contentEn: `RAWAQ | Terms of Service, Purchase and Returns Policy
Edition: JO-2026-v1.0 (Governed by Jordanian Laws)

Article 1: Platform Definition
Rawaq is a Jordanian multi-vendor e-commerce platform connecting customers with curated beauty, cosmetics, fragrances, and fashion merchants. Rawaq coordinates fulfillment, invoices, and customer care in partnership with certified suppliers and courier couriers.

Article 2: Order Confirmation & Consent
- Placing an order constitutes formal acknowledgment of accurate data and full consent to these Terms & Purchase policies.
- Orders are subject to review and inventory availability from authorized partner shops.

Article 3: Opened Products & Hygiene Protection Policy
For customer health, safety, and strict quality assurance, Rawaq does not accept voluntary returns or exchanges for products that have been used, had their hygiene or protective seals broken, or packaging unsealed.
This applies strictly to skincare, cosmetics, and fragrances.
This does not diminish statutory consumer rights under Jordanian Consumer Protection Law No. 7 of 2017 for defective or non-conforming merchandise.

Article 4: Defective or Non-Conforming Goods
- Customers are entitled to repair, replacement, or refund under Articles 6 and 7 of the Jordanian Consumer Protection Law No. 7 of 2017 if products arrive defective or non-conforming.
- Outer courier box opening does not void warranty rights when necessary to inspect defects.

Article 5: Complaints & Resolution Channels
Please contact official Rawaq support with order reference (#ORD) and supporting photos.

Article 6: Delivery & Transit
Deliveries are fulfilled across Jordan via partnered courier networks.

Article 7: Cancellations
Orders may be cancelled prior to dispatch. Rawaq reserves the right to restrict fraudulent or abusive repeated fake orders.

Article 8: Pricing and Cash on Delivery
All transactions are calculated in Jordanian Dinars (JOD).

Article 9: Data Protection & Electronic Transactions
Processed in accordance with Jordan Personal Data Protection Law No. 24 of 2023 and Electronic Transactions Law No. 15 of 2015.

Article 10: Dispute Resolution & Consumer Protection
Rawaq resolves inquiries amicably with integrity, without waiving statutory dispute rights through Jordanian regulatory agencies or courts.

Article 11: Applicable Law & Jurisdiction
Subject exclusively to the laws of the Hashemite Kingdom of Jordan.

Rawaq | Elegance Rooted in Heritage 🌿`
  };

  const cms = await getCMSContent('terms_conditions', defaultTerms);

  return (
    <main className="min-h-screen bg-[#F7F3EA]" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Header */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">OUR COMMITMENT</p>
        <h1 className="mt-4 text-3xl sm:text-4xl md:text-5xl font-bold font-heading !text-white">
          {isAr ? cms.titleAr : cms.titleEn}
        </h1>
        <p className="mt-3 text-xs sm:text-sm text-[#D9C6A8] font-mono">
          {isAr ? 'وثيقة الشروط والسياسات الرسمية — الإصدار JO-2026-v1.0' : 'Official Policy Document — Edition JO-2026-v1.0'}
        </p>
      </section>

      <section className="py-12 sm:py-16 px-5 sm:px-8 max-w-4xl mx-auto -mt-10 relative z-10">
        <div className="rounded-3xl border border-[#E9DDCC] bg-white p-7 sm:p-12 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-[#E9DDCC] pb-4 text-xs font-semibold text-stone-500">
            <span>{isAr ? 'المملكة الأردنية الهاشمية' : 'Hashemite Kingdom of Jordan'}</span>
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
