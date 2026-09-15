'use client';

import React from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';

interface SuggestedProduct {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  imageUrl: string | null;
  lowestPrice: number;
}

interface SuggestedProductsProps {
  products: SuggestedProduct[];
  locale: string;
}

export default function SuggestedProducts({ products, locale }: SuggestedProductsProps) {
  if (!products || products.length === 0) return null;

  const isAr = locale === 'ar';
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <section className="mt-16 pt-12 border-t border-[var(--color-ivory-200)]">
      <div className="mb-8 text-center">
        <h2 className="text-2xl md:text-3xl font-bold font-heading text-[var(--color-charcoal-900)] mb-2">
          {isAr ? 'مكياج قد تعجبك' : 'You May Also Like'}
        </h2>
        <p className="text-[var(--color-charcoal-600)] text-sm">
          {isAr ? 'اكتشف تشكيلة مختارة من المكياج المميزة' : 'Discover our curated fragrance selection'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const imageUrl = product.imageUrl?.startsWith('local://')
            ? product.imageUrl.replace('local://', '/')
            : product.imageUrl || '/product-placeholder.png';

          const productName = isAr ? product.nameAr : product.nameEn;

          return (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              className="group block bg-white rounded-2xl border border-[var(--color-ivory-200)] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Image */}
              <div className="aspect-[4/3] bg-[var(--color-ivory-100)] overflow-hidden relative">
                <div
                  className="w-full h-full bg-cover bg-center bg-no-repeat transform group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: `url("${imageUrl}")` }}
                />
                {/* Shimmer overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-[var(--color-charcoal-900)] text-base mb-1 truncate group-hover:text-[var(--color-champagne-700)] transition-colors">
                  {productName}
                </h3>
                {product.lowestPrice > 0 && (
                  <p className="text-[var(--color-champagne-700)] font-bold text-sm">
                    {isAr ? 'يبدأ من' : 'From'}{' '}
                    <span className="text-base">{filsToDisplay(product.lowestPrice)}</span>
                  </p>
                )}
                <div className="mt-3 flex items-center gap-1 text-xs font-bold text-[var(--color-champagne-600)] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <span>{isAr ? 'تصفح العطر' : 'View Fragrance'}</span>
                  <span className="text-sm">{isAr ? '←' : '→'}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
