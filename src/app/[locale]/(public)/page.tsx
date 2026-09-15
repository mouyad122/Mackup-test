import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getHeroSlides, getHeroCarouselSettings, getStoreLocationSettings } from '@/actions/homepage-cms';
import { HeroCarousel } from '@/components/HeroCarousel';
import { StoreLocationSection } from '@/components/StoreLocationSection';
import { WishlistHeart } from '@/components/WishlistHeart';
import type { Metadata } from 'next';

import { Sparkles } from 'lucide-react';
import { unstable_cache } from 'next/cache';

interface Params {
  locale?: string;
}

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale = 'ar' } = await params;
  const isAr = locale === 'ar';
  const BASE_URL = 'https://www.makeup-demo.com';

  return {
    title: isAr
      ? 'ميكاب ديمو — أفضل منتجات التجميل | الصفحة الرئيسية'
      : 'Makeup Demo — Best Beauty Products | Home',
    description: isAr
      ? 'ميكاب ديمو وجهتك الأولى لمنتجات التجميل والعناية بالبشرة. اكتشفي تشكيلاتنا من المكياج، الأرواج، والعناية المتكاملة.'
      : 'Makeup Demo is your premier destination for beauty and skincare products. Discover our collections of makeup, lipsticks, and complete care.',
    alternates: {
      canonical: `${BASE_URL}/${locale}`,
      languages: {
        'ar': `${BASE_URL}/ar`,
        'en': `${BASE_URL}/en`,
      },
    },
    openGraph: {
      title: isAr ? 'ميكاب ديمو — منتجات التجميل' : 'Makeup Demo — Beauty Products',
      description: isAr
        ? 'منتجات تجميل راقية من ميكاب ديمو.'
        : 'Premium beauty products from Makeup Demo.',
      url: `${BASE_URL}/${locale}`,
      locale: isAr ? 'ar_JO' : 'en_US',
    },
  };
}

