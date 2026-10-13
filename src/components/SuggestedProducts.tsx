'use client';

import React from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';
import { RawaqProductFrame } from '@/components/RawaqProductFrame';

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
  const isAr = locale === 'ar';
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || !products || products.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {products.map((product) => {
        const imageUrl = product.imageUrl?.startsWith('local://')
          ? product.imageUrl.replace('local://', '/')
          : product.imageUrl || '/brand/logo_rawaq.png';

        const productName = isAr ? product.nameAr : product.nameEn;

        return (
          <Link
            key={product.id}
            href={`/${locale}/products/${product.slug}`}
            className="group relative flex h-full flex-col outline-none transition-all duration-300 hover:-translate-y-1"
          >
            <RawaqProductFrame className="w-full shrink-0">
                <div
                  className="h-full w-full bg-cover bg-center bg-no-repeat transition-transform duration-700 group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url("${imageUrl}")` }}
                />
            </RawaqProductFrame>

            <div className="flex flex-1 flex-col pt-4 px-2 text-center bg-transparent">
              <h3 className="mb-1 line-clamp-2 text-base font-bold text-[#2B2B2B] transition-colors group-hover:text-[#3F4B32]">
                {productName}
              </h3>
              {product.lowestPrice > 0 && (
                <p className="mt-auto pt-1 text-sm font-bold text-[#3F4B32]">
                  {isAr ? 'يبدأ من' : 'From'} <span className="text-base">{filsToDisplay(product.lowestPrice, isAr ? 'ar' : 'en')}</span>
                </p>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
