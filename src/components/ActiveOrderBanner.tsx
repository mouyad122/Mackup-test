'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, ArrowRight, X } from 'lucide-react';

interface ActiveOrderData {
  reference: string;
  customerName?: string;
  createdAt: number;
}

export function ActiveOrderBanner() {
  const [activeOrder, setActiveOrder] = useState<ActiveOrderData | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const checkOrder = () => {
      try {
        const saved = localStorage.getItem('rawaq_active_order');
        if (saved) {
          const parsed = JSON.parse(saved) as ActiveOrderData;
          // Valid for 48 hours
          if (parsed && parsed.reference && Date.now() - parsed.createdAt < 48 * 60 * 60 * 1000) {
            setActiveOrder(parsed);
          } else {
            setActiveOrder(null);
          }
        } else {
          setActiveOrder(null);
        }
      } catch (e) {
        setActiveOrder(null);
      }
    };

    checkOrder();
    window.addEventListener('rawaq_order_updated', checkOrder);
    return () => window.removeEventListener('rawaq_order_updated', checkOrder);
  }, []);

  // Do not show on admin pages or on the order-status page itself
  if (
    !activeOrder ||
    isDismissed ||
    pathname?.includes('/admin') ||
    pathname?.includes('/order-status/')
  ) {
    return null;
  }

  // Detect locale from pathname (default 'ar')
  const locale = pathname?.startsWith('/en') ? 'en' : 'ar';
  const isAr = locale === 'ar';

  return (
    <div
      className="bg-amber-50/95 border-b border-amber-200 text-amber-950 px-4 py-2.5 text-xs font-sans transition-all sticky top-0 z-40 shadow-xs backdrop-blur-xs"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
          <Clock className="w-4 h-4 text-amber-700 shrink-0" />
          <span className="truncate">
            {isAr
              ? `لديكِ طلب قيد المراجعة (#${activeOrder.reference})`
              : `You have an active order under review (#${activeOrder.reference})`}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/${locale}/order-status/${activeOrder.reference}`}
            className="px-3 py-1 rounded-full bg-amber-900 text-white hover:bg-amber-950 font-bold text-[11px] flex items-center gap-1 transition shadow-xs"
          >
            <span>{isAr ? 'عرض حالة طلبي' : 'View Status'}</span>
            <ArrowRight className={`w-3 h-3 ${isAr ? 'rotate-180' : ''}`} />
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-amber-700 hover:text-amber-950 p-1 rounded-full hover:bg-amber-100 transition"
            title={isAr ? 'إغلاق التنبيه' : 'Dismiss'}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
