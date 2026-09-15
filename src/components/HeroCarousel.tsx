'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export interface HeroSlide {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  eyebrowAr: string | null;
  eyebrowEn: string | null;
  ctaAr: string | null;
  ctaEn: string | null;
  imageDesktopPath: string;
  imageMobilePath: string;
  altAr: string;
  altEn: string;
  destinationType: string;
  productId: string | null;
  collectionId: string | null;
  categoryId: string | null;
  internalPath: string | null;
  externalUrl: string | null;
  displayOrder: number;
  isEnabled: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  openInNewTab: boolean;
  overlayStrength: number;
  textPosition: string;
  product?: { slug: string } | null;
  category?: { slug: string; name: string } | null;
  collection?: { slug: string } | null;
}

export interface CarouselSettings {
  enabled: boolean;
  autoplayEnabled: boolean;
  autoplayIntervalMs: number;
  pauseOnHover: boolean;
  showIndicators: boolean;
  showNavigation: boolean;
  transitionType: string;
}

interface HeroCarouselProps {
  slides: HeroSlide[];
  settings: CarouselSettings;
}

export function HeroCarousel({ slides, settings }: HeroCarouselProps) {
  const { locale = 'ar' } = useParams() as { locale?: string };
  const isAr = locale === 'ar';

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  // 1. Detect user preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Filter slides strictly based on active rules: enabled, not expired/future
  const activeSlides = slides.filter(slide => {
    if (!slide.isEnabled) return false;
    const now = new Date();
    if (slide.startsAt && new Date(slide.startsAt) > now) return false;
    if (slide.endsAt && new Date(slide.endsAt) < now) return false;
    return true;
  });

  // 2. Localized navigation URL resolver
  const resolveSlideUrl = (slide: HeroSlide) => {
    const prefix = `/${locale}`;
    switch (slide.destinationType) {
      case 'COLLECTION':
        return slide.collection ? `${prefix}/collections/${slide.collection.slug}` : '#';
      case 'CATEGORY':
        return slide.category ? `${prefix}/shop?category=${slide.category.slug}` : '#';
      case 'PRODUCT':
        return slide.product ? `${prefix}/products/${slide.product.slug}` : '#';
      case 'INTERNAL_ROUTE':
        return slide.internalPath ? `${prefix}${slide.internalPath.startsWith('/') ? '' : '/'}${slide.internalPath}` : '#';
      case 'EXTERNAL_URL':
        return slide.externalUrl || '#';
      default:
        return '#';
    }
  };

  const isVideo = (path: string) => /\.(mp4|webm|ogg)$/i.test(path || '');

  // 3. Autoplay rotation logic
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (!settings.autoplayEnabled || isPaused || prefersReducedMotion || activeSlides.length <= 1) {
      return;
    }

    const currentSlide = activeSlides[currentIndex];
    const isVideoMedia = isVideo(currentSlide?.imageDesktopPath);

    // If it is an image or gif, we use the specific autoplay interval (seconds added by the user).
    // If it is a video, we will rely on the `onEnded` event on the video tag.
    if (!isVideoMedia) {
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % activeSlides.length);
      }, settings.autoplayIntervalMs);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, isPaused, prefersReducedMotion, activeSlides, settings.autoplayEnabled, settings.autoplayIntervalMs]);

  // Pause autoplay when the browser tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsPaused(true);
      } else {
        setIsPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (activeSlides.length === 0) {
    return null; // Fallback handles this inside the page
  }

  // 4. Manual controls
  const handlePrev = () => {
    setIsPaused(true);
    setCurrentIndex(prev => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = () => {
    setIsPaused(true);
    setCurrentIndex(prev => (prev + 1) % activeSlides.length);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      // In RTL, left arrow goes to next slide; in LTR, left arrow goes to previous slide
      if (isAr) handleNext();
      else handlePrev();
    } else if (e.key === 'ArrowRight') {
      if (isAr) handlePrev();
      else handleNext();
    }
  };

  // Touch swipe support (RTL aware!)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    
    // Swipe threshold 50px
    if (Math.abs(diff) > 50) {
      setIsPaused(true);
      if (diff > 0) {
        // Swipe left: next slide in LTR, previous slide in RTL
        if (isAr) handlePrev();
        else handleNext();
      } else {
        // Swipe right: previous slide in LTR, next slide in RTL
        if (isAr) handleNext();
        else handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  return (
    <div 
      className="relative w-full h-full min-h-[60vh] lg:min-h-[80vh] overflow-hidden select-none group/carousel focus:outline-none focus:ring-1 focus:ring-[var(--color-champagne-500)]"
      onMouseEnter={() => settings.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => settings.pauseOnHover && setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Carousel"
    >
      {/* Slides Viewport */}
      <div className="relative w-full h-full min-h-[60vh] lg:min-h-[80vh]">
        {activeSlides.map((slide, index) => {
          const isActive = index === currentIndex;
          const slideUrl = resolveSlideUrl(slide);
          const hasAction = slide.destinationType !== 'NONE';
          const isVideoMedia = isVideo(slide.imageDesktopPath);

          // GPU-friendly transitions: absolute positioning, fading opacity, scaling background
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-all duration-[600ms] ease-out-expo flex flex-col justify-end ${
                isActive 
                  ? 'opacity-100 scale-100 pointer-events-auto z-10' 
                  : 'opacity-0 scale-[0.98] pointer-events-none z-0'
              }`}
              style={{ transitionProperty: prefersReducedMotion ? 'opacity' : 'opacity, transform' }}
            >
              {/* Media Delivery (Video or Image) */}
              {slide.imageDesktopPath ? (
                isVideoMedia ? (
                  <video 
                    src={slide.imageDesktopPath}
                    autoPlay
                    loop={activeSlides.length <= 1 || !settings.autoplayEnabled}
                    muted
                    playsInline
                    onEnded={(e) => {
                      if (settings.autoplayEnabled && activeSlides.length > 1) {
                        setCurrentIndex(prev => (prev + 1) % activeSlides.length);
                        // Reset for when slide comes back
                        const video = e.currentTarget;
                        video.currentTime = 0;
                        video.play().catch(() => {});
                      }
                    }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms] ease-out scale-102 group-hover/carousel:scale-105"
                    style={{
                      transitionProperty: prefersReducedMotion ? 'none' : 'transform',
                      contentVisibility: isActive ? 'auto' : 'hidden'
                    }}
                  />
                ) : (
                  <Image
                    src={slide.imageDesktopPath}
                    alt={isAr ? slide.altAr : slide.altEn}
                    fill
                    priority={index === 0} // Load LCP image eagerly
                    sizes="100vw"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[8000ms] ease-out scale-102 group-hover/carousel:scale-105"
                    style={{
                      transitionProperty: prefersReducedMotion ? 'none' : 'transform',
                      contentVisibility: isActive ? 'auto' : 'hidden'
                    }}
                  />
                )
              ) : (
                <div className="absolute inset-0 w-full h-full bg-zinc-800 transition-transform duration-[8000ms] ease-out scale-102 group-hover/carousel:scale-105" />
              )}

              {/* Dynamic Gradient Overlay */}
              <div 
                className="absolute inset-0 bg-gradient-to-t from-neutral-950/85 via-neutral-900/40 to-transparent" 
                style={{ opacity: slide.overlayStrength }}
              />

              {/* Text Layer */}
              <div className={`relative z-20 p-6 md:p-10 w-full text-white space-y-2 text-right ${
                slide.textPosition === 'LEFT' ? 'text-left lg:text-left rtl:text-right' : 
                slide.textPosition === 'RIGHT' ? 'text-right lg:text-right rtl:text-left' : 'text-center'
              }`}>
                {/* Eyebrow Accent */}
                {(isAr ? slide.eyebrowAr : slide.eyebrowEn) && (
                  <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-[var(--color-champagne-400)] bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm">
                    {isAr ? slide.eyebrowAr : slide.eyebrowEn}
                  </span>
                )}

                {/* Localized Title */}
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-sm font-heading">
                  {isAr ? slide.titleAr : slide.titleEn}
                </h3>

                {/* Localized Short description */}
                <p className="text-xs md:text-sm text-zinc-200 line-clamp-2 max-w-lg mx-auto lg:mx-0 drop-shadow-sm">
                  {isAr ? slide.descriptionAr : slide.descriptionEn}
                </p>

                {/* Action CTA */}
                {hasAction && (
                  <div className="pt-2">
                    <Link
                      href={slideUrl}
                      target={slide.openInNewTab ? '_blank' : undefined}
                      rel={slide.openInNewTab ? 'noopener noreferrer' : undefined}
                      className="inline-block bg-[var(--color-champagne-600)] hover:bg-[var(--color-champagne-500)] text-white text-xs font-bold px-4 py-2 rounded-sm transition-all transform active:scale-98 shadow-sm hover:shadow"
                    >
                      {isAr ? (slide.ctaAr || 'عرض التفاصيل') : (slide.ctaEn || 'Explore Now')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Prev / Next controls */}
      {settings.showNavigation && activeSlides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute top-1/2 -translate-y-1/2 right-4 z-20 w-8 h-8 rounded-full bg-neutral-900/60 hover:bg-neutral-900/80 text-white flex items-center justify-center border border-white/10 opacity-0 group-hover/carousel:opacity-100 transition-opacity focus:opacity-100"
            aria-label={isAr ? 'السابق' : 'Previous slide'}
          >
            {isAr ? '→' : '←'}
          </button>
          <button
            onClick={handleNext}
            className="absolute top-1/2 -translate-y-1/2 left-4 z-20 w-8 h-8 rounded-full bg-neutral-900/60 hover:bg-neutral-900/80 text-white flex items-center justify-center border border-white/10 opacity-0 group-hover/carousel:opacity-100 transition-opacity focus:opacity-100"
            aria-label={isAr ? 'التالي' : 'Next slide'}
          >
            {isAr ? '←' : '→'}
          </button>
        </>
      )}

      {/* Indicators */}
      {settings.showIndicators && activeSlides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {activeSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setIsPaused(true);
                setCurrentIndex(index);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-[var(--color-champagne-500)] w-4' 
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Slide ${index + 1}`}
              aria-current={index === currentIndex ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default HeroCarousel;
