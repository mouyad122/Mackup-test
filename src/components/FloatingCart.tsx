'use client';
// Force Turbopack to recompile

import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';

export function FloatingCart({ locale = 'ar' }: { locale?: string }) {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Hide floating cart on admin, pos, or if already in cart page (but show on checkout)
  const isHiddenRoute = pathname.includes('/admin') ||
                        pathname.includes('/pos') ||
                        pathname.includes('/cart');

  useEffect(() => {
    const loadCart = () => {
      try {
        const current = localStorage.getItem('makeup_cart');
        setCartItems(current ? JSON.parse(current) : []);
      } catch (e) {
        setCartItems([]);
      }
    };

    loadCart();
    setMounted(true);

    // Listen for storage events (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'makeup_cart') loadCart();
    };

    // Custom event for same-tab updates (dispatched by Add to Cart button)
    window.addEventListener('storage', handleStorage);
    window.addEventListener('cart_updated', loadCart);

    // Poll as a safety net
    const interval = setInterval(loadCart, 2000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cart_updated', loadCart);
      clearInterval(interval);
    };
  }, []);

  // Don't render anything before mount (avoids SSR mismatch)
  if (!mounted) return null;
  if (isHiddenRoute || cartItems.length === 0) return null;

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="fixed z-[100] animate-bounce-in w-full bottom-0 left-0 right-0 md:w-auto md:bottom-6 md:right-6 md:left-auto" dir="rtl">
      <Link href={`/${locale}/checkout`} className="block w-full">
        <div className="bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white p-4 md:rounded-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] md:shadow-2xl flex items-center justify-between md:justify-start gap-4 transition-transform md:hover:scale-105 border-t-2 md:border-2 border-[var(--color-champagne-600)]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ShoppingBag className="w-8 h-8 text-[var(--color-champagne-400)]" />
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[var(--color-charcoal-900)]">
                {totalQuantity}
              </span>
            </div>
            <div className="flex flex-col pr-4 border-r border-white/20">
              <span className="text-xs text-zinc-300">إجمالي السلة</span>
              <span className="font-bold text-sm">{filsToDisplay(totalPrice, 'ar')}</span>
            </div>
          </div>
          
          <div className="md:hidden">
            <span className="bg-[var(--color-champagne-600)] text-white px-6 py-2 rounded font-bold text-sm">إتمام الطلب</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
