import Link from 'next/link';
import Image from 'next/image';
import { getCMSContent } from '@/lib/cms';
import { STORE_INSTAGRAM_URL, STORE_WHATSAPP_URL } from '@/lib/contact';

export async function Footer({ locale = 'ar' }: { locale?: string }) {
  const isAr = locale === 'ar';
  const socialLinks = await getCMSContent('social_links', {
    instagram: STORE_INSTAGRAM_URL,
    whatsapp: STORE_WHATSAPP_URL,
    facebook: '',
  });
  const instagramUrl = socialLinks.instagram || STORE_INSTAGRAM_URL;
  const whatsappUrl = socialLinks.whatsapp || STORE_WHATSAPP_URL;

  return (
    <footer className="relative overflow-hidden bg-[#3F4B32] text-white" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ── Main footer body ── */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">

          {/* ─ Column 1: Brand ─ */}
          <div>
            <Link href={`/${locale}`} className="mb-6 inline-flex items-center" aria-label={isAr ? 'رَواق — الرئيسية' : 'Rawaq — Home'}>
              <span className="inline-flex bg-[#fbfaf8] px-3 py-2">
                <Image
                  src="/brand/logo_rawaq.png"
                  alt="رَواق"
                  width={130}
                  height={90}
                  className="h-12 w-auto object-contain"
                />
              </span>
            </Link>

            <p className="mb-6 max-w-xs leading-7 text-white/65 text-sm">
              {isAr
                ? 'رَواق… أناقة أردنية تجمع الكوزمتكس والعبايات والأثواب والفساتين في تجربة واحدة. جمال يحمل روح المكان.'
                : 'Rawaq brings Jordanian heritage to modern beauty, fashion and elegance. A brand with a sense of place.'}
            </p>

            <p className="mb-7 text-[11px] tracking-[.18em] text-white/50 font-bold uppercase">
              {isAr ? 'من تراثنا… إلى جمالك' : 'FROM OUR HERITAGE · TO YOUR BEAUTY'}
            </p>

            {/* Social icons */}
            <div className="flex gap-3">
              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-[#B7935F] hover:text-[#B7935F]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                  </svg>
                </a>
              )}
              {socialLinks.facebook && (
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-[#B7935F] hover:text-[#B7935F]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                  </svg>
                </a>
              )}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-[#B7935F] hover:text-[#B7935F]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
                </svg>
              </a>
            </div>
          </div>

          {/* ─ Column 2: Shop ─ */}
          <div>
            <h4 className="mb-5 text-sm font-bold tracking-[.14em] text-[#B7935F] uppercase">
              {isAr ? 'تسوّقي' : 'Shop'}
            </h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href={`/${locale}/shop`} className="transition-colors hover:text-white">{isAr ? 'جميع المنتجات' : 'All products'}</Link></li>
              <li><Link href={`/${locale}/offers`} className="transition-colors hover:text-white">{isAr ? 'العروض والتخفيضات' : 'Offers & discounts'}</Link></li>
              <li><Link href={`/${locale}/about`} className="transition-colors hover:text-white">{isAr ? 'قصة رَواق' : 'Our story'}</Link></li>
              <li><Link href={`/${locale}/wishlist`} className="transition-colors hover:text-white">{isAr ? 'قائمة الأمنيات' : 'Wishlist'}</Link></li>
            </ul>
          </div>

          {/* ─ Column 3: Customer care ─ */}
          <div>
            <h4 className="mb-5 text-sm font-bold tracking-[.14em] text-[#B7935F] uppercase">
              {isAr ? 'خدمة العملاء' : 'Customer care'}
            </h4>
            <ul className="space-y-3 text-sm text-white/65">
              <li><Link href={`/${locale}/shipping`} className="transition-colors hover:text-white">{isAr ? 'الشحن والتوصيل' : 'Shipping & delivery'}</Link></li>
              <li><Link href={`/${locale}/returns`} className="transition-colors hover:text-white">{isAr ? 'الاسترجاع والاستبدال' : 'Returns & exchanges'}</Link></li>
              <li><Link href={`/${locale}/faq`} className="transition-colors hover:text-white">{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</Link></li>
              <li><Link href={`/${locale}/contact`} className="transition-colors hover:text-white">{isAr ? 'تواصل معنا' : 'Contact us'}</Link></li>
              <li><Link href={`/${locale}/privacy`} className="transition-colors hover:text-white">{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</Link></li>
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="mt-12 border-t border-white/10 pt-6 text-center sm:flex sm:items-center sm:justify-between">
          <p className="mb-3 text-xs text-white/40 sm:mb-0">
            {isAr
              ? `© ${new Date().getFullYear()} رَواق — جميع الحقوق محفوظة`
              : `© ${new Date().getFullYear()} Rawaq — All rights reserved`}
          </p>
          <p className="flex items-center justify-center gap-2 text-xs text-white/40">
            <span className="text-[#B7935F]" aria-hidden="true">✦</span>
            {isAr ? 'بروح أردنية' : 'Jordanian at heart'}
            <span className="text-[#B7935F]" aria-hidden="true">✦</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
