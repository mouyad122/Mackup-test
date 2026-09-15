'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';
import { WishlistHeart } from '@/components/WishlistHeart';

interface Product {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  stockStatus: string;
  variants: any[];
  images: any[];
  category?: { name: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  products: Product[];
}

export function MobileCategoriesFeed({ categories, locale, isAr }: { categories: Category[], locale: string, isAr: boolean }) {
  // Track which categories are expanded into a grid
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const toggleExpand = (catId: string) => {
    setExpandedCats(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  return (
    <div className="md:hidden space-y-12">
      {categories.map(category => {
        if (!category.products || category.products.length === 0) return null;
        const isExpanded = !!expandedCats[category.id];

        return (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center justify-between px-6">
              <h3 className="text-2xl font-bold font-heading text-[var(--color-charcoal-900)]">
                {category.name}
              </h3>
              <Link href={`/${locale}/shop?category=${category.id}`} className="text-xs font-bold text-[var(--color-champagne-600)] hover:underline">
                {isAr ? 'عرض الكل' : 'View All'}
              </Link>
            </div>
            
            <div 
              className={`px-6 pb-4 ${isExpanded ? 'grid grid-cols-2 gap-4' : 'flex overflow-x-auto snap-x snap-mandatory gap-4'}`}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {category.products.map(product => {
                const mainImage = product.images?.find(img => img.isMain) || product.images?.[0];
                const lowestPrice = product.variants?.length > 0 
                  ? Math.min(...product.variants.map(v => v.price))
                  : 0;

                return (
                  <Link 
                    href={`/${locale}/products/${product.slug}`} 
                    key={product.id}
                    className={`group bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] flex flex-col snap-start shrink-0 ${isExpanded ? 'w-full h-full' : 'w-48'} hover:border-[var(--color-champagne-600)] transition-all overflow-hidden`}
                  >
                    <div className="relative aspect-[4/3] w-full bg-[var(--color-ivory-200)]">
                      <div className="absolute top-2 right-2 z-20">
                        <WishlistHeart product={{
                          id: product.id,
                          nameAr: product.nameAr,
                          nameEn: product.nameEn,
                          slug: product.slug,
                          imageUrl: mainImage?.url || '',
                          price: lowestPrice,
                          stockStatus: product.stockStatus
                        }} />
                      </div>
                      {mainImage ? (
                        <div className="w-full h-full bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url}")` }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--color-charcoal-600)] text-[10px]">
                          {isAr ? 'صورة العطر' : 'Makeup Image'}
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center flex-1 flex flex-col">
                      <h4 className="text-sm font-bold text-[var(--color-charcoal-900)] mb-1 truncate">
                        {isAr ? product.nameAr : product.nameEn}
                      </h4>
                      <div className="mt-auto text-xs text-[var(--color-champagne-600)] font-bold">
                        {lowestPrice > 0 ? filsToDisplay(lowestPrice, 'ar') : (isAr ? 'اختر الحجم' : 'Select Size')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {category.products.length > 2 && (
              <div className="px-6">
                <button 
                  onClick={() => toggleExpand(category.id)}
                  className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-bold rounded-lg transition-colors shadow-sm"
                >
                  {isExpanded ? (isAr ? 'عرض أقل' : 'Show Less') : (isAr ? 'عرض المزيد من ' + category.name : 'Show more from ' + category.name)}
                </button>
              </div>
            )}
          </div>
        );
      })}
      
      <style dangerouslySetInnerHTML={{__html: `
        .snap-x::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}
