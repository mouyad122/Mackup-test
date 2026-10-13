'use client';

import { FileDown } from 'lucide-react';

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
      type="button"
      title="اختاري حفظ كـ PDF في نافذة الطباعة"
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-[#3F4B32] px-4 py-2.5 font-bold text-white transition hover:bg-[#650A19] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B7935F]"
    >
      <FileDown className="h-4 w-4" aria-hidden="true" />
      تصدير تقرير PDF
    </button>
  );
}
