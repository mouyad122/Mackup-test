import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { OliveBranchDecoration } from '@/components/RawaqMotifs';
import { getHeroSlides, getHeroCarouselSettings } from '@/actions/homepage-cms';
import { HeroCarousel } from '@/components/HeroCarousel';
import { BestSellersSection } from '@/components/BestSellersSection';
import { OffersSection } from '@/components/OffersSection';
import { InstagramGrid } from '@/components/InstagramGrid';
import type { Metadata } from 'next';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'رَواق | أناقة من روح الأصالة',
  description: 'اكتشفي رَواق — عالم من العطور والتجميل والأزياء الأردنية. تسوقي بثقة من مجموعات مختارة بعناية لتناسب جمالكِ وأسلوبكِ.',
};

export default async function StoreFrontPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale !== 'en';

  const [featured, latest, categories, slides, carouselSettings] = await Promise.all([
    prisma.product.findMany({
      where: { isVisible: true, isFeatured: true },
      take: 4,
      orderBy: { featuredOrder: 'asc' },
      include: {
        images: { where: { isMain: true }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
      },
    }),
    prisma.product.findMany({
      where: { isVisible: true },
      take: 4,
      orderBy: { createdAt: 'desc' },
      include: {
        images: { where: { isMain: true }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
      },
    }),
    // فقط التصنيفات التي تحتوي على منتجات فعلية
    prisma.category.findMany({
      where: { products: { some: { isVisible: true } } },
      take: 4,
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { isVisible: true } } } } },
    }),
    getHeroSlides(),
    getHeroCarouselSettings(),
  ]);

  const activeSlides = slides.filter((s) => {
    if (!s.isEnabled) return false;
    const now = new Date();
    if (s.startsAt && new Date(s.startsAt) > now) return false;
    if (s.endsAt && new Date(s.endsAt) < now) return false;
    return true;
  });
  const hasActiveSlides = carouselSettings.enabled && activeSlides.length > 0;

  return (
    <main className="overflow-x-hidden" dir={isAr ? 'rtl' : 'ltr'}>

      {/* ═══════════════════════════════════════════
          03 — HERO BANNER
      ═══════════════════════════════════════════ */}
      <HeroCarousel slides={slides as any} settings={carouselSettings} />

      {/* ═══════════════════════════════════════════
          04 — اكتشفي عالم رَواق (Categories)
      ═══════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="bg-[#fbfaf8] py-14 sm:py-20 relative overflow-hidden">
          <OliveBranchDecoration className="absolute -start-32 top-0 w-96 text-[#3F4832] opacity-[0.04] pointer-events-none" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8 relative z-10">
            <div className="mb-12 text-center">
              <span className="rawaq-eyebrow">{isAr ? 'اكتشفي تشكيلاتنا' : 'DISCOVER OUR WORLD'}</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">
                {isAr ? 'عالم رَواق، تفاصيل تشبهكِ' : 'Find your expression'}
              </h2>
              <p className="mt-3 text-sm text-[#746A64] max-w-md mx-auto leading-7">
                {isAr
                  ? 'من لمسات الجمال اليومية إلى القطع التي تحمل روح الأصالة، اكتشفي ما يليق بذوقكِ.'
                  : 'From everyday beauty to pieces that carry the spirit of heritage — discover what suits your taste.'}
              </p>
              <div className="mx-auto mt-4 h-px w-10 bg-[#3F4832]" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-4 px-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${locale}/shop?category=${encodeURIComponent(cat.id)}`}
                  className="group relative flex flex-col overflow-hidden rounded-[1.5rem] sm:rounded-[1.5rem] sm:rounded-tr-[3rem] sm:rounded-bl-[3rem] bg-[#F7F3EA] shadow-md hover:shadow-xl transition-all duration-500 hover:-translate-y-2 border-[3px] border-white"
                >
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#e8e5df]">
                    {cat.imagePath ? (
                      <Image
                        src={cat.imagePath}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover transition-transform duration-[1800ms] ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#D9C6A8]/20">
                        <span className="text-5xl text-[#3F4832]/20">✦</span>
                      </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2A3321]/85 via-[#2A3321]/15 to-transparent opacity-75 group-hover:opacity-95 transition-opacity duration-500" />
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-center z-10">
                      <span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-[#D9C6A8] uppercase mb-2 opacity-75 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-400">
                        {isAr ? 'اكتشفي التشكيلة' : 'DISCOVER'}
                      </span>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white drop-shadow-md group-hover:scale-105 transition-transform duration-400">
                        {cat.name}
                      </h3>
                      <p className="mt-1 text-xs font-medium text-white/60">
                        {cat._count.products} {isAr ? 'منتج' : 'products'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          05 — الأكثر طلباً
      ═══════════════════════════════════════════ */}
      <BestSellersSection locale={locale} />

      {/* ═══════════════════════════════════════════
          06 — مختارات رَواق (Curated Picks)
      ═══════════════════════════════════════════ */}
      {featured.length > 0 && (
        <ProductSection
          title={isAr ? 'مختارات رَواق' : 'Rawaq selections'}
          eyebrow={isAr ? 'اختيرت لكِ، بكل عناية' : 'CURATED WITH CARE'}
          description={isAr
            ? 'قطع منتقاة بعناية تعكس ذوق رَواق وتناسب تفاصيل يومكِ.'
            : 'Pieces selected to reflect the taste of Rawaq and suit your everyday details.'}
          products={featured}
          locale={locale}
          bg="bg-[#f5ede8]/30"
        />
      )}

      {/* ═══════════════════════════════════════════
          07 — من تراثنا إلى جمالكِ (Heritage)
      ═══════════════════════════════════════════ */}
      <section className="bg-[#3F4832] py-16 sm:py-24 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
        <OliveBranchDecoration className="absolute -end-16 -bottom-16 w-80 text-white opacity-[0.07] pointer-events-none" />
        <OliveBranchDecoration className="absolute -start-16 top-0 w-64 text-white opacity-[0.05] pointer-events-none rotate-180" />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 relative z-10">
          <div className="grid md:grid-cols-[1fr_auto] gap-10 items-center">
            {/* Text */}
            <div className="max-w-xl">
              <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'من تراثنا' : 'OUR HERITAGE'}</span>
              <h2 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.3]">
                {isAr ? 'من تراثنا…' : 'From our heritage…'}
                <br />
                <span className="text-[#D9C6A8]">{isAr ? 'إلى جمالكِ' : 'to your beauty'}</span>
              </h2>
              <p className="mt-6 text-base sm:text-lg leading-8 text-white/70 max-w-lg">
                {isAr
                  ? 'في كل تفصيلة من رَواق، نبحث عن ذلك التوازن الجميل بين ما نحمله من أصالة، وما نختاره لأنفسنا اليوم.'
                  : 'In every Rawaq detail, we seek the beautiful balance between the heritage we carry and the choices we make today.'}
              </p>
              {/* Tatreez divider */}
              <div
                className="my-7 h-5 max-w-[200px] opacity-60"
                style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-divider.svg')", backgroundRepeat: 'no-repeat', backgroundSize: 'contain' }}
                aria-hidden="true"
              />
              <Link href={`/${locale}/about`} className="btn-rawaq-ghost text-sm">
                {isAr ? 'تعرّفي على قصتنا' : 'Discover our story'}
              </Link>
            </div>

            {/* Logo visual */}
            <div className="flex items-center justify-center md:justify-end">
              <div className="relative flex items-center justify-center w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white/5 border border-white/10">
                <div className="absolute inset-3 rounded-full bg-white/5 border border-white/10" />
                <Image
                  src="/brand/logo_rawaq.png"
                  alt={isAr ? 'شعار رَواق' : 'Rawaq logo'}
                  width={160} height={160}
                  className="relative h-28 w-auto object-contain opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          08 — وصل حديثاً (New Arrivals)
      ═══════════════════════════════════════════ */}
      {latest.length > 0 && (
        <ProductSection
          title={isAr ? 'وصل حديثاً إلى رَواق' : 'Just arrived'}
          eyebrow={isAr ? 'الأحدث في رَواق' : 'NEW AT RAWAQ'}
          products={latest}
          locale={locale}
          bg="bg-[#fbfaf8]"
        />
      )}

      {/* ═══════════════════════════════════════════
          09 — العروض والهدايا
      ═══════════════════════════════════════════ */}
      <OffersSection locale={locale} />

      {/* ═══════════════════════════════════════════
          10 — لماذا رَواق؟ (Why Rawaq)
      ═══════════════════════════════════════════ */}
      <section className="bg-white py-14 sm:py-20 relative" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <span className="rawaq-eyebrow">{isAr ? 'لماذا رَواق' : 'WHY RAWAQ'}</span>
            <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">
              {isAr ? 'خدمة وثقة ومساعدة' : 'Service, trust & care'}
            </h2>
            <div className="mx-auto mt-4 h-px w-12 bg-[#B7935F]" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(isAr ? [
              { icon: '✦', title: 'اختيارات متنوعة', text: 'عطور وتجميل وأزياء أردنية — كل ما يشبهكِ في مكان واحد.' },
              { icon: '◇', title: 'روح أردنية أصيلة', text: 'تصاميم مستوحاة من التراث الأردني والتطريز الجميل.' },
              { icon: '❋', title: 'تواصل سهل ومباشر', text: 'نحن هنا عبر واتساب وإنستغرام لمساعدتكِ في أي وقت.' },
              { icon: '◉', title: 'سياسة واضحة', text: 'أسعار واضحة وشروط استبدال وإرجاع مفهومة بدون تعقيد.' },
            ] : [
              { icon: '✦', title: 'A considered edit', text: 'Perfumes, beauty & Jordanian fashion — everything that feels like you.' },
              { icon: '◇', title: 'Jordanian spirit', text: 'Designs inspired by Jordanian embroidery and local heritage.' },
              { icon: '❋', title: 'Direct support', text: 'We\'re here on WhatsApp and Instagram to help whenever you need.' },
              { icon: '◉', title: 'Clear policies', text: 'Honest prices and straightforward exchange & return terms.' },
            ]).map(({ icon, title, text }) => (
              <article
                key={title}
                className="group flex flex-col items-start gap-4 rounded-2xl border border-[#e8e5df] bg-white p-6 sm:p-7 hover:border-[#B7935F]/40 hover:shadow-md transition-all duration-300"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F7F3EA] text-[#3F4832] text-lg font-bold group-hover:bg-[#3F4832] group-hover:text-white transition-colors duration-300"
                >
                  {icon}
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#2B2B2B] mb-1">{title}</h3>
                  <p className="text-sm leading-7 text-[#746A64]">{text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          11 — مجتمع رَواق (Instagram)
      ═══════════════════════════════════════════ */}
      <InstagramGrid locale={locale} />

    </main>
  );
}

