'use client';

import React from 'react';
import { FileDown, Printer } from 'lucide-react';

interface PrintButtonProps {
  label?: string;
  className?: string;
  documentTitle?: string;
}

export function PrintButton({ 
  label = 'تصدير تقرير PDF واضح (A4)', 
  className,
  documentTitle,
}: PrintButtonProps) {
  const handlePrint = () => {
    let originalTitle = '';
    if (typeof document !== 'undefined') {
      originalTitle = document.title;
      if (documentTitle) {
        document.title = documentTitle;
      }
    }

    // Small delay to ensure any dynamic rendering/state settles before opening print dialog
    window.setTimeout(() => {
      window.print();
      if (typeof document !== 'undefined' && originalTitle) {
        window.setTimeout(() => {
          document.title = originalTitle;
        }, 1000);
      }
    }, 120);
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      title="تصدير كشف رسمي عالي الدقة بحجم A4 مطابق للمواصفات المحاسبية"
      className={
        className ||
        'no-print inline-flex items-center gap-2 rounded-xl bg-emerald-950 px-4 py-2.5 text-xs font-bold text-amber-300 shadow-sm transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400'
      }
    >
      <FileDown className="h-4 w-4" aria-hidden="true" />
      <span>{label}</span>
      <Printer className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
    </button>
  );
}
