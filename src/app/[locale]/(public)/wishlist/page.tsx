'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';

export default function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const [wishlist, setWishlist] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('makeup_wishlist');
    if (saved) {
      try {
        setWishlist(JSON.parse(saved));
      } catch (e) {}
    }
    setMounted(true);
  }, []);

  const removeFromWishlist = (id: string) => {
    const updated = wishlist.filter(item => item.id !== id);
    setWishlist(updated);
    localStorage.setItem('makeup_wishlist', JSON.stringify(updated));
  };

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-6 py-16 bg-[var(--color-ivory-100)] min-h-screen">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)] mb-4">
          {isAr ? 'قائمة المفضلة' : 'My Wishlist'}
        </h1>
        <div className="w-24 h-1 bg-[var(--color-champagne-600)] mx-auto" />
      </div>

      <div className="max-w-4xl mx-auto">
        {wishlist.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg border border-[var(--color-ivory-200)] p-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-[var(--color-charcoal-600)]"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            <p className="text-xl text-zinc-500 mb-4">
              {isAr ? 'قائمة المفضلة فارغة.' : 'Your wishlist is currently empty.'}
            </p>
            <Link 
              href={`/${locale}/shop`}
              className="inline-block bg-[var(--color-charcoal-900)] text-white px-6 py-3 rounded font-bold"
            >
              {isAr ? 'تصفح المكياج' : 'Browse Makeup'}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wishlist.map((item, index) => (
              <div 
                key={item.id || index} 
                className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm flex items-center gap-6"
              >
                <div className="w-24 h-24 bg-[var(--color-ivory-200)] rounded-md flex-shrink-0 flex items-center justify-center text-[var(--color-charcoal-600)] text-xs overflow-hidden">
                  {item.imageUrl ? (
                    <div 
                      className="w-full h-full bg-contain bg-center bg-no-repeat" 
                      style={{ backgroundImage: `url(${item.imageUrl.startsWith('local://') ? item.imageUrl.replace('local://', '/') : item.imageUrl})` }} 
                    />
                  ) : 'صورة العطر'}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[var(--color-charcoal-900)] mb-1">
                    {item.nameAr || item.name}
                  </h3>
                  <div className="text-[var(--color-champagne-600)] font-bold text-lg mb-4">
                    {filsToDisplay(item.price, isAr ? 'ar' : 'en')}
                  </div>
                  
                  <div className="flex gap-3">
                    <Link 
                      href={`/${locale}/products/${item.slug}`}
                      className="text-xs bg-[var(--color-charcoal-900)] text-white px-4 py-2 rounded font-bold hover:bg-[var(--color-charcoal-800)]"
                    >
                      {isAr ? 'عرض المنتج' : 'View Product'}
                    </Link>
                    <button 
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-xs border border-red-200 text-red-600 px-4 py-2 rounded font-bold hover:bg-red-50"
                    >
                      {isAr ? 'إزالة' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
