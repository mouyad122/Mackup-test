'use client';

import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';

interface WishlistHeartProps {
  product: {
    id: string;
    nameAr: string;
    nameEn: string;
    slug: string;
    imageUrl: string;
    price: number;
    stockStatus: string;
  };
  className?: string;
}

export function WishlistHeart({ product, className = '' }: WishlistHeartProps) {
  const [isWished, setIsWished] = useState(false);

  useEffect(() => {
    const checkWishlist = () => {
      const saved = localStorage.getItem('makeup_wishlist');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setIsWished(parsed.some((p: any) => p.id === product.id));
        } catch (e) {}
      }
    };
    checkWishlist();
    window.addEventListener('wishlist_updated', checkWishlist);
    return () => window.removeEventListener('wishlist_updated', checkWishlist);
  }, [product.id]);

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let list = [];
    const saved = localStorage.getItem('makeup_wishlist');
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {}
    }

    if (isWished) {
      list = list.filter((p: any) => p.id !== product.id);
    } else {
      list.push({
        id: product.id,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        slug: product.slug,
        imageUrl: product.imageUrl,
        price: product.price,
        stockStatus: product.stockStatus
      });
    }

    localStorage.setItem('makeup_wishlist', JSON.stringify(list));
    setIsWished(!isWished);
    window.dispatchEvent(new Event('wishlist_updated'));
  };

  return (
    <button
      onClick={toggleWishlist}
      className={`p-2 rounded-full backdrop-blur-md transition-all ${
        isWished ? 'bg-red-50 text-red-500 shadow-inner' : 'bg-white/70 text-zinc-400 hover:text-red-500 hover:bg-white/90 shadow'
      } ${className}`}
      aria-label={isWished ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
    >
      <Heart className={`w-5 h-5 ${isWished ? 'fill-current' : ''}`} />
    </button>
  );
}
