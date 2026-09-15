'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const CATEGORY_TEMPLATES: Record<string, { swatch: string; model: string }> = {
  'lipstick': {
    swatch: '/images/templates/base-swatch.png',
    model: '/images/templates/base-lips.png',
  },
  'foundation': {
    swatch: '/images/templates/base-swatch.png',
    model: '/images/templates/base-lips.png', // Fallback for demo
  },
  'eyeshadow': {
    swatch: '/images/templates/base-swatch.png',
    model: '/images/templates/base-lips.png', // Fallback for demo
  },
  'default': {
    swatch: '/images/templates/base-swatch.png',
    model: '/images/templates/base-lips.png',
  }
};

export function ProductGallery({ images, productName, isAr, categorySlug }: { images: any[], productName: string, isAr: boolean, categorySlug?: string }) {
  const productMainImage = images?.find(img => img.isMain)?.url || images?.[0]?.url;
  
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [activeImageType, setActiveImageType] = useState<'MAIN' | 'SWATCH' | 'MODEL'>('MAIN');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    const handleVariantChange = (e: any) => {
      setSelectedVariant(e.detail);
      setActiveImageType('MAIN');
    };
    
    window.addEventListener('variant-changed', handleVariantChange);
    return () => window.removeEventListener('variant-changed', handleVariantChange);
  }, []);

  // Handle escape key to close lightbox
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'auto';
    };
  }, [isLightboxOpen]);

  // Determine templates based on category
  const slug = categorySlug?.toLowerCase() || 'default';
  let templateKey = 'default';
  if (slug.includes('lip')) templateKey = 'lipstick';
  else if (slug.includes('found')) templateKey = 'foundation';
  else if (slug.includes('eye')) templateKey = 'eyeshadow';
  else if (CATEGORY_TEMPLATES[slug]) templateKey = slug;

  const templates = CATEGORY_TEMPLATES[templateKey];

  // Helper to format URLs
  const getImgUrl = (url?: string) => {
    if (!url) return '';
    return url.startsWith('local://') || url.startsWith('/') ? url.replace('local://', '/') : url;
  };

  const mainImageUrl = getImgUrl(productMainImage);
  const colorHex = selectedVariant?.colorHex;

  // Render logic for different image types
  const renderContent = (type: 'MAIN' | 'SWATCH' | 'MODEL', isThumbnail: boolean) => {
    if (type === 'MAIN') {
      if (!mainImageUrl) {
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-500 font-medium tracking-wider uppercase">{isAr ? 'صورة المنتج' : 'Product Image'}</span>
          </div>
        );
      }
      return (
        <Image 
          src={mainImageUrl}
          alt={productName}
          fill
          sizes={isThumbnail ? "80px" : "(max-width: 768px) 100vw, 50vw"}
          className={`object-contain ${!isThumbnail && 'group-hover:scale-105 transition-transform duration-700'}`} 
        />
      );
    } else {
      const templateSrc = type === 'SWATCH' ? templates.swatch : templates.model;
      
      return (
        <div className="absolute inset-0 w-full h-full">
          <Image 
            src={templateSrc}
            alt={type === 'SWATCH' ? 'Swatch' : 'Model'}
            fill
            sizes={isThumbnail ? "80px" : "(max-width: 768px) 100vw, 50vw"}
            className="object-cover"
          />
          {colorHex && (
             <div 
               className="absolute inset-0 mix-blend-multiply pointer-events-none transition-colors duration-300" 
               style={{ backgroundColor: colorHex }} 
             />
          )}
        </div>
      );
    }
  };

  const thumbnails = [
    { type: 'MAIN' as const, label: isAr ? 'المنتج' : 'Main' },
    { type: 'SWATCH' as const, label: isAr ? 'اللون' : 'Swatch' },
    { type: 'MODEL' as const, label: isAr ? 'على المودل' : 'Model' }
  ];

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Image Container */}
      <div 
        onClick={() => setIsLightboxOpen(true)}
        className="relative w-full aspect-square bg-gray-50 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-100 group cursor-zoom-in"
      >
         {renderContent(activeImageType, false)}
      </div>

      {/* Thumbnails Container */}
      <div className="flex flex-row justify-center gap-4">
        {thumbnails.map((thumb) => {
           return (
            <div 
              key={thumb.type} 
              onClick={() => setActiveImageType(thumb.type)}
              className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                activeImageType === thumb.type 
                  ? 'border-black scale-105 shadow-md' 
                  : 'border-transparent opacity-60 hover:opacity-100 bg-gray-50'
              }`}
              title={thumb.label}
            >
              {renderContent(thumb.type, true)}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-fade-in">
          <button 
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 md:top-8 md:right-8 z-[101] p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            aria-label={isAr ? 'إغلاق' : 'Close'}
          >
            <X className="w-6 h-6 md:w-8 md:h-8" />
          </button>
          
          <div 
            className="relative w-full h-full max-w-5xl max-h-[90vh] mx-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsLightboxOpen(false);
            }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
                {activeImageType === 'MAIN' ? (
                   <Image 
                     src={mainImageUrl}
                     alt={productName}
                     fill
                     sizes="100vw"
                     className="object-contain p-4 md:p-12" 
                   />
                ) : (
                   <div className="relative w-full h-full max-w-2xl max-h-[70vh] aspect-square mx-auto">
                      <Image 
                        src={activeImageType === 'SWATCH' ? templates.swatch : templates.model}
                        alt="Preview"
                        fill
                        sizes="100vw"
                        className="object-contain"
                      />
                      {colorHex && (
                         <div 
                           className="absolute inset-0 mix-blend-multiply pointer-events-none transition-colors duration-300" 
                           style={{ backgroundColor: colorHex }} 
                         />
                      )}
                   </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
