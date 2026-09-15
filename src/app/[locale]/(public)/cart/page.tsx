'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';

export default function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const [cart, setCart] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const loadCart = () => {
      try {
        const saved = localStorage.getItem('makeup_cart');
        setCart(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };

    loadCart();
    setMounted(true);

    // Listen for same-tab updates (add to cart dispatches this)
    window.addEventListener('cart_updated', loadCart);
    // Cross-tab updates
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'makeup_cart') loadCart();
    };
    window.addEventListener('storage', handleStorage);
    // Re-check when user returns to this tab
    window.addEventListener('focus', loadCart);

    return () => {
      window.removeEventListener('cart_updated', loadCart);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadCart);
    };
  }, []);

  const updateQuantity = (sku: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.sku === sku) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updated);
    localStorage.setItem('makeup_cart', JSON.stringify(updated));
  };

  const removeFromCart = (sku: string) => {
    const updated = cart.filter(item => item.sku !== sku);
    setCart(updated);
    localStorage.setItem('makeup_cart', JSON.stringify(updated));
  };

  const getSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-6 py-16 bg-[var(--color-ivory-100)] min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-4">
          {isAr ? 'سلة التسوق' : 'Shopping Cart'}
        </h1>
        <div className="w-24 h-1 bg-[var(--color-champagne-600)] mx-auto" />
      </div>

      <div className="max-w-4xl mx-auto">
        {cart.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-[var(--color-ivory-200)] p-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-[var(--color-charcoal-600)]"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
            <p className="text-xl text-zinc-500 mb-4">
              {isAr ? 'سلة التسوق فارغة حالياً.' : 'Your cart is currently empty.'}
            </p>
            <Link 
              href={`/${locale}/shop`}
              className="inline-block bg-[var(--color-charcoal-900)] text-white px-6 py-3 rounded font-bold"
            >
              {isAr ? 'تصفح المتجر' : 'Browse Shop'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items List */}
            <div className="lg:col-span-2 space-y-6">
              {cart.map((item) => (
                <div 
                  key={item.sku} 
                  className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm flex gap-6"
                >
                  <div className="w-20 h-20 bg-[var(--color-ivory-200)] rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image ? (
                      <div 
                        className="w-full h-full bg-contain bg-center bg-no-repeat" 
                        style={{ backgroundImage: `url(${item.image.startsWith('local://') ? item.image.replace('local://','/') : item.image})` }} 
                      />
                    ) : 'صورة العطر'}
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between mb-2">
                      <h3 className="font-bold text-lg text-[var(--color-charcoal-900)]">
                        {item.name}
                      </h3>
                      <button 
                        onClick={() => removeFromCart(item.sku)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        {isAr ? 'إزالة' : 'Remove'}
                      </button>
                    </div>

                    <div className="text-sm text-zinc-500 mb-4">
                      {item.size} {item.stockStatus === 'UNVERIFIED' && (
                        <span className="text-amber-600 font-bold block text-xs mt-1">
                          {isAr ? 'بانتظار تأكيد التوفر' : 'Pending verification'}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center border border-zinc-200 rounded">
                        <button 
                          onClick={() => updateQuantity(item.sku, -1)}
                          className="px-3 py-1 bg-zinc-50 hover:bg-zinc-100 font-bold text-lg"
                        >
                          -
                        </button>
                        <span className="px-4 font-bold">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.sku, 1)}
                          className="px-3 py-1 bg-zinc-50 hover:bg-zinc-100 font-bold text-lg"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-[var(--color-champagne-600)] font-bold text-lg">
                        {filsToDisplay(item.price * item.quantity, isAr ? 'ar' : 'en')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart Summary */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm h-fit">
              <h2 className="text-xl font-bold text-[var(--color-charcoal-900)] mb-6 border-b pb-4">
                {isAr ? 'ملخص السلة' : 'Summary'}
              </h2>
              
              <div className="space-y-4 text-zinc-700 mb-6">
                <div className="flex justify-between">
                  <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span className="font-bold">{filsToDisplay(getSubtotal(), isAr ? 'ar' : 'en')}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-500">
                  <span>{isAr ? 'التوصيل' : 'Shipping'}</span>
                  <span>{isAr ? 'يُحسب عند الدفع' : 'Calculated at checkout'}</span>
                </div>
              </div>
              
              <Link 
                href={`/${locale}/checkout`}
                className="block text-center w-full bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white py-3 rounded font-bold transition-colors"
              >
                {isAr ? 'إتمام الشراء عبر الواتساب' : 'Proceed to Checkout'}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