export default async function StoreFrontPage({ params }: { params: Promise<Params> }) {
  const { locale = 'ar' } = await params;
  const isAr = locale === 'ar';

  const getCachedFeaturedProducts = unstable_cache(
    async () => {
      return prisma.product.findMany({
        where: { isVisible: true, isFeatured: true },
        orderBy: { featuredOrder: 'asc' },
        take: 4,
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          stockStatus: true,
          variants: {
            select: {
              price: true,
            }
          },
          images: {
            where: { isMain: true },
            take: 1,
            select: {
              url: true,
              isMain: true,
            }
          },
          category: {
            select: {
              name: true,
            }
          }
        }
      });
    },
    ['home-featured-products'],
    { revalidate: 3600, tags: ['products'] }
  );

  const getCachedCollections = unstable_cache(
    async () => {
      return prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          imagePath: true,
        }
      });
    },
    ['home-collections'],
    { revalidate: 3600, tags: ['categories'] }
  );

  const [
    featuredProducts,
    carouselSettings,
    allSlides,
    locationSettings,
    collections,
  ] = await Promise.all([
    getCachedFeaturedProducts(),
    getHeroCarouselSettings(),
    getHeroSlides(),
    getStoreLocationSettings(),
    getCachedCollections(),
  ]);

  const now = new Date();
  const activeSlides = allSlides.filter(slide => {
    if (!slide.isEnabled) return false;
    if (slide.startsAt && new Date(slide.startsAt) > now) return false;
    if (slide.endsAt && new Date(slide.endsAt) < now) return false;
    return true;
  });


  const defaultSlides: any[] = [
    {
      id: 'default-1',
      titleAr: 'إشراقة الصيف',
      titleEn: 'Summer Glow',
      descriptionAr: 'اكتشفي الألوان الحيوية لبشرة متألقة هذا الصيف',
      descriptionEn: 'Discover vibrant colors for radiant skin this summer',
      eyebrowAr: 'جديد',
      eyebrowEn: 'New Arrival',
      ctaAr: 'تسوق الآن',
      ctaEn: 'Shop Now',
      imageDesktopPath: '',
      imageMobilePath: '',
      altAr: 'مجموعة الصيف',
      altEn: 'Summer Collection',
      destinationType: 'URL',
      internalPath: '/collections/summer',
      displayOrder: 1,
      isEnabled: true,
      openInNewTab: false,
      overlayStrength: 40,
      textPosition: 'CENTER'
    },
    {
      id: 'default-2',
      titleAr: 'شفاه مخملية',
      titleEn: 'Velvet Lips',
      descriptionAr: 'أرواج غنية باللون ومريحة تدوم طوال اليوم',
      descriptionEn: 'Rich, comfortable lipsticks that last all day',
      eyebrowAr: 'الأكثر مبيعاً',
      eyebrowEn: 'Best Seller',
      ctaAr: 'اكتشف المجموعة',
      ctaEn: 'Discover',
      imageDesktopPath: '',
      imageMobilePath: '',
      altAr: 'شفاه مخملية',
      altEn: 'Velvet Lips',
      destinationType: 'URL',
      internalPath: '/collections/lips',
      displayOrder: 2,
      isEnabled: true,
      openInNewTab: false,
      overlayStrength: 50,
      textPosition: 'CENTER'
    }
  ];

  const carouselSlidesToDisplay = activeSlides.length > 0 ? activeSlides : defaultSlides;

  return (
    <main className="flex-1" dir={isAr ? 'rtl' : 'ltr'}>
      {locationSettings.locationSectionEnabled && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'HealthAndBeautyBusiness',
              'name': 'Makeup Demo',
              'url': 'https://www.makeup-demo.com',
              'telephone': locationSettings.phone,
              'address': {
                '@type': 'PostalAddress',
                'streetAddress': isAr ? locationSettings.addressAr : locationSettings.addressEn,
                'addressLocality': 'Amman',
                'addressCountry': 'JO'
              },
              'geo': {
                '@type': 'GeoCoordinates',
                'latitude': locationSettings.latitude,
                'longitude': locationSettings.longitude
              },
              'openingHours': locationSettings.openingHours,
              'hasMap': locationSettings.mapPlaceUrl
            })
          }}
        />
      )}

      {/* Hero Section */}
      <section className="relative w-full overflow-hidden min-h-[60vh] md:min-h-[80vh] flex items-center">
        <div className="absolute inset-0 w-full h-full z-10">
          {carouselSettings.enabled && carouselSlidesToDisplay.length > 0 ? (
            <HeroCarousel slides={carouselSlidesToDisplay} settings={carouselSettings} />
          ) : (
            <div className="relative w-full h-full bg-[var(--color-charcoal-900)] flex flex-col items-center justify-center p-6 text-center z-20">
              <Sparkles className="w-12 h-12 text-[var(--color-rose-400)] mb-6 opacity-80" />
              <h1 className="text-3xl md:text-5xl font-bold leading-tight text-white font-heading mb-4">
                {isAr ? (
                  <>اكتشفي إطلالتك القادمة</>
                ) : (
                  <>Discover Your Next Look</>
                )}
              </h1>
              <p className="text-sm md:text-base text-zinc-300 max-w-xl mx-auto leading-relaxed mb-8">
                {isAr 
                  ? 'ميكاب ديمو.. منتجات مختارة بعناية لتبرز جمالك الطبيعي وتزيد من ثقتك بنفسك.'
                  : 'Makeup Demo.. carefully selected products to enhance your natural beauty and boost your confidence.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/shop" 
                  className="px-8 py-3 bg-[var(--color-rose-600)] hover:bg-[var(--color-rose-500)] text-white font-bold rounded-sm transition-all text-sm shadow-md"
                >
                  {isAr ? 'تسوقي الآن' : 'Shop Now'}
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section id="shop-by-category" className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)] mb-4">
              {isAr ? 'تسوقي حسب الفئة' : 'Shop by Category'}
            </h2>
            <div className="w-16 h-1 bg-[var(--color-rose-600)] mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {collections.length > 0 ? collections.map(collection => (
              <Link href={`/${locale}/shop?category=${collection.id}`} key={collection.id} className="group flex flex-col rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 bg-white border border-[var(--color-ivory-200)] hover:border-[var(--color-rose-600)]">
                <div className="relative aspect-square overflow-hidden bg-[var(--color-ivory-100)]">
                  {collection.imagePath ? (
                    <Image
                      src={collection.imagePath.startsWith('local://') ? collection.imagePath.replace('local://', '/') : collection.imagePath}
                      alt={collection.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-[var(--color-ivory-200)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                       <span className="text-zinc-400 font-bold">{collection.name}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 text-center bg-white">
                  <h3 className="text-lg font-bold font-heading text-zinc-900 group-hover:text-[var(--color-rose-600)] transition-colors">
                    {collection.name}
                  </h3>
                </div>
              </Link>
            )) : (
              <>
                {[isAr ? 'الوجه' : 'Face', isAr ? 'العيون' : 'Eyes', isAr ? 'الشفاه' : 'Lips', isAr ? 'العناية' : 'Skincare'].map((label, i) => (
                  <div key={i} className="flex flex-col rounded-xl overflow-hidden shadow-sm border border-[var(--color-ivory-200)] bg-white text-center">
                    <div className="relative aspect-square bg-[var(--color-ivory-100)] flex items-center justify-center text-zinc-400 font-bold">{label} Image</div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold font-heading text-zinc-900">{label}</h3>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-[var(--color-ivory-100)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[var(--color-charcoal-900)] mb-4">
              {isAr ? 'الأكثر مبيعاً' : 'Best Sellers'}
            </h2>
            <div className="w-24 h-1 bg-[var(--color-rose-600)] mx-auto" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {featuredProducts.length > 0 ? featuredProducts.map((product) => {
            const mainImage = product.images.find(img => img.isMain) || product.images[0];
            const lowestPrice = product.variants.length > 0 
              ? Math.min(...product.variants.map(v => v.price))
              : 0;

            return (
              <Link key={product.id} href={`/${locale}/products/${product.slug}`} className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 p-4 border border-[var(--color-ivory-200)] flex flex-col h-full hover:border-[var(--color-rose-600)]">
                <div className="relative aspect-[4/3] w-full bg-[var(--color-ivory-100)] rounded-md mb-4 overflow-hidden">
                  <div className="absolute top-2 right-2 z-20">
                    <WishlistHeart product={{
                      id: product.id,
                      nameAr: product.nameAr,
                      nameEn: product.nameEn,
                      slug: product.slug,
                      imageUrl: mainImage?.url || '',
                      price: lowestPrice,
                      stockStatus: product.stockStatus
                    }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center text-[var(--color-charcoal-600)]">
                    {mainImage ? (
                      <div className="w-full h-full bg-cover bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: `url("${mainImage.url.startsWith('local://') ? mainImage.url.replace('local://', '/') : mainImage.url}")` }} />
                    ) : (
                      isAr ? 'صورة المنتج' : 'Product Image'
                    )}
                  </div>
                </div>
                <div className="text-center flex-1 flex flex-col">
                  <h3 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-1 group-hover:text-[var(--color-rose-600)] transition-colors">
                    {isAr ? product.nameAr : product.nameEn}
                  </h3>
                  {product.category && <p className="text-xs text-zinc-500 mb-2">{product.category.name}</p>}
                  <div className="mt-auto text-sm text-[var(--color-rose-600)] font-bold">
                    {isAr ? 'اختر اللون لعرض السعر' : 'Select shade for price'}
                  </div>
                </div>
                <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <button className="w-full py-2 bg-black hover:bg-zinc-900 text-[var(--color-gold-500)] rounded-sm text-sm font-bold shadow-md transition-colors border border-[var(--color-gold-500)]/30 hover:border-[var(--color-gold-500)]">
                    {isAr ? 'عرض التفاصيل' : 'View Details'}
                  </button>
                </div>
              </Link>
            );
          }) : (
             <div className="col-span-full text-center text-zinc-500 py-10">
                {isAr ? 'لا توجد منتجات مميزة حالياً.' : 'No featured products found.'}
             </div>
          )}
          </div>
        </div>
      </section>

      {/* Seamless Experience Section */}
      <section className="py-20 bg-[var(--color-charcoal-900)] text-white text-center">
        <div className="container mx-auto px-6 max-w-4xl space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold font-heading text-[var(--color-rose-400)]">
            {isAr ? 'تجربة جمال استثنائية' : 'An Exceptional Beauty Experience'}
          </h2>
          <p className="text-lg md:text-xl text-zinc-300 leading-relaxed max-w-3xl mx-auto">
            {isAr ? 'درجات الألوان المصممة لتناسبك تماماً.' : 'Shades designed to match you perfectly.'}
          </p>
          <p className="text-zinc-400 leading-relaxed max-w-2xl mx-auto">
            {isAr 
              ? 'في ميكاب ديمو، نهتم بأدق التفاصيل. من اختيار درجة الفاونديشن المثالية إلى الروج الأنسب لدرجة بشرتك. يمكنك زيارة متجرنا لاختبار المنتجات مباشرة.'
              : 'At Makeup Demo, we care about the finest details. From choosing the perfect foundation shade to the most suitable lipstick for your skin tone. You can visit our store to test products firsthand.'}
          </p>
        </div>
      </section>

      {/* Brand Story */}
      <section id="brand-story" className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="text-[var(--color-rose-600)] font-bold tracking-widest uppercase text-sm">
              {isAr ? 'عن ميكاب ديمو' : 'About Makeup Demo'}
            </span>
            <h2 className="text-4xl font-bold font-heading text-[var(--color-charcoal-900)]">
              {isAr ? 'رؤيتنا' : 'Our Vision'}
            </h2>
            <p className="text-xl text-zinc-700 font-medium italic">
              {isAr ? 'إبراز الجمال الداخلي لكل امرأة.' : 'Enhancing the inner beauty of every woman.'}
            </p>
            <div className="space-y-4 text-zinc-600 leading-relaxed text-justify md:text-center">
              <p>
                {isAr 
                  ? 'ميكاب ديمو هو نموذج حصري صُمم ليعكس قوة العلامات التجارية الخاصة بالتجميل.'
                  : 'Makeup Demo is an exclusive model designed to reflect the power of beauty brands.'}
              </p>
              <p className="font-bold text-[var(--color-charcoal-900)] text-lg pt-4">
                {isAr 
                  ? 'نمزج بين العلم، والفن، والجودة لنقدم لك الأفضل.'
                  : 'We blend science, art, and quality to bring you the best.'}
              </p>
            </div>
            
            <div className="pt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link href="/shop" className="px-8 py-3 bg-[var(--color-gold-500)] hover:bg-[var(--color-gold-600)] text-black font-bold rounded-sm transition-all shadow-md">
                {isAr ? 'تصفح المجموعة' : 'Shop the Collection'}
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Demo Access Section */}
      <section className="py-16 bg-[var(--color-rose-50)] border-y border-[var(--color-rose-100)] text-center">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-2xl font-bold font-heading text-[var(--color-charcoal-900)] mb-6">
            {isAr ? 'الدخول التجريبي لنسخة العرض' : 'Demo Access'}
          </h2>
          <p className="text-zinc-600 mb-8 max-w-2xl mx-auto">
            {isAr 
              ? 'يمكنك الدخول وتجربة لوحة تحكم الإدارة ونظام نقاط البيع للكاشير بدون الحاجة لتسجيل الدخول.'
              : 'You can test the Admin Dashboard and POS Cashier without logging in.'}
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6">
            <a href="/api/demo-login?role=admin" className="w-full sm:w-auto px-8 py-3 bg-[var(--color-gold-500)] hover:bg-[var(--color-gold-600)] text-black font-bold rounded-sm transition-all shadow-md flex items-center justify-center gap-2">
              <span className="text-xl">👩‍💼</span>
              {isAr ? 'لوحة تحكم الإدارة' : 'Admin Dashboard'}
            </a>
            <a href="/api/demo-login?role=cashier" className="w-full sm:w-auto px-8 py-3 bg-black border-2 border-[var(--color-gold-500)] hover:bg-zinc-900 text-[var(--color-gold-500)] font-bold rounded-sm transition-all shadow-sm flex items-center justify-center gap-2">
              <span className="text-xl">🛒</span>
              {isAr ? 'نظام الكاشير (POS)' : 'POS System'}
            </a>
          </div>
        </div>
      </section>
      
      {/* Quote Section */}
      <section className="py-24 bg-[var(--color-ivory-50)] border-y border-[var(--color-ivory-200)] relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-9xl text-[var(--color-ivory-200)] opacity-50 select-none font-serif">&quot;</div>
        <div className="container mx-auto px-6 text-center relative z-10">
          <p className="text-2xl md:text-3xl font-heading font-medium text-[var(--color-charcoal-900)] leading-relaxed max-w-4xl mx-auto">
            {isAr 
              ? '«الجمال لا يعني أن تكوني خالية من العيوب، بل أن تشرقي بثقة.»'
              : '&quot;Beauty is not about being flawless, it is about shining with confidence.&quot;'}
          </p>
        </div>
      </section>
    </main>
  );
}
