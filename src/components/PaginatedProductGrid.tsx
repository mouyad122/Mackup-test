'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { WishlistHeart } from '@/components/WishlistHeart';
import { getPaginatedProducts } from '@/actions/shop';

export function PaginatedProductGrid({ 
  initialProducts, 
  totalCount, 
  locale,
  filters 
}: { 
  initialProducts: any[]; 
  totalCount: number; 
  locale: string;
  filters: { categoryId: string, brandId: string, finish: string, skinType: string, q: string }
}) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(initialProducts.length);
  const isAr = locale === 'ar';

  const hasMore = skip < totalCount;

  const handleLoadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const res = await getPaginatedProducts({
      skip,
      take: 40,
      ...filters
    });

    if (res.success && res.products) {
      setProducts(prev => [...prev, ...res.products]);
      setSkip(prev => prev + res.products.length);
    }
    
    setLoading(false);
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
        <span className="text-sm font-bold text-zinc-600">
          {isAr ? `إظهار ${products.length} من ${totalCount} نتيجة` : `Showing ${products.length} of ${totalCount} results`}
        </span>
        <select className="border border-zinc-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:border-[var(--color-rose-600)] bg-white text-zinc-700">
          <option>{isAr ? 'ترتيب حسب: الأحدث' : 'Sort by: Latest'}</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          const mainImage = product.images?.find((img: any) => img.isMain) || product.images?.[0];
          const lowestPrice = product.variants?.length > 0 
            ? Math.min(...product.variants.map((v: any) => v.price))
            : 0;

          return (
            <Link key={product.id} href={`/${locale}/products/${product.slug}`} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-[var(--color-ivory-200)] flex flex-col h-full hover:border-[var(--color-rose-600)]">
              <div className="relative aspect-[4/3] w-full bg-[var(--color-ivory-100)] rounded-md mb-4 overflow-hidden">
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
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-charcoal-600)] bg-white">
                  {mainImage ? (
                    <div className="w-full h-full bg-cover bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url("${mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url}")` }} />
                  ) : (isAr ? 'صورة المنتج' : 'Product Image')}
                </div>
              </div>
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-1 group-hover:text-[var(--color-rose-600)] transition-colors">{locale === 'ar' ? product.nameAr : product.nameEn}</h3>
                <p className="text-xs text-zinc-500 mb-2">{product.category?.name}</p>
                <div className="mt-auto text-sm text-[var(--color-rose-600)] font-bold">
                  {locale === 'ar' ? 'اختر اللون لعرض السعر' : 'Select shade for price'}
                </div>
              </div>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button className="w-full py-2 bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white rounded-sm text-sm font-bold shadow-md">
                  {locale === 'ar' ? 'عرض التفاصيل' : 'View Details'}
                </button>
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-12 flex justify-center">
          <button 
            onClick={handleLoadMore}
            disabled={loading}
            className="px-8 py-3 bg-white border-2 border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)] font-bold rounded hover:bg-[var(--color-charcoal-900)] hover:text-white transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
            {locale === 'ar' ? 'عرض المزيد' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
