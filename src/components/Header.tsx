'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const pathname = usePathname() || '/ar';
  const router = useRouter();
  const locale = pathname.startsWith('/en') ? 'en' : 'ar';
  const isAr = locale === 'ar';

  const labels = isAr
    ? { home: 'الرئيسية', shop: 'المتجر', story: 'قصتنا', contact: 'تواصل معنا' }
    : { home: 'Home', shop: 'Store', story: 'Our Story', contact: 'Contact' };

  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  /* ── Cart count ── */
  useEffect(() => {
    const checkCart = () => {
      try {
        const saved = localStorage.getItem('makeup_cart');
        const items = saved ? JSON.parse(saved) : [];
        const count = items.reduce((acc: number, item: any) => acc + (item.quantity || 1), 0);
        setCartCount(count);
      } catch {}
    };
    checkCart();
    window.addEventListener('storage', checkCart);
    window.addEventListener('cart_updated', checkCart);
    return () => {
      window.removeEventListener('storage', checkCart);
      window.removeEventListener('cart_updated', checkCart);
    };
  }, []);

  /* ── Scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Locale toggle ── */
  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    let pathWithoutLocale = pathname;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      pathWithoutLocale = pathname.slice(locale.length + 1);
    }
    router.push(`/${newLocale}${pathWithoutLocale}`);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === `/${locale}` && pathname === `/${locale}`) return true;
    if (path !== `/${locale}` && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <>
      {/* ═══ MAIN HEADER ═══ */}
      <header
        className={`sticky top-0 z-50 w-full border-b border-[#e8e5df] bg-[#fbfaf8] transition-shadow duration-300 ${
          isScrolled
            ? 'shadow-[0_2px_16px_rgba(0,0,0,0.05)]'
            : 'shadow-none'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8">

          {/* ── Left side: Hamburger (mobile) + Icons (all) ── */}
          <div className="flex items-center gap-3 md:w-1/4">
            {/* Mobile hamburger */}
            <button
              className="md:hidden flex h-10 w-10 items-center justify-center text-[#242424] hover:bg-[#f1efeb] transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={isAr ? 'فتح القائمة' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            </button>

            {/* Language switcher */}
            <button
              onClick={toggleLocale}
              aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
              className="hidden md:flex items-center gap-2 border border-[#d9d4cc] px-3 py-1.5 text-xs font-bold tracking-wide text-[#242424] transition hover:border-[#3F4B32]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
              </svg>
              {locale === 'ar' ? 'EN' : 'AR'}
            </button>
          </div>

          {/* ── Center: Logo ── */}
          <div className="flex shrink-0 items-center justify-center md:w-2/4">
            <Link
              href={`/${locale}`}
              aria-label={isAr ? 'رَواق — الرئيسية' : 'Rawaq — Home'}
              className="relative inline-block"
            >
              <Image
                src="/brand/logo_rawaq.png"
                alt="رَواق"
                width={160}
                height={110}
                priority
                className="h-10 w-auto object-contain mix-blend-multiply sm:h-14"
              />
            </Link>
          </div>

          {/* ── Right side: Nav (desktop) + Icons ── */}
          <div className="flex items-center justify-end gap-2 md:w-1/4">
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2 me-4">
              {[
                { href: `/${locale}`, label: labels.home },
                { href: `/${locale}/shop`, label: labels.shop },
                { href: `/${locale}/about`, label: labels.story },
                { href: `/${locale}/contact`, label: labels.contact },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`rawaq-nav-link px-3 py-2 text-base font-bold transition-colors ${
                    isActive(href)
                      ? 'text-[#242424] active'
                      : 'text-[#626262] hover:text-[#242424]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Wishlist */}
            <Link
              href={`/${locale}/wishlist`}
              aria-label={isAr ? 'قائمة الأمنيات' : 'Wishlist'}
              className="flex h-10 w-10 items-center justify-center text-[#242424] hover:bg-[#f1efeb] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </Link>

            {/* Cart */}
            <Link
              href={`/${locale}/cart`}
              aria-label={isAr ? 'السلة' : 'Cart'}
              className="relative flex h-10 w-10 items-center justify-center text-[#242424] hover:bg-[#f1efeb] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -end-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#3F4B32] text-[10px] font-bold text-white shadow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

      </header>

      {/* ═══ MOBILE DRAWER ═══ */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[200]"
          dir={isAr ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'القائمة الرئيسية' : 'Main menu'}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer panel */}
          <div className="absolute inset-y-0 start-0 flex w-[82vw] max-w-[340px] flex-col bg-[#fbfaf8] shadow-2xl">

            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-[#E9DDCC] p-5">
              <Link href={`/${locale}`} onClick={() => setIsMobileMenuOpen(false)}>
                <Image
                  src="/brand/logo_rawaq.png"
                  alt="رَواق"
                  width={130}
                  height={90}
                  className="h-10 w-auto object-contain mix-blend-multiply"
                />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Close'}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#746A64] hover:bg-[#EDE3D5] hover:text-[#3F4B32] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-5">
              {[
                { href: `/${locale}`, label: labels.home },
                { href: `/${locale}/shop`, label: labels.shop },
                { href: `/${locale}/about`, label: labels.story },
                { href: `/${locale}/contact`, label: labels.contact },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-bold transition-colors ${
                    isActive(href)
                      ? 'bg-[#3F4B32]/8 text-[#3F4B32]'
                      : 'text-[#2B2B2B] hover:bg-[#EDE3D5] hover:text-[#3F4B32]'
                  }`}
                >
                  {isActive(href) && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B7935F]" aria-hidden="true" />
                  )}
                  {label}
                </Link>
              ))}

              <div className="my-4 h-px bg-[#E9DDCC]" />

              <Link
                href={`/${locale}/wishlist`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-bold text-[#2B2B2B] hover:bg-[#EDE3D5] hover:text-[#3F4B32] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
                {isAr ? 'قائمة الأمنيات' : 'Wishlist'}
              </Link>

              <Link
                href={`/${locale}/cart`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-bold text-[#2B2B2B] hover:bg-[#EDE3D5] hover:text-[#3F4B32] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {isAr ? 'سلة المشتريات' : 'Shopping cart'}
                {cartCount > 0 && (
                  <span className="ms-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#3F4B32] text-[10px] font-bold text-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Language switcher at bottom */}
            <div className="border-t border-[#E9DDCC] p-4">
              <button
                onClick={toggleLocale}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D9C6A8] py-2.5 text-sm font-bold text-[#2B2B2B] transition hover:border-[#B7935F] hover:text-[#3F4B32]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
                </svg>
                {locale === 'ar' ? 'English' : 'العربية'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
