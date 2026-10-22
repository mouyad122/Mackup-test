import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'سياسة الشحن | رَواق' : 'Shipping Policy | Rawaq',
  };
}

export default async function ShippingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultShipping = {
    titleAr: 'سياسة الشحن والتوصيل',
    titleEn: 'Shipping & Delivery',
    contentAr: `يسعدنا في رَواق أن نوفر خدمة توصيل سريعة وموثوقة لجميع محافظات المملكة الأردنية الهاشمية.

**مدة التوصيل:**
- **داخل عمان:** يتم التوصيل خلال 24 إلى 48 ساعة من تأكيد الطلب.
- **باقي محافظات المملكة:** يتم التوصيل خلال 3 أيام عمل من تأكيد الطلب.

**رسوم التوصيل:**
- تختلف رسوم التوصيل بناءً على المحافظة وتظهر بوضوح عند إتمام الطلب.
- نقدم عروض توصيل مجاني بين الحين والآخر، سيتم إعلامك بها عبر الموقع.

**متابعة الطلبات:**
- بمجرد تأكيد طلبك، سيتم التواصل معك عبر الواتساب لتزويدك بتفاصيل التوصيل ورقم الفاتورة.`,
    contentEn: `At Rawaq, we are pleased to provide fast and reliable delivery services to all governorates of the Hashemite Kingdom of Jordan.

**Delivery Time:**
- **Inside Amman:** Delivery within 24 to 48 hours of order confirmation.
- **Other Governorates:** Delivery within 3 working days of order confirmation.

**Delivery Fees:**
- Delivery fees vary by governorate and are clearly displayed at checkout.
- We occasionally offer free shipping promotions, which will be announced on the website.

**Order Tracking:**
- Once your order is confirmed, we will contact you via WhatsApp with delivery details and your invoice number.`
  };

  const cms = await getCMSContent('shipping_policy', defaultShipping);

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">FAST & RELIABLE</p>
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
