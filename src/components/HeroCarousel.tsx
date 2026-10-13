'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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

  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const activeSlides = useMemo(() => slides.filter(slide => {
    if (!slide.isEnabled) return false;
    const now = new Date();
    if (slide.startsAt && new Date(slide.startsAt) > now) return false;
    if (slide.endsAt && new Date(slide.endsAt) < now) return false;
    return true;
  }), [slides]);

  const resolveSlideUrl = (slide: HeroSlide) => {
    const prefix = `/${locale}`;
    switch (slide.destinationType) {
      case 'COLLECTION': return slide.collection ? `${prefix}/collections/${slide.collection.slug}` : '#';
      case 'CATEGORY': return slide.category ? `${prefix}/shop?category=${slide.category.slug}` : '#';
      case 'PRODUCT': return slide.product ? `${prefix}/products/${slide.product.slug}` : '#';
      case 'INTERNAL_ROUTE': return slide.internalPath ? `${prefix}${slide.internalPath.startsWith('/') ? '' : '/'}${slide.internalPath}` : '#';
      case 'EXTERNAL_URL': return slide.externalUrl || '#';
      default: return '#';
    }
  };

  const isVideo = (path: string) => /\.(mp4|webm|ogg)$/i.test(path || '');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // If no slides are available, we will render a fallback slide
  const slidesToRender = useMemo(() => activeSlides.length > 0 ? activeSlides : [{
    id: 'fallback',
    titleAr: 'أناقةٌ من أرضنا،\n**وجمالٌ يشبهكِ.**',
    titleEn: 'Rooted in Jordan,\n**made to feel like you.**',
    descriptionAr: 'من تراثنا نستلهم الجمال، لنروي حكايتك بأسلوب عصري يجمع الكوزمتكس والعبايات والأثواب الأردنية.',
    descriptionEn: 'From our heritage we draw beauty, to tell your story in a contemporary way — cosmetics, abayas and Jordanian thobes.',
    eyebrowAr: 'رَواق',
    eyebrowEn: 'RAWAQ',
    ctaAr: 'تسوّقي المجموعة',
    ctaEn: 'Shop the collection',
    imageDesktopPath: '',
    imageMobilePath: '',
    altAr: '',
    altEn: '',
    destinationType: 'INTERNAL_ROUTE',
    internalPath: '/shop',
    productId: null,
    collectionId: null,
    categoryId: null,
    externalUrl: null,
    displayOrder: 0,
    isEnabled: true,
    startsAt: null,
    endsAt: null,
    openInNewTab: false,
    overlayStrength: 0,
    textPosition: 'center'
  }], [activeSlides]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!settings.autoplayEnabled || isPaused || prefersReducedMotion || slidesToRender.length <= 1) return;
    const currentSlide = slidesToRender[currentIndex];
    const isVideoMedia = currentSlide ? isVideo(currentSlide.imageDesktopPath) : false;
    if (!isVideoMedia) {
      timeoutRef.current = setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % slidesToRender.length);
      }, settings.autoplayIntervalMs);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [currentIndex, isPaused, prefersReducedMotion, slidesToRender, settings.autoplayEnabled, settings.autoplayIntervalMs]);

  const handlePrev = () => {
    setIsPaused(true);
    setCurrentIndex(prev => (prev - 1 + slidesToRender.length) % slidesToRender.length);
  };
  const handleNext = () => {
    setIsPaused(true);
    setCurrentIndex(prev => (prev + 1) % slidesToRender.length);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      if (isAr) handleNext(); else handlePrev();
    } else if (e.key === 'ArrowRight') {
      if (isAr) handlePrev(); else handleNext();
    }
  };
  const handleTouchStart = (e: React.TouchEvent) => { touchStartXRef.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    if (Math.abs(diff) > 50) {
      setIsPaused(true);
      if (diff > 0) {
        if (isAr) handlePrev(); else handleNext();
      } else {
        if (isAr) handleNext(); else handlePrev();
      }
    }
    touchStartXRef.current = null;
  };

  const renderTitle = (title: string) => {
    const parts = title.split(/(\*\*.*?\*\*)/g);
    return (
      <>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={index} className="text-[#76584c]">{part.slice(2, -2)}</span>;
          }
          return part.split('\n').map((line, i) => (
            <React.Fragment key={`${index}-${i}`}>{line}{i < part.split('\n').length - 1 && <br />}</React.Fragment>
          ));
        })}
      </>
    );
  };

  return (
    <section
      className="relative isolate overflow-hidden select-none group/carousel focus:outline-none bg-[#1a1a1a]"
      onMouseEnter={() => settings.pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => settings.pauseOnHover && setIsPaused(false)}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      aria-label="Hero Carousel"
    >
      <div className="relative w-full h-[85vh] min-h-[600px] max-h-[900px]">
        {slidesToRender.map((slide, index) => {
          const isActive = index === currentIndex;
          const slideUrl = resolveSlideUrl(slide as any);
          const hasAction = slide.destinationType !== 'NONE';
          const isVideoMedia = isVideo(slide.imageDesktopPath);
          const eyebrow = isAr ? slide.eyebrowAr : slide.eyebrowEn;
          const title = isAr ? slide.titleAr : slide.titleEn;
          const description = isAr ? slide.descriptionAr : slide.descriptionEn;
          const cta = isAr ? slide.ctaAr : slide.ctaEn;
          
          // Determine layout style. In a real app, this could come from slide.textPosition
          // For now, Video is always full-bleed, others alternate or stay full-bleed for max impact.
          const layoutVariant = slide.textPosition === 'SPLIT' ? 'SPLIT' : 'FULL_BLEED';

          return (
            <div 
              key={slide.id}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {layoutVariant === 'FULL_BLEED' ? (
                /* -------------------------------------------------------------
                   VARIANT: FULL BLEED (IMAGE OR VIDEO)
                   ------------------------------------------------------------- */
                <>
                  <div className="absolute inset-0 bg-[#2b2b2b]">
                    {slide.imageDesktopPath ? (
                      isVideoMedia ? (
                        <video 
                          src={slide.imageDesktopPath} autoPlay loop muted playsInline
                          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[10000ms] ease-out scale-105 group-hover/carousel:scale-100"
                        />
                      ) : (
                        <Image
                          src={slide.imageDesktopPath} alt={isAr ? slide.altAr : slide.altEn} fill priority={index === 0}
                          className="absolute inset-0 h-full w-full object-cover opacity-90 transition-transform duration-[10000ms] ease-out scale-105 group-hover/carousel:scale-100"
                        />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#3F4B32]"><span className="text-white/20 text-6xl">✦</span></div>
                    )}
                  </div>
                  
                  {/* Dynamic Dark Overlays for Text Legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute inset-0 bg-black/20" />

                  <div className="relative z-20 h-full flex flex-col justify-end pb-24 md:pb-32 px-6 sm:px-12 lg:px-20 max-w-7xl mx-auto w-full">
                    <div className={`transform transition-all duration-[1000ms] delay-300 ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                      <p className="text-[#D9C6A8] text-[11px] md:text-sm font-bold tracking-[0.25em] uppercase mb-4 md:mb-5">
                        {eyebrow || 'RAWAQ'}
                      </p>
                      <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.5rem] leading-[1.15] text-white font-heading font-bold max-w-3xl drop-shadow-lg">
                        {renderTitle(title)}
                      </h1>
                      {description && (
                        <p className="mt-6 max-w-xl text-base md:text-lg text-white/90 leading-relaxed drop-shadow-md">
                          {description}
                        </p>
                      )}
                      
                      <div className="mt-8 md:mt-10 flex flex-wrap gap-4 items-center">
                        {hasAction && (
                          <Link href={slideUrl} className="bg-white text-[#2B2B2B] hover:bg-[#F7F3EA] px-8 py-3.5 rounded-full text-sm md:text-base font-bold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                            {cta || (isAr ? 'تسوّقي الآن' : 'Shop Now')}
                          </Link>
                        )}
                        <Link href={`/${locale}/about`} className="bg-transparent border border-white/50 text-white hover:bg-white/10 px-8 py-3.5 rounded-full text-sm md:text-base font-bold transition-all">
                          {isAr ? 'حكاية رَواق' : 'Our Story'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* -------------------------------------------------------------
                   VARIANT: SPLIT (IMAGE LEFT/RIGHT + TEXT)
                   ------------------------------------------------------------- */
                <div className="relative w-full h-full bg-[#F7F3EA] flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden">
                     {slide.imageDesktopPath ? (
                        <Image
                          src={slide.imageDesktopPath} alt={isAr ? slide.altAr : slide.altEn} fill priority={index === 0}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#E9DDCC]"><span className="text-white/50 text-6xl">✦</span></div>
                      )}
                  </div>
                  <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col justify-center px-8 md:px-16 lg:px-24">
                    <div className={`transform transition-all duration-[1000ms] delay-300 ${isActive ? 'translate-x-0 opacity-100' : (isAr ? '-translate-x-12 opacity-0' : 'translate-x-12 opacity-0')}`}>
                      <p className="text-[#A69A8C] text-[11px] md:text-sm font-bold tracking-[0.25em] uppercase mb-4">
                        {eyebrow || 'RAWAQ'}
                      </p>
                      <h1 className="text-4xl md:text-5xl lg:text-6xl leading-[1.15] text-[#242424] font-heading font-bold">
                        {renderTitle(title)}
                      </h1>
                      {description && (
                        <p className="mt-5 text-base md:text-lg text-[#626262] leading-relaxed">
                          {description}
                        </p>
                      )}
                      <div className="mt-8 flex flex-wrap gap-4 items-center">
                        {hasAction && (
                          <Link href={slideUrl} className="bg-[#3F4B32] text-white hover:bg-[#2A3321] px-8 py-3.5 rounded-full text-sm md:text-base font-bold shadow-lg transition-all">
                            {cta || (isAr ? 'اكتشفي المزيد' : 'Discover More')}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Global Carousel Indicators & Controls */}
        <div className="absolute bottom-6 md:bottom-10 left-0 right-0 z-30 flex items-center justify-center gap-6 px-6 pointer-events-none">
          {settings.showNavigation && activeSlides.length > 1 && (
            <button onClick={handlePrev} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30">
              {isAr ? '→' : '←'}
            </button>
          )}

          {settings.showIndicators && activeSlides.length > 1 && (
            <div className="flex gap-2.5 items-center pointer-events-auto" role="tablist">
              {slidesToRender.map((_, dotIndex) => (
                <button
                  key={dotIndex}
                  role="tab"
                  aria-selected={dotIndex === currentIndex}
                  aria-label={`Slide ${dotIndex + 1}`}
                  onClick={() => { setIsPaused(true); setCurrentIndex(dotIndex); }}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    dotIndex === currentIndex ? 'w-10 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}

          {settings.showNavigation && activeSlides.length > 1 && (
            <button onClick={handleNext} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-colors border border-white/30">
              {isAr ? '←' : '→'}
            </button>
          )}
        </div>

      </div>
    </section>
  );
}

export default HeroCarousel;
