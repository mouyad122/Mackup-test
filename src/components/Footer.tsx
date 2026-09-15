import Link from 'next/link';
import { getCMSContent } from '@/lib/cms';

export async function Footer({ locale = 'ar' }: { locale?: string }) {
  const isAr = locale === 'ar';
  
  const socialLinks = await getCMSContent('social_links', {
    instagram: '',
    whatsapp: '',
    facebook: ''
  });

  return (
    <footer className="bg-[var(--color-charcoal-900)] text-white pt-16 pb-8 border-t-4 border-[var(--color-rose-600)]">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
          
          {/* Logo & About */}
          <div className="col-span-1 md:col-span-1">
            <Link href={`/${locale}`} className="flex items-center gap-3 mb-6">
              <span className="font-heading font-black text-3xl tracking-wide uppercase text-white">
                MAKEUP DEMO
              </span>
            </Link>
            <p className="text-zinc-300 mb-6 leading-relaxed">
              {isAr 
                ? 'ميكاب ديمو.. المتجر التجريبي لمنتجات التجميل والعناية بالبشرة. اكتشفي أحدث الإطلالات وأفضل المنتجات لبشرة مشرقة.'
                : 'Makeup Demo.. Your ultimate beauty and skincare demo store. Discover the latest looks and best products for glowing skin.'}
            </p>
            <div className="flex gap-4 text-[var(--color-rose-600)]">
              {socialLinks.instagram && (
                <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-rose-400)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
              )}
              {socialLinks.facebook && (
                <a href={socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-rose-400)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
              )}
              {socialLinks.whatsapp && (
                <a href={socialLinks.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--color-rose-400)] transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0-5-5z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="text-xl font-bold font-heading mb-6 text-[var(--color-rose-400)]">{isAr ? 'المتجر' : 'Shop'}</h4>
            <ul className="space-y-4 text-zinc-300">
              <li><Link href={`/${locale}/makeup`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'المكياج' : 'Makeup'}</Link></li>
              <li><Link href={`/${locale}/skincare`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'العناية بالبشرة' : 'Skincare'}</Link></li>
              <li><Link href={`/${locale}/accessories`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'الإكسسوارات' : 'Accessories'}</Link></li>
              <li><Link href={`/${locale}/offers`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'العروض' : 'Offers'}</Link></li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="text-xl font-bold font-heading mb-6 text-[var(--color-rose-400)]">{isAr ? 'خدمة العملاء' : 'Customer Service'}</h4>
            <ul className="space-y-4 text-zinc-300">
              <li><Link href={`/${locale}/shipping`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'الشحن والتوصيل' : 'Shipping & Delivery'}</Link></li>
              <li><Link href={`/${locale}/returns`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'الاسترجاع والاستبدال' : 'Returns & Exchanges'}</Link></li>
              <li><Link href={`/${locale}/faq`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</Link></li>
              <li><Link href={`/${locale}/contact`} className="hover:text-[var(--color-rose-600)] transition-colors">{isAr ? 'تواصل معنا' : 'Contact Us'}</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-zinc-800 text-center md:flex md:justify-between md:items-center">
          <p className="text-sm text-zinc-500 mb-4 md:mb-0">
            {isAr ? `جميع الحقوق محفوظة © ميكاب ديمو ${new Date().getFullYear()}` : `All rights reserved © Makeup Demo ${new Date().getFullYear()}`}
          </p>
          <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
            {isAr ? 'متجر تجريبي' : 'Demo Store'}
          </div>
        </div>
      </div>
    </footer>
  );
}
