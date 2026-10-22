import React from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import Image from 'next/image';

export default async function CollectionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const collections = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } }
    }
  });

  return (
    <div className="bg-[var(--color-ivory-100)] min-h-screen pb-20">
      {/* Header Banner */}
      <div className="bg-[#3F4832] text-white py-16 text-center border-b-4 border-[var(--color-champagne-600)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/pattern.png')] opacity-10 bg-repeat" />
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">
            {isAr ? 'تشكيلات رَواق' : 'Rawaq collections'}
          </h1>
          <p className="text-zinc-300 text-lg max-w-2xl mx-auto">
            {isAr 
              ? 'تصفحي الفئات المتاحة واختاري ما يناسبك.'
              : 'Explore the available categories and find what feels like you.'}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {collections.map((collection) => (
            <Link 
              href={`/${locale}/shop?category=${collection.id}`} 
              key={collection.id} 
              className="group flex flex-col overflow-hidden rounded-2xl shadow-sm hover:shadow-xl transition-all duration-500 bg-white border border-[var(--color-ivory-200)]"
            >
              <div className="aspect-[4/3] w-full relative bg-zinc-100 overflow-hidden">
                {collection.imagePath ? (
                  <Image 
                    src={collection.imagePath.startsWith('local://') ? collection.imagePath.replace('local://', '/') : collection.imagePath} 
                    alt={collection.name} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-100">
                    <span className="text-zinc-400 font-heading text-lg">رَواق</span>
                  </div>
                )}
              </div>
              
              <div className="p-6 flex flex-col flex-grow bg-white z-10">
                <h3 className="text-2xl font-bold font-heading mb-2 text-zinc-900 group-hover:text-[var(--color-champagne-600)] transition-colors">{collection.name}</h3>
                
                {collection.description && (
                  <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                    {collection.description}
                  </p>
                )}

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-zinc-100">
                  <p className="text-zinc-600 font-medium text-sm">
                    {collection._count.products} {isAr ? 'منتج' : 'products'}
                  </p>
                  <span className="text-[var(--color-champagne-600)] bg-[var(--color-champagne-50)] p-2 rounded-full transform group-hover:scale-110 transition-transform duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {collections.length === 0 && (
          <div className="text-center py-20 text-zinc-500">
            {isAr ? 'لا توجد مجموعات متاحة حالياً.' : 'No collections available at the moment.'}
          </div>
        )}
      </div>
    </div>
  );
}
