'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';
import { WishlistHeart } from '@/components/WishlistHeart';
import { RawaqProductFrame } from '@/components/RawaqProductFrame';

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
    <div className="md:hidden space-y-16">
      {categories.map(category => {
        if (!category.products || category.products.length === 0) return null;
        const isExpanded = !!expandedCats[category.id];

        return (
          <div key={category.id} className="space-y-5">
            <div className="flex items-end justify-between px-2">
              <div>
                <p className="rawaq-eyebrow text-[#B7935F] mb-1">{isAr ? 'تشكيلة' : 'EDIT'}</p>
                <h3 className="text-2xl font-bold font-heading text-[#2B2B2B]">
                  {category.name}
                </h3>
              </div>
              <Link href={`/${locale}/shop?category=${category.id}`} className="text-xs font-bold text-[#3F4B32] pb-1 flex items-center gap-1 group">
                {isAr ? 'عرض الكل' : 'View all'}
                <span className="transition-transform group-hover:-translate-x-1" aria-hidden="true">{isAr ? '←' : '→'}</span>
              </Link>
            </div>
            
            <div 
              className={`pb-4 ${isExpanded ? 'grid grid-cols-2 gap-3 px-2' : 'flex overflow-x-auto snap-x snap-mandatory gap-4 px-2'}`}
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
                    className={`group relative flex flex-col outline-none transition-all snap-start shrink-0 ${isExpanded ? 'w-full h-full' : 'w-[200px]'}`}
                  >
                    <RawaqProductFrame className="w-full shrink-0">
                      <div className="absolute top-2.5 right-2.5 z-20">
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
                        <div className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-[1.03]" style={{ backgroundImage: `url("${mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url}")` }} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl text-[#3F4B32]/20">✦</div>
                      )}
                    </RawaqProductFrame>
                    <div className="flex min-h-[90px] flex-1 flex-col pt-3 px-1 text-center bg-transparent">
                      <h4 className="text-sm font-semibold text-[#2B2B2B] mb-1 line-clamp-2 leading-snug group-hover:text-[#3F4B32] transition-colors">
                        {isAr ? product.nameAr : product.nameEn}
                      </h4>
                      <div className="mt-auto pt-1 text-sm text-[#3F4B32] font-bold">
                        {lowestPrice > 0 ? `${isAr ? 'ابتداءً من ' : 'From '} ${filsToDisplay(lowestPrice, isAr ? 'ar' : 'en')}` : (isAr ? 'عرض التفاصيل' : 'View details')}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {category.products.length > 2 && (
              <div className="px-2">
                <button 
                  onClick={() => toggleExpand(category.id)}
                  className="w-full py-3.5 bg-transparent border border-[#B7935F] text-[#2B2B2B] text-sm font-bold rounded-full transition-colors active:bg-[#B7935F] active:text-white"
                >
                  {isExpanded ? (isAr ? 'عرض أقل' : 'Show less') : (isAr ? 'عرض المزيد من ' + category.name : 'Show more from ' + category.name)}
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
