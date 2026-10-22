'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { WishlistHeart } from '@/components/WishlistHeart';
import { RawaqProductFrame } from '@/components/RawaqProductFrame';
import { getPaginatedProducts } from '@/actions/shop';
import { filsToDisplay } from '@/lib/money';

export function PaginatedProductGrid({
  initialProducts,
  totalCount,
  locale,
  filters
}: {
  initialProducts: any[];
  totalCount: number;
  locale: string;
  filters: { categoryId: string, q: string }
}) {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [skip, setSkip] = useState(initialProducts.length);
  const isAr = locale === 'ar';

  React.useEffect(() => {
    setProducts(initialProducts);
    setSkip(initialProducts.length);
  }, [initialProducts]);

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
      <div className="mb-8 flex items-center justify-between border-b border-[#E9DDCC] pb-4">
        <span className="text-sm font-bold tracking-wider text-[#A69A8C] uppercase">
          {isAr ? `عرض ${products.length} من ${totalCount}` : `Showing ${products.length} of ${totalCount}`}
        </span>
        <select className="appearance-none bg-transparent text-sm font-bold text-[#2B2B2B] focus:outline-none cursor-pointer pe-4 relative">
          <option>{isAr ? 'ترتيب حسب: الأحدث' : 'Sort by: Latest'}</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => {
          const mainImage = product.images?.find((img: any) => img.isMain) || product.images?.[0];
          const lowestPrice = product.variants?.length > 0
            ? Math.min(...product.variants.map((v: any) => v.price))
            : 0;
          const totalStock = product.variants?.filter((variant: { isActive: boolean }) => variant.isActive).length ?? 0;

          return (
            <article key={product.id} className="group relative flex h-full flex-col hover:-translate-y-1 transition-all duration-300 rounded-[1.5rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border border-[#E9DDCC] bg-white shadow-sm hover:shadow-md hover:border-[#B7935F]/60 overflow-hidden">
              <Link href={`/${locale}/products/${product.slug}`} className="flex h-full w-full outline-none flex-col group">
                <div className="relative w-full aspect-square bg-[#F7F3EA] shrink-0 border-b border-[#E9DDCC]/40">
                  <div className="absolute top-3 right-3 z-20">
                    <WishlistHeart product={{
                      id: product.id,
                      nameAr: product.nameAr,
                      nameEn: product.nameEn,
                      slug: product.slug,
                      imageUrl: mainImage?.url || '',
                      price: lowestPrice,
                      stockStatus: totalStock === 0 ? 'OUT_OF_STOCK' : 'IN_STOCK'
                    }} />
                  </div>

                  {mainImage ? (
                    <Image
                      src={mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url}
                      alt={isAr ? product.nameAr : product.nameEn}
                      fill
                      sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, 270px"
                      className={`object-contain p-5 transition duration-700 group-hover:scale-[1.03] ${totalStock === 0 ? 'opacity-50 grayscale-[0.3]' : ''}`}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#3F4832]/20">✦</div>
                  )}
                </div>

                <div className="flex flex-1 flex-col pt-4 pb-5 px-4 bg-white text-center">
                  {product.category?.name && (
                    <p className="text-[10px] tracking-[0.2em] text-[#B7935F] uppercase font-semibold mb-2 opacity-80">{product.category.name}</p>
                  )}
                  <h3 className="line-clamp-2 min-h-[3rem] text-sm md:text-[15px] font-medium leading-[1.6] text-[#242424] transition-colors group-hover:text-[#B7935F]">
                    {isAr ? product.nameAr : product.nameEn}
                  </h3>
                  <div className="mt-auto pt-4 flex items-center justify-center gap-1.5">
                    {product.variants?.length > 0 ? (
                      <>
                        <span className="text-[10px] uppercase tracking-widest text-[#A69A8C] font-semibold">{isAr ? 'ابتداءً من' : 'From'}</span>
                        <span className="text-[15px] font-bold text-[#3F4832]">{filsToDisplay(lowestPrice, isAr ? 'ar' : 'en')}</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-[#3F4832] underline underline-offset-4 decoration-[#D9C6A8]">{isAr ? 'اكتشفي التفاصيل' : 'Discover more'}</span>
                    )}
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="btn-rawaq-gold"
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {isAr ? 'عرض المزيد' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
