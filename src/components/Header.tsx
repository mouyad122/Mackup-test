'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function Header() {
  const pathname = usePathname() || '/ar';
  const router = useRouter();
  const locale = pathname.startsWith('/en') ? 'en' : 'ar';

  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    // Remove current locale prefix safely
    let pathWithoutLocale = pathname;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      pathWithoutLocale = pathname.slice(locale.length + 1);
    }
    
    // Construct new path
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    
    // Push new path and close menu
    router.push(newPath);
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === `/${locale}` && pathname === `/${locale}`) return true;
    if (path !== `/${locale}` && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="w-full bg-[var(--color-ivory-100)] border-b border-[var(--color-ivory-200)] sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Mobile Hamburger Button */}
        <button 
          className="md:hidden text-[var(--color-charcoal-900)] hover:text-[var(--color-rose-600)] transition-colors"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open mobile menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        </button>

        {/* Action Icons */}
        <div className="flex items-center gap-3 sm:gap-4 text-[var(--color-charcoal-900)]">
          {/* Language Switcher */}
          <button onClick={toggleLocale} aria-label="Language Switch" className="hover:text-[var(--color-rose-600)] transition-colors flex items-center gap-1 font-bold text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            {locale === 'ar' ? 'EN' : 'AR'}
          </button>
          
          {/* Wishlist */}
          <Link href={`/${locale}/wishlist`} aria-label="Wishlist" className="hover:text-[var(--color-rose-600)] transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </Link>
          
          {/* Cart */}
          <Link href={`/${locale}/cart`} aria-label="Cart" className="hover:text-[var(--color-rose-600)] transition-colors relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[var(--color-rose-600)] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
        </div>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-bold text-[var(--color-charcoal-900)]">
          <Link href={`/${locale}`} className={`${isActive(`/${locale}`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)] transition-colors'}`}>الرئيسية</Link>
          <Link href={`/${locale}/collections`} className={`${isActive(`/${locale}/collections`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)] transition-colors'}`}>المتجر</Link>
          <Link href={`/${locale}/contact`} className={`${isActive(`/${locale}/contact`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)] transition-colors'}`}>تواصل معنا</Link>
        </nav>

        {/* Right Side: Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2">
          <span className="font-heading font-black text-2xl tracking-wide uppercase text-[var(--color-charcoal-900)]">
            MAKEUP DEMO
          </span>
        </Link>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-sm bg-[var(--color-ivory-100)] h-full shadow-2xl flex flex-col transform transition-transform duration-300">
            <div className="p-6 flex items-center justify-between border-b border-[var(--color-ivory-200)]">
              <Link href={`/${locale}`} className="flex items-center gap-2" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="font-heading font-black text-xl tracking-wide uppercase text-[var(--color-charcoal-900)]">
                  MAKEUP DEMO
                </span>
              </Link>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-500 hover:text-red-500 rounded-full hover:bg-zinc-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <nav className="flex-1 overflow-y-auto py-6 px-6 flex flex-col gap-6 text-lg font-bold text-[var(--color-charcoal-900)]">
              <Link href={`/${locale}`} onClick={() => setIsMobileMenuOpen(false)} className={`${isActive(`/${locale}`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)]'} transition-colors border-b border-[var(--color-ivory-200)] pb-2`}>الرئيسية</Link>
              <Link href={`/${locale}/collections`} onClick={() => setIsMobileMenuOpen(false)} className={`${isActive(`/${locale}/collections`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)]'} transition-colors border-b border-[var(--color-ivory-200)] pb-2`}>المتجر</Link>
              <Link href={`/${locale}/contact`} onClick={() => setIsMobileMenuOpen(false)} className={`${isActive(`/${locale}/contact`) ? 'text-[var(--color-rose-600)]' : 'hover:text-[var(--color-rose-600)]'} transition-colors border-b border-[var(--color-ivory-200)] pb-2`}>تواصل معنا</Link>
            </nav>
            
            <div className="p-6 border-t border-[var(--color-ivory-200)] bg-white mt-auto">
              <button onClick={toggleLocale} className="w-full py-3 bg-[var(--color-charcoal-900)] text-white font-bold rounded flex items-center justify-center gap-2 hover:bg-[var(--color-charcoal-800)]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                {locale === 'ar' ? 'Switch to English' : 'التبديل للعربية'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
