'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProductsByIds } from '@/actions/products';
import { filsToDisplay } from '@/lib/money';

export default function WishlistClient({ locale }: { locale: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      const stored = localStorage.getItem('makeup_wishlist');
      if (stored) {
        try {
          const ids = JSON.parse(stored);
          if (Array.isArray(ids) && ids.length > 0) {
            const fetchedProducts = await getProductsByIds(ids);
            setProducts(fetchedProducts);
          }
        } catch (e) {
          console.error('Failed to parse wishlist', e);
        }
      }
      setLoading(false);
    };

    fetchWishlist();
  }, []);

  const removeFromWishlist = (id: string) => {
    const stored = localStorage.getItem('makeup_wishlist');
    if (stored) {
      try {
        let ids = JSON.parse(stored);
        if (Array.isArray(ids)) {
          ids = ids.filter((storedId: string) => storedId !== id);
          localStorage.setItem('makeup_wishlist', JSON.stringify(ids));
          setProducts(products.filter(p => p.id !== id));
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return <div className="text-center py-20">جاري التحميل...</div>;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-zinc-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <p className="text-xl text-zinc-500 mb-4">قائمة المفضلة فارغة.</p>
        <Link href={`/${locale}/shop`} className="inline-block bg-[#3F4832] text-white px-6 py-2 rounded font-bold hover:bg-[#2d3623] transition-colors">
          تصفح المتجر
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product) => {
        const mainImage = product.images.find((img: any) => img.isMain) || product.images[0];
        const lowestPrice = product.variants.length > 0 
          ? Math.min(...product.variants.map((v: any) => v.price))
          : 0;

        return (
          <div key={product.id} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-[var(--color-ivory-200)] flex flex-col h-full hover:border-[var(--color-champagne-600)] relative">
            <button 
              onClick={() => removeFromWishlist(product.id)}
              className="absolute top-2 left-2 z-10 bg-white rounded-full p-1.5 shadow-sm hover:bg-red-50 text-red-500 transition-colors"
              title="إزالة من المفضلة"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </button>
            <Link href={`/${locale}/products/${product.slug}`} className="flex-1 flex flex-col">
              <div className="relative aspect-[4/3] w-full bg-[var(--color-ivory-200)] rounded-md mb-4 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-[var(--color-charcoal-600)]">
                  {mainImage ? (
                    <div className="w-full h-full bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url(${mainImage.url.startsWith('local://') ? '/product-placeholder.png' : mainImage.url})` }} />
                  ) : 'صورة العطر'}
                </div>
              </div>
              <div className="text-center flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-[#3F4832] mb-1 group-hover:text-[var(--color-champagne-600)] transition-colors">{product.nameAr}</h3>
                <p className="text-xs text-zinc-500 mb-2">{product.category.name}</p>
                <div className="mt-auto text-[var(--color-champagne-600)] font-bold text-lg">
                  {lowestPrice > 0 ? filsToDisplay(lowestPrice, locale === 'ar' ? 'ar' : 'en') : 'نفذت الكمية'}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
