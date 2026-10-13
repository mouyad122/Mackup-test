import React from 'react';
import type { Metadata } from 'next';
import { getCMSContent } from '@/lib/cms';
import { OliveBranchDecoration, SevenPointedStar } from '@/components/RawaqMotifs';
import { STORE_INSTAGRAM_URL, STORE_WHATSAPP_URL } from '@/lib/contact';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'تواصل معنا | رَواق' : 'Contact Us | Rawaq',
  };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const socialLinks = await getCMSContent('social_links', {
    instagram: STORE_INSTAGRAM_URL,
    whatsapp: STORE_WHATSAPP_URL,
    facebook: '',
  });

  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      {/* Header */}
      <section className="bg-[#3F4B32] py-20 sm:py-28 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <OliveBranchDecoration className="absolute -end-20 -bottom-20 w-80 text-white opacity-10 pointer-events-none" />
        <p className="rawaq-eyebrow text-[#B7935F]">WE ARE HERE FOR YOU</p>
        <h1 className="mt-4 text-4xl md:text-5xl !text-white font-heading">{isAr ? 'تواصل معنا' : 'Contact Us'}</h1>
      </section>

      <section className="py-16 sm:py-20 px-5 sm:px-8 max-w-3xl mx-auto -mt-10 relative z-10">
        <div className="rounded-3xl border border-[#E9DDCC] bg-white p-8 sm:p-12 shadow-[0_20px_60px_rgba(63,75,50,.08)] text-center relative overflow-hidden">
          <SevenPointedStar className="absolute top-0 start-0 w-40 text-[#B7935F] opacity-5 -translate-x-1/2 -translate-y-1/2" />
          <span aria-hidden="true" className="block text-5xl text-[#B7935F] mb-6">✦</span>
          <h2 className="text-2xl font-bold text-[#3F4B32] mb-4 font-heading">
            {isAr ? 'كيف يمكننا مساعدتك؟' : 'How can we help?'}
          </h2>
          <p className="text-[#746A64] leading-8 mb-10 max-w-md mx-auto text-lg">
            {isAr ? 'نحن هنا لنستمع إليكِ. فريقنا يسعد بالإجابة على جميع استفساراتكِ ومساعدتكِ في كل خطوة.' : 'We are here to listen. Our team is happy to answer all your questions and assist you every step of the way.'}
          </p>

          <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <a href={socialLinks.whatsapp || STORE_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-rawaq-primary inline-flex justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rtl:ml-2 ltr:mr-2"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/></svg>
              {isAr ? 'تواصل عبر الواتساب' : 'Chat on WhatsApp'}
            </a>
            <a href={socialLinks.instagram || STORE_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-rawaq-ghost inline-flex justify-center text-[#3F4B32] border-[#3F4B32]">
              {isAr ? 'تابعينا على إنستغرام' : 'Follow us on Instagram'}
            </a>
            {socialLinks.facebook && (
              <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="btn-rawaq-ghost inline-flex justify-center text-[#3F4B32] border-[#3F4B32]">
                {isAr ? 'تابعينا على فيسبوك' : 'Follow us on Facebook'}
              </a>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
