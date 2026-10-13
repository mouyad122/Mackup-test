import React from 'react';
import { getCMSContent } from '@/lib/cms';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'الأسئلة الشائعة | رَواق' : 'FAQ | Rawaq',
  };
}

export default async function FAQPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const defaultFaqs = [
    {
      qAr: 'كيف يتم الدفع؟',
      qEn: 'What are the payment methods?',
      aAr: 'نوفر الدفع عند الاستلام، وتظهر خيارات الدفع المتاحة بوضوح عند إتمام الطلب.',
      aEn: 'We provide cash on delivery, and available options are shown clearly at checkout.'
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
      aEn: 'Yes, returns and exchanges are available within 3 days of delivery, provided the item is unopened and in its original condition.'
    },
    { qAr: 'كيف أتتبع طلبي؟', qEn: 'How can I track my order?', aAr: 'نرسل لك تحديثات الطلب ورابط الفاتورة عبر واتساب، ويمكنك التواصل معنا في أي وقت برقم الطلب.', aEn: 'We send order updates via WhatsApp, and you can contact us with your order number anytime.' },
  ];

  const faqs = await getCMSContent('faq_content', defaultFaqs);

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4B32] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">RAWAQ SUPPORT</p>
        <h1 className="mt-4 text-4xl md:text-5xl !text-white">{isAr ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}</h1>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-8 max-w-4xl mx-auto -mt-10 relative z-10">
        <div className="rounded-3xl border border-[#E9DDCC] bg-white p-8 sm:p-12 shadow-[0_4px_24px_rgba(139,30,45,.04)]">
          <div className="space-y-8">
            {faqs.map((faq: any, idx: number) => (
              <div key={idx} className="group">
                <h3 className="text-xl font-bold text-[#2B2B2B] mb-3 group-hover:text-[#3F4B32] transition-colors flex items-start gap-3">
                  <span className="text-[#B7935F] mt-1" aria-hidden="true">✦</span>
                  {isAr ? faq.qAr : faq.qEn}
                </h3>
                <p className="text-[#746A64] leading-8 ps-8 border-s-2 border-[#F7F3EA] ml-2 rtl:mr-2 rtl:ml-0 rtl:border-r-2 rtl:border-l-0">
                  {isAr ? faq.aAr : faq.aEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
