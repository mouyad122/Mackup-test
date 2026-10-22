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
    <div className="min-h-screen bg-[#F7F3EA] pb-24">
      {/* Header */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">YOUR FAVORITES</p>
        <h1 className="mt-4 text-4xl md:text-5xl !text-white">{isAr ? 'قائمة الأمنيات' : 'My Wishlist'}</h1>
      </section>

      <div className="mx-auto max-w-5xl px-5 sm:px-8 -mt-8 relative z-10">
        {wishlist.length === 0 ? (
          <div className="rounded-3xl border border-[#E9DDCC] bg-white p-16 text-center shadow-sm">
            <span aria-hidden="true" className="block text-6xl text-[#B7935F]/30 mb-6">✦</span>
            <h2 className="text-2xl font-bold text-[#2B2B2B] mb-3">{isAr ? 'القائمة فارغة' : 'Your wishlist is empty'}</h2>
            <p className="text-[#746A64] mb-8">{isAr ? 'اكتشفي مجموعة رَواق الرائعة.' : 'Discover the beautiful Rawaq collection.'}</p>
            <Link href={`/${locale}/shop`} className="btn-rawaq-primary">{isAr ? 'تسوّقي الآن' : 'Shop Now'}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {wishlist.map((item, index) => (
              <div 
                key={item.id || index} 
                className="bg-white p-6 rounded-2xl border border-[#E9DDCC] shadow-sm flex items-center gap-6 group hover:shadow-[0_8px_30px_rgba(139,30,45,.06)] hover:border-[#B7935F]/40 transition-all duration-300"
              >
                <div className="w-24 h-32 bg-[#F7F3EA] rounded-xl flex-shrink-0 flex items-center justify-center text-[#746A64] text-xs overflow-hidden border border-[#E9DDCC]">
                  {item.imageUrl ? (
                    <div 
                      className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.03]" 
                      style={{ backgroundImage: `url(${item.imageUrl.startsWith('local://') ? item.imageUrl.replace('local://', '/') : item.imageUrl})` }} 
                    />
                  ) : <span className="text-3xl text-[#B7935F]/30">✦</span>}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-[#2B2B2B] leading-snug mb-2 group-hover:text-[#3F4832] transition-colors">
                    {item.nameAr || item.name}
                  </h3>
                  <div className="text-[#3F4832] font-bold text-lg mb-5">
                    {filsToDisplay(item.price, isAr ? 'ar' : 'en')}
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Link 
                      href={`/${locale}/products/${item.slug}`}
                      className="text-xs btn-rawaq-primary py-2 px-5"
                    >
                      {isAr ? 'عرض المنتج' : 'View Product'}
                    </Link>
                    <button 
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-xs bg-transparent border border-[#A69A8C] text-[#746A64] hover:border-[#3F4832] hover:text-[#3F4832] hover:bg-[#3F4832]/5 py-2 px-5 rounded-full font-bold transition-colors"
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