/* ══════════════════════════════════════════════════════
   SHARED — Product Section Helper
   ══════════════════════════════════════════════════════ */
function ProductSection({
  title,
  eyebrow,
  description,
  products,
  locale,
  bg = 'bg-white',
}: {
  title: string;
  eyebrow: string;
  description?: string;
  products: any[];
  locale: string;
  bg?: string;
}) {
  const isAr = locale === 'ar';
  return (
    <section className={`${bg} py-16 sm:py-20`} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="rawaq-eyebrow">{eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">{title}</h2>
          {description && <p className="mt-3 text-sm text-[#746A64] max-w-sm mx-auto leading-7">{description}</p>}
          <div className="mx-auto mt-4 h-px w-10 bg-[#3F4832]" />
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map((product) => {
              const image = product.images[0]?.url;
              const price = product.variants[0]?.price;
              const comparePrice = product.variants[0]?.compareAt;
              const name = isAr ? product.nameAr : product.nameEn;
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/products/${product.slug}`}
                  className="group relative flex h-full flex-col outline-none transition-all duration-300 hover:-translate-y-1 rounded-[1.25rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border border-[#E9DDCC] bg-white shadow-sm hover:shadow-lg hover:border-[#B7935F]/60 overflow-hidden"
                >
                  <div className="relative w-full aspect-square bg-[#F7F3EA] shrink-0 overflow-hidden">
                    {image ? (
                      <Image
                        src={image.startsWith('local://') ? image.replace('local://', '/') : image}
                        alt={name}
                        fill
                        sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, 270px"
                        className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-4xl text-[#B7935F]/25">✦</div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col pt-4 pb-5 px-4 text-center bg-white">
                    <h3 className="line-clamp-2 min-h-[3rem] text-sm md:text-[15px] font-medium leading-[1.6] text-[#242424] transition-colors group-hover:text-[#3F4832]">
                      {name}
                    </h3>
                    <div className="mt-auto pt-3 flex items-center justify-center gap-1.5">
                      {price ? (
                        <>
                          {comparePrice && comparePrice > price && (
                            <span className="text-[11px] text-[#A69A8C] line-through">{filsToDisplay(comparePrice, isAr ? 'ar' : 'en')}</span>
                          )}
                          <span className="text-[15px] font-bold text-[#3F4832]">{filsToDisplay(price, isAr ? 'ar' : 'en')}</span>
                        </>
                      ) : (
                        <span className="text-[13px] font-medium text-[#3F4832] underline underline-offset-4 decoration-[#D9C6A8]">
                          {isAr ? 'اكتشفي التفاصيل' : 'Discover more'}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D9C6A8] bg-[#FBF8F2] px-6 py-16 text-center">
            <span aria-hidden="true" className="block text-4xl text-[#B7935F]/40 mb-4">✦</span>
            <p className="text-[#746A64]">{isAr ? 'تُجهّز رَواق مختاراتها الجديدة قريباً.' : 'New selections coming soon.'}</p>
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href={`/${locale}/shop`} className="btn-rawaq-gold text-sm">
            {isAr ? 'عرض جميع المنتجات' : 'View all products'}
          </Link>
        </div>
      </div>
    </section>
  );
}
