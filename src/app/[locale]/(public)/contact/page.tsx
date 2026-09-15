import React from 'react';
import { getCMSContent } from '@/lib/cms';

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const locationInfo = await getCMSContent('store_location_info', {
    addressAr: 'عمان، الأردن - شارع مكة',
    addressEn: 'Amman, Jordan - Mecca St',
    hoursAr: '10:00 ص - 10:00 م',
    hoursEn: '10:00 AM - 10:00 PM',
    phone: '+962785050655'
  });

  const socialLinks = await getCMSContent('social_links', {
    instagram: '',
    whatsapp: '',
    facebook: ''
  });

  const contactContent = await getCMSContent('contact_page', { titleAr: 'تواصل معنا', titleEn: 'Contact Us', contentAr: 'نحن هنا لمساعدتك والإجابة على جميع استفساراتك.', contentEn: 'We are here to help you and answer all your inquiries.' });

  return (
    <div className="container mx-auto px-6 py-16">
      <div className="max-w-3xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-4 border-b pb-4">
          {isAr ? contactContent.titleAr : contactContent.titleEn}
        </h1>
        
        {/* Render CMS Content */}
        <div className="prose prose-zinc mb-8 max-w-none text-zinc-700">
          <p>{isAr ? contactContent.contentAr : contactContent.contentEn}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-charcoal-900)] mb-4">
              {isAr ? 'معلومات الاتصال' : 'Contact Info'}
            </h2>
            <div className="space-y-4 text-zinc-700">
              <p>
                <strong>{isAr ? 'العنوان:' : 'Address:'}</strong> {isAr ? locationInfo.addressAr : locationInfo.addressEn}
              </p>
              <p>
                <strong>{isAr ? 'أوقات العمل:' : 'Opening Hours:'}</strong> {isAr ? locationInfo.hoursAr : locationInfo.hoursEn}
              </p>
              <p>
                <strong>{isAr ? 'رقم الهاتف/واتساب:' : 'Phone/WhatsApp:'}</strong> {locationInfo.phone}
              </p>
            </div>
            
            <div className="mt-8">
              <a
                href={socialLinks.whatsapp || `https://wa.me/${locationInfo.phone.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white px-6 py-3 rounded font-bold transition-colors mb-4"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-5-5z"/></svg>
                {isAr ? 'تواصل معنا عبر واتساب' : 'Chat via WhatsApp'}
              </a>

              {(socialLinks.instagram || socialLinks.facebook) && (
                <div className="flex gap-4 mt-2 border-t pt-4">
                  {socialLinks.instagram && (
                    <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-charcoal-900)] text-white hover:bg-[var(--color-rose-600)] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    </a>
                  )}
                  {socialLinks.facebook && (
                    <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-charcoal-900)] text-white hover:bg-[var(--color-rose-600)] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--color-charcoal-900)] mb-4">
              {isAr ? 'أرسل لنا رسالة' : 'Send a Message'}
            </h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-zinc-300 rounded px-4 py-2 focus:ring-2 focus:ring-[var(--color-rose-600)] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isAr ? 'رقم الهاتف' : 'Phone Number'}
                </label>
                <input
                  type="tel"
                  required
                  className="w-full border border-zinc-300 rounded px-4 py-2 focus:ring-2 focus:ring-[var(--color-rose-600)] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  {isAr ? 'الرسالة' : 'Message'}
                </label>
                <textarea
                  rows={4}
                  required
                  className="w-full border border-zinc-300 rounded px-4 py-2 focus:ring-2 focus:ring-[var(--color-rose-600)] outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white py-3 rounded font-bold transition-colors"
              >
                {isAr ? 'إرسال' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
