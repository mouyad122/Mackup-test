'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { RawaqProductFrame } from '@/components/RawaqProductFrame';

export function ProductGallery({ images, productName, isAr }: { images: { id?: string; url: string; isMain?: boolean }[]; productName: string; isAr: boolean; categorySlug?: string }) {
  const uploadedImages = images.filter(image => image.url && !image.url.includes('/images/templates/'));
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  
  const current = uploadedImages.find(image => image.url === selectedUrl) || uploadedImages.find(image => image.isMain) || uploadedImages[0];
  const imageUrl = current?.url.replace('local://', '/');

  useEffect(() => {
    if (!isLightboxOpen) return;
    const previousOverflow = document.body.style.overflow;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsLightboxOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', escape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', escape); };
  }, [isLightboxOpen]);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Main Image Viewport */}
      <button 
        type="button" 
        disabled={!imageUrl} 
        onClick={() => setIsLightboxOpen(true)} 
        aria-label={isAr ? 'تكبير صورة المنتج' : 'Enlarge product photo'} 
        className="aspect-square w-full disabled:cursor-default group focus:outline-none"
      >
        <RawaqProductFrame variant="gallery" className="w-full shadow-[0_8px_30px_rgba(139,30,45,.06)] transition-shadow duration-500 group-hover:shadow-[0_12px_40px_rgba(139,30,45,.12)]">
          {imageUrl ? (
            <div className="flex h-full w-full items-center justify-center relative overflow-hidden bg-[var(--surface-secondary)]">
              {/* Subtle radial gradient overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.4)_0%,transparent_100%)] pointer-events-none" />
              
              <Image 
                src={imageUrl} 
                alt={productName} 
                fill
                priority 
                sizes="(max-width: 768px) 100vw, 50vw" 
                className="object-contain p-6 md:p-10 transition-transform duration-700 ease-out group-hover:scale-[1.03]" 
              />
              
              {/* Zoom hint icon */}
              <div className="absolute bottom-4 end-4 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-[#E9DDCC] flex items-center justify-center text-[#746A64] opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-[#A69A8C] bg-[var(--surface-secondary)]">
              <span className="text-5xl mb-4 opacity-50">✦</span>
              <span className="text-sm tracking-wider uppercase font-bold">{isAr ? 'الصورة غير متوفرة' : 'Image unavailable'}</span>
            </div>
          )}
        </RawaqProductFrame>
      </button>

      {/* Thumbnails */}
      {uploadedImages.length > 1 && (
        <div className="flex flex-wrap justify-center gap-3">
          {uploadedImages.map((image, index) => {
            const isSelected = current?.url === image.url;
            return (
              <button 
                type="button" 
                key={image.id || image.url} 
                onClick={() => setSelectedUrl(image.url)} 
                aria-label={`${isAr ? 'صورة' : 'Photo'} ${index + 1}`} 
                aria-pressed={isSelected} 
                className={`relative h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                  isSelected 
                    ? 'border-[#B7935F] bg-[#F7F3EA] scale-[1.02] shadow-[0_4px_12px_rgba(201,162,77,.2)]' 
                    : 'border-[#E9DDCC] bg-white hover:border-[#B7935F]/60 hover:bg-[#F7F3EA]'
                }`}
              >
                <Image 
                  src={image.url.replace('local://', '/')} 
                  alt={`${productName} thumbnail ${index + 1}`} 
                  fill 
                  sizes="(max-width: 640px) 80px, 96px" 
                  className={`object-cover p-2 transition-transform duration-500 ${isSelected ? 'scale-100' : 'scale-95'}`} 
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {isLightboxOpen && imageUrl && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-label={productName} 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#1F1B1A]/95 backdrop-blur-md transition-opacity" 
          onClick={() => setIsLightboxOpen(false)}
        >
          <button 
            type="button" 
            autoFocus 
            onClick={() => setIsLightboxOpen(false)} 
            className="absolute right-4 top-4 md:right-8 md:top-8 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-white transition-colors" 
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X size={24} strokeWidth={1.5} />
          </button>
          
          <div 
            className="relative h-[85vh] w-full max-w-6xl px-4" 
            onClick={event => event.stopPropagation()}
          >
            <Image 
              src={imageUrl} 
              alt={productName} 
              fill 
              sizes="100vw" 
              className="object-contain" 
              quality={100}
            />
          </div>
          
          {/* Lightbox brand accent */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 opacity-60">
            <span className="h-px w-8 bg-[#B7935F]" />
            <span className="text-xs font-bold tracking-[0.2em] text-[#B7935F] uppercase">{isAr ? 'رَواق' : 'RAWAQ'}</span>
            <span className="h-px w-8 bg-[#B7935F]" />
          </div>
        </div>
      )}
    </div>
  );
}
