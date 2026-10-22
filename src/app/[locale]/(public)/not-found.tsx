import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'الصفحة غير موجودة — 404 | رَواق',
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div
      className="min-h-screen bg-[var(--color-ivory-100)] flex items-center justify-center px-6"
      dir="rtl"
    >
      <div className="text-center max-w-lg mx-auto">
        {/* رقم 404 بتصميم فاخر */}
        <div className="relative mb-8">
          <div className="text-[160px] font-bold font-heading text-[var(--color-ivory-200)] leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[var(--color-champagne-600)] flex items-center justify-center shadow-lg">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold font-heading text-[#3F4832] mb-3">
          عذراً، الصفحة غير موجودة
        </h1>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          الصفحة التي تبحث عنها غير موجودة أو ربما تم نقلها.
          <br />
          يمكنك العودة للمتجر واكتشاف تشكيلتنا من المكياج الفاخرة.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/ar/shop"
            className="px-8 py-3 bg-[var(--color-champagne-600)] hover:bg-[var(--color-champagne-500)] text-white font-bold rounded-lg transition-colors shadow-md"
          >
            تصفح المتجر
          </Link>
          <Link
            href="/ar"
            className="px-8 py-3 border-2 border-[#3F4832] text-[#3F4832] font-bold rounded-lg hover:bg-[#3F4832] hover:text-white transition-colors"
          >
            الصفحة الرئيسية
          </Link>
        </div>

        {/* روابط سريعة */}
        <div className="mt-12 pt-8 border-t border-[var(--color-ivory-200)]">
          <p className="text-sm text-zinc-400 mb-4">روابط مفيدة</p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: '/ar/shop', label: 'المتجر' },
              { href: '/ar/about', label: 'عن رَواق' },
              { href: '/ar/contact', label: 'تواصل معنا' },
              { href: '/ar/store-location', label: 'موقع المعرض' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-[var(--color-champagne-600)] hover:text-[var(--color-champagne-500)] font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
