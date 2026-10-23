'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: HeaderCategory[];
}

export interface HeaderProps {
  categories?: HeaderCategory[];
  hasActiveOffers?: boolean;
}

interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  category?: HeaderCategory;
}

interface SearchResult {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  image?: string;
  price?: number;
  type: 'product' | 'category';
}

function buildNavLinks(): NavItem[] {
  return [
    { href: '/', labelAr: 'الصفحة الرئيسية', labelEn: 'Home' },
    { href: '/shop', labelAr: 'المتجر', labelEn: 'Shop' },
    { href: '/about', labelAr: 'قصتنا', labelEn: 'Our Story' },
    { href: '/contact', labelAr: 'تواصل معنا', labelEn: 'Contact Us' },
  ];
}

/* ─────────────────────────────────────────────
   SearchBar Component
───────────────────────────────────────────── */
function SearchBar({ locale, onClose }: { locale: string; onClose?: () => void }) {
  const isAr = locale === 'ar';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=6`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [locale]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(query), 280);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const placeholder = isAr ? 'ابحثي عن منتج أو تصنيف...' : 'Search products or categories...';

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <svg className="absolute start-3 top-1/2 -translate-y-1/2 text-[#9a9590] pointer-events-none" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { setOpen(false); onClose?.(); } }}
          placeholder={placeholder}
          className="w-full rounded-full border border-[#D9C6A8] bg-white py-2.5 ps-10 pe-4 text-sm text-[#242424] placeholder:text-[#b0a99e] focus:border-[#3F4832] focus:outline-none focus:ring-2 focus:ring-[#3F4832]/10 transition-all"
          aria-label={placeholder}
          autoComplete="off"
        />
        {loading && (
          <div className="absolute end-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 rounded-full border-2 border-[#3F4832]/30 border-t-[#3F4832] animate-spin" />
          </div>
        )}
      </div>

      {/* Results Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute start-0 end-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-[#E9DDCC] bg-white shadow-xl">
          {results.map((r) => (
            <Link
              key={r.id}
              href={r.type === 'product' ? `/${locale}/products/${r.slug}` : `/${locale}/shop?category=${r.id}`}
              className="flex items-center gap-3 px-4 py-3 hover:bg-[#f7f3ea] transition-colors group"
              onClick={() => { setOpen(false); onClose?.(); }}
            >
              {r.image ? (
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-[#f0ece4]">
                  <Image src={r.image.startsWith('local://') ? r.image.replace('local://', '/') : r.image} alt="" width={40} height={40} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0ece4] text-[#B7935F] text-lg">
                  {r.type === 'category' ? '◈' : '✦'}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#242424] group-hover:text-[#3F4832]">
                  {isAr ? r.nameAr : r.nameEn}
                </p>
                {r.type === 'category' && (
                  <p className="text-xs text-[#9a9590]">{isAr ? 'تصنيف' : 'Category'}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute start-0 end-0 top-full z-50 mt-2 rounded-2xl border border-[#E9DDCC] bg-white px-4 py-6 text-center shadow-xl">
          <p className="text-sm text-[#9a9590]">{isAr ? 'لم نجد نتائج لـ «' + query + '»' : `No results for "${query}"`}</p>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Header
───────────────────────────────────────────── */
export function Header({}: HeaderProps = {}) {
  const pathname = usePathname() || '/ar';
  const router = useRouter();
  const locale = pathname.startsWith('/en') ? 'en' : 'ar';
  const isAr = locale === 'ar';

  const navLinks = buildNavLinks();

  const [cartCount, setCartCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

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

  /* ── Scroll behavior — compact after 80px ── */
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 8);
      setIsCompact(y > 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Close mobile menu on route change ── */
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
  }, [pathname]);

  /* ── Locale toggle ── */
  const toggleLocale = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    let pathWithoutLocale = pathname;
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      pathWithoutLocale = pathname.slice(locale.length + 1);
    }
    router.push(`/${newLocale}${pathWithoutLocale}`);
  };

  const isActive = (href: string) => {
    const full = `/${locale}${href === '/' ? '' : href}`;
    if (href === '/') return pathname === `/${locale}` || pathname === `/${locale}/`;
    return pathname.startsWith(full);
  };

  const l = (item: NavItem) => isAr ? item.labelAr : item.labelEn;

  return (
    <>
      {/* ═══════════════════════════════════════════
          MAIN HEADER
      ═══════════════════════════════════════════ */}
      <header
        className={`sticky top-0 z-50 w-full bg-[#fbfaf8] transition-all duration-300 ${
          isScrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.07)] border-b border-[#e8e5df]' : 'border-b border-[#e8e5df]/60'
        }`}
      >

        {/* ── Top Bar: Logo + Search + Icons ── */}
        <div className={`mx-auto max-w-7xl px-4 sm:px-8 transition-all duration-300 ${isCompact ? 'py-2' : 'py-3 sm:py-4'}`}>

          {/* ────── DESKTOP LAYOUT ────── */}
          <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-6">

            {/* Col 1 — Logo (right/start in RTL) */}
            <div className="flex items-center">
              <Link href={`/${locale}`} aria-label={isAr ? 'رَواق — الرئيسية' : 'Rawaq — Home'}>
                <Image
                  src="/brand/logo_rawaq.png"
                  alt="رَواق"
                  width={160} height={110} priority
                  className={`w-auto object-contain mix-blend-multiply transition-all duration-300 ${isCompact ? 'h-9' : 'h-12 sm:h-14'}`}
                />
              </Link>
            </div>

            {/* Col 2 — Search bar */}
            <div className="w-[340px] lg:w-[420px]">
              <SearchBar locale={locale} />
            </div>

            {/* Col 3 — Account + Wishlist + Cart + Lang (left/end in RTL) */}
            <div className="flex items-center justify-end gap-1">

              {/* Language toggle */}
              <button
                onClick={toggleLocale}
                aria-label={isAr ? 'Switch to English' : 'التبديل إلى العربية'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#626262] hover:bg-[#f1efeb] hover:text-[#3F4832] transition-colors text-xs font-bold"
              >
                {locale === 'ar' ? 'EN' : 'AR'}
              </button>

              {/* Wishlist */}
              <Link href={`/${locale}/wishlist`} aria-label={isAr ? 'المفضلة' : 'Wishlist'}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#626262] hover:bg-[#f1efeb] hover:text-[#3F4832] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
              </Link>

              {/* Cart */}
              <Link href={`/${locale}/cart`} aria-label={isAr ? 'السلة' : 'Cart'}
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#626262] hover:bg-[#f1efeb] hover:text-[#3F4832] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3F4832] text-[9px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* ────── MOBILE LAYOUT ────── */}
          <div className="flex md:hidden items-center justify-between gap-2">

            {/* Right — Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label={isAr ? 'فتح القائمة' : 'Open menu'}
              aria-expanded={isMobileMenuOpen}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#3F4832] hover:bg-[#f1efeb] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>
              </svg>
            </button>

            {/* Center — Logo */}
            <Link href={`/${locale}`} aria-label={isAr ? 'رَواق — الرئيسية' : 'Rawaq — Home'}>
              <Image
                src="/brand/logo_rawaq.png"
                alt="رَواق"
                width={130} height={90} priority
                className="h-9 w-auto object-contain mix-blend-multiply"
              />
            </Link>

            {/* Left — Search + Cart */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsSearchOpen(true)}
                aria-label={isAr ? 'البحث' : 'Search'}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#3F4832] hover:bg-[#f1efeb] transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
              <Link href={`/${locale}/cart`} aria-label={isAr ? 'السلة' : 'Cart'}
                className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#3F4832] hover:bg-[#f1efeb] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#3F4832] text-[9px] font-bold text-white">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* ── Secondary Nav (Desktop only — Main Navigation Links) ── */}
        <nav
          className={`hidden md:block border-t border-[#e8e5df]/80 bg-[#fbfaf8] transition-all duration-300 ${isCompact ? 'max-h-0 opacity-0 overflow-hidden border-t-0' : 'opacity-100'}`}
          aria-label={isAr ? 'قائمة التنقل الرئيسية' : 'Main navigation'}
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-8">
            <ul className="flex items-center justify-center gap-6 lg:gap-10 overflow-visible py-1">
              {navLinks.map((item) => {
                const href = `/${locale}${item.href === '/' ? '' : item.href}`;
                const active = isActive(item.href);

                return (
                  <li key={item.href} className="relative shrink-0">
                    <Link
                      href={href}
                      className={`rawaq-nav-link flex items-center px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                        active
                          ? 'text-[#3F4832] active'
                          : 'text-[#626262] hover:text-[#3F4832]'
                      }`}
                    >
                      {l(item)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </header>

      {/* ═══════════════════════════════════════════
          MOBILE SEARCH OVERLAY
      ═══════════════════════════════════════════ */}
      {isSearchOpen && (
        <div
          className="md:hidden fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm"
          onClick={() => setIsSearchOpen(false)}
        >
          <div
            className="absolute top-0 inset-x-0 bg-[#fbfaf8] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchBar locale={locale} onClose={() => setIsSearchOpen(false)} />
              </div>
              <button
                onClick={() => setIsSearchOpen(false)}
                aria-label={isAr ? 'إغلاق البحث' : 'Close search'}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1efeb] text-[#3F4832]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════
          MOBILE DRAWER MENU
      ═══════════════════════════════════════════ */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-[200]"
          dir={isAr ? 'rtl' : 'ltr'}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'القائمة الرئيسية' : 'Main menu'}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />

          {/* Drawer panel — slides from right (start in RTL) */}
          <div className="absolute inset-y-0 start-0 flex w-[82vw] max-w-[320px] flex-col bg-[#fbfaf8] shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E9DDCC] px-5 py-4">
              <Link href={`/${locale}`} onClick={() => setIsMobileMenuOpen(false)}>
                <Image src="/brand/logo_rawaq.png" alt="رَواق" width={120} height={80} className="h-9 w-auto object-contain mix-blend-multiply" />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                aria-label={isAr ? 'إغلاق' : 'Close'}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#746A64] hover:bg-[#EDE3D5] hover:text-[#3F4832] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-5">
              {navLinks.map((item) => {
                const href = `/${locale}${item.href === '/' ? '' : item.href}`;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors ${
                      active
                        ? 'bg-[#3F4832]/8 text-[#3F4832]'
                        : 'text-[#2B2B2B] hover:bg-[#EDE3D5] hover:text-[#3F4832]'
                    }`}
                  >
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#B7935F]" aria-hidden="true" />}
                    {l(item)}
                  </Link>
                );
              })}

              <div className="my-3 h-px bg-[#E9DDCC]" />

              {/* Wishlist */}
              <Link href={`/${locale}/wishlist`} onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-semibold text-[#2B2B2B] hover:bg-[#EDE3D5] hover:text-[#3F4832] transition-colors">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
                </svg>
                {isAr ? 'المفضلة' : 'Wishlist'}
              </Link>
            </nav>

            {/* Language toggle */}
            <div className="border-t border-[#E9DDCC] p-4">
              <button
                onClick={() => { toggleLocale(); setIsMobileMenuOpen(false); }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-[#D9C6A8] py-2.5 text-sm font-semibold text-[#2B2B2B] transition hover:border-[#3F4832] hover:text-[#3F4832]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
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
