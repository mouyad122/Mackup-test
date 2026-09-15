'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Store Error]:', error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[var(--color-ivory-100)] px-6">
      <div className="text-center max-w-md mx-auto">
        {/* أيقونة الخطأ */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[var(--color-ivory-200)] flex items-center justify-center">
          <svg
            className="w-10 h-10 text-[var(--color-champagne-600)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <h2 className="text-2xl font-bold font-heading text-[var(--color-charcoal-900)] mb-3">
          حدث خطأ غير متوقع
        </h2>
        <p className="text-zinc-500 mb-8 leading-relaxed">
          نأسف، حدث خطأ أثناء تحميل هذه الصفحة. يرجى المحاولة مجدداً أو العودة للصفحة الرئيسية.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[var(--color-charcoal-900)] text-white font-bold rounded-lg hover:bg-[var(--color-charcoal-800)] transition-colors"
          >
            حاول مجدداً
          </button>
          <Link
            href="/ar"
            className="px-6 py-3 border-2 border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)] font-bold rounded-lg hover:bg-[var(--color-charcoal-900)] hover:text-white transition-colors"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
