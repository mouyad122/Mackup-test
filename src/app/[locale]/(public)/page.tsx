import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { RawaqProductFrame } from '@/components/RawaqProductFrame';
import { OliveBranchDecoration } from '@/components/RawaqMotifs';
import { getHeroSlides, getHeroCarouselSettings } from '@/actions/homepage-cms';
import { HeroCarousel } from '@/components/HeroCarousel';
import type { Metadata } from 'next';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'رَواق | أناقة أردنية معاصرة',
  description: 'اكتشفي رَواق، حيث تلتقي أناقة اليوم بلمسات مستوحاة من روح الأردن — كوزمتكس، عبايات، وأثواب أردنية.',
};

export default async function StoreFrontPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale !== 'en';

  const [featured, latest, categories, slides, carouselSettings] = await Promise.all([
    prisma.product.findMany({
      where: { isVisible: true, isFeatured: true }, take: 4, orderBy: { featuredOrder: 'asc' },
      include: { images: { where: { isMain: true }, take: 1 }, variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 } },
    }),
    prisma.product.findMany({
      where: { isVisible: true }, take: 4, orderBy: { createdAt: 'desc' },
      include: { images: { where: { isMain: true }, take: 1 }, variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 } },
    }),
    prisma.category.findMany({
      where: { products: { some: { isVisible: true } } }, take: 4, orderBy: { name: 'asc' },
      include: { _count: { select: { products: { where: { isVisible: true } } } } },
    }),
    getHeroSlides(),
    getHeroCarouselSettings(),
  ]);

  const hasActiveSlides = carouselSettings.enabled && slides.some(s => {
    if (!s.isEnabled) return false;
    const now = new Date();
    if (s.startsAt && new Date(s.startsAt) > now) return false;
    if (s.endsAt && new Date(s.endsAt) < now) return false;
    return true;
  });

  return (
    <main className="overflow-x-hidden">

      {/* ═══════════════════════════════════════════════
          A — HERO
          ═══════════════════════════════════════════════ */}
      <HeroCarousel slides={slides as any} settings={carouselSettings} />

      {/* ═══════════════════════════════════════════════
          B — CATEGORY DISCOVERY
          ═══════════════════════════════════════════════ */}
      {categories.length > 0 && (
        <section className="bg-[#fbfaf8] py-14 sm:py-20 relative overflow-hidden">
          <OliveBranchDecoration className="absolute -start-32 top-0 w-96 text-[#3F4B32] opacity-5 pointer-events-none" />
          <div className="mx-auto max-w-7xl px-5 sm:px-8 relative z-10">
            {/* Section heading */}
            <div className="mb-12 text-center">
              <span className="rawaq-eyebrow">{isAr ? 'اكتشفي تشكيلاتنا' : 'DISCOVER OUR EDITS'}</span>
              <h2 className="mt-3 text-3xl sm:text-4xl">{isAr ? 'اختاري ما يشبهكِ' : 'Find your expression'}</h2>
              <div className="mx-auto mt-4 h-px w-10 bg-[#3F4B32]" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-4 px-2">
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/${locale}/shop?category=${encodeURIComponent(cat.id)}`}
                  className="group relative flex flex-col overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] sm:rounded-tr-[3.5rem] sm:rounded-bl-[3.5rem] bg-[#F7F3EA] shadow-md hover:shadow-xl transition-all duration-[600ms] hover:-translate-y-2 border-4 sm:border-[6px] border-white"
                >
                  <div className="relative w-full aspect-[4/5] overflow-hidden bg-[#e8e5df]">
                    {/* Category image */}
                    {cat.imagePath ? (
                      <Image
                        src={cat.imagePath}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 25vw"
                        className="object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-[#D9C6A8]/30">
                        <span className="text-4xl text-white/50" aria-hidden="true">✦</span>
                      </div>
                    )}

                    {/* Gradient Overlay for Text Visibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2A3321]/90 via-[#2A3321]/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-6 text-center z-10">
                      <span className="block text-[9px] sm:text-[10px] font-bold tracking-[0.25em] text-[#D9C6A8] uppercase mb-2 sm:mb-3 transform translate-y-2 opacity-80 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                        {isAr ? 'اكتشفي التشكيلة' : 'DISCOVER THE EDIT'}
                      </span>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-1 font-heading drop-shadow-md transform transition-transform duration-500 group-hover:scale-105">{cat.name}</h3>
                      <p className="mt-1 text-xs sm:text-sm font-medium text-white/70">
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

      {/* ═══════════════════════════════════════════════
          C — FEATURED PRODUCTS (مختارات رَواق)
          ═══════════════════════════════════════════════ */}
      <ProductSection
        title={isAr ? 'مختارات رَواق' : 'Rawaq favourites'}
        eyebrow={isAr ? 'مختارة لكِ' : 'CURATED FOR YOU'}
        products={featured}
        locale={locale}
        bg="bg-[#f5f3f0]"
      />

      {/* ═══════════════════════════════════════════════
          D — HERITAGE EDITORIAL
          ═══════════════════════════════════════════════ */}
      <section className="bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="overflow-hidden border border-[#e8e5df] bg-[#3F4B32] text-white">
            <div className="relative grid md:grid-cols-[1fr_.7fr]">
              {/* Text content */}
              <div className="relative self-center px-8 py-14 sm:px-12 sm:py-16">
                <p className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'من تراثنا' : 'OUR HERITAGE'}</p>
                <h2 className="mt-5 text-3xl leading-[1.45] !text-white sm:text-4xl">
                  {isAr ? 'من تراثنا… إلى إطلالتكِ' : 'From our heritage… to your look'}
                </h2>
                <p className="mt-5 max-w-lg leading-8 text-white/70">
                  {isAr
                    ? 'تفاصيل صغيرة تحمل دفء الأردن — من ألوان الرمان والطرز الأردني إلى ملمس النسيج الأنيق — تترك لكِ المساحة لتختاري أسلوبك الخاص.'
                    : 'Small details that carry the warmth of Jordan — pomegranate colors, Jordanian embroidery, the texture of elegant fabric — leaving room for you to make it your own.'}
                </p>
                {/* Tatreez divider */}
                <div
                  className="my-6 h-5 max-w-xs opacity-75"
                  style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-divider.svg')", backgroundRepeat: 'no-repeat', backgroundSize: 'contain' }}
                  aria-hidden="true"
                />
                <Link href={`/${locale}/about`} className="btn-rawaq-ghost text-sm">
                  {isAr ? 'اكتشفي حكايتنا' : 'Discover our story'}
                </Link>
              </div>

              {/* Logo/media placeholder */}
              <div className="relative flex min-h-56 items-center justify-center border-t border-white/10 bg-[#f5f3f0] p-8 md:border-t-0 md:border-s md:border-s-white/10">
                <Image
                  src="/brand/logo_rawaq.png"
                  alt={isAr ? 'شعار رَواق' : 'Rawaq'}
                  width={400}
                  height={400}
                  className="relative h-auto w-full max-w-[260px] object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          E — WHY RAWAQ
          ═══════════════════════════════════════════════ */}
      <section className="bg-[#fbfaf8] py-14 sm:py-20 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 relative z-10">
          <div className="mb-10 text-center">
            <span className="rawaq-eyebrow">{isAr ? 'لماذا رَواق' : 'WHY RAWAQ'}</span>
            <h2 className="mt-3 text-3xl sm:text-4xl">{isAr ? 'تفاصيل تصنع الفرق' : 'Details that define the difference'}</h2>
            <div className="mx-auto mt-4 h-px w-12 bg-[#B7935F]" />
          </div>

          <div className="grid border-s border-t border-[#e8e5df] sm:grid-cols-2 lg:grid-cols-4">
            {(isAr
              ? [
                  { icon: '✦', title: 'اختيارات متنوعة', text: 'كوزمتكس، عبايات، وأثواب أردنية — كل ما يشبهكِ في مكان واحد.' },
                  { icon: '◇', title: 'روح أردنية', text: 'تصاميم مستوحاة من الطرز الأردني والتراث الجميل.' },
                  { icon: '❋', title: 'تجربة مريحة', text: 'تسوّق سهل وتوصيل موثوق إلى جميع مناطق المملكة.' },
                  { icon: '◉', title: 'جمال حقيقي', text: 'منتجات مختارة بعناية لتلائم الذوق العصري.' },
                ]
              : [
                  { icon: '✦', title: 'A considered edit', text: 'Cosmetics, abayas, Jordanian thobes — everything that feels like you, in one place.' },
                  { icon: '◇', title: 'Jordanian spirit', text: 'Designs inspired by Jordanian embroidery and beautiful heritage.' },
                  { icon: '❋', title: 'A clear experience', text: 'Easy shopping and reliable delivery across Jordan.' },
                  { icon: '◉', title: 'Real beauty', text: 'Products selected with care for the contemporary taste.' },
                ]
            ).map(({ icon, title, text }) => (
              <article key={title} className="group border-b border-e border-[#e8e5df] bg-white p-6 sm:p-7">
                <span
                  aria-hidden="true"
                  className="text-2xl text-[#76584c]"
                >
                  {icon}
                </span>
                <h3 className="mt-5 text-base font-bold text-[#2B2B2B]">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-[#746A64]">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════
          F — NEW ARRIVALS
          ═══════════════════════════════════════════════ */}
      <ProductSection
        title={isAr ? 'وصل حديثاً' : 'Just arrived'}
        eyebrow={isAr ? 'الأحدث في رَواق' : 'NEW AT RAWAQ'}
        products={latest}
        locale={locale}
        bg="bg-[#fbfaf8]"
      />

      {/* ═══════════════════════════════════════════════
          G — CLOSING CTA
          ═══════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-[#3F4B32] py-16 text-white sm:py-20">
        <OliveBranchDecoration className="absolute -end-20 -bottom-20 w-80 text-white opacity-10 pointer-events-none" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center px-5 text-center z-10">
          <p className="rawaq-eyebrow text-[#B7935F]">RAWAQ</p>
          <h2 className="mt-4 text-3xl !text-white sm:text-4xl">
            {isAr ? 'كل تفصيل يحكي حكاية' : 'Every detail tells a story'}
          </h2>
          <p className="mb-8 max-w-lg text-base leading-7 text-white/70">
            {isAr
              ? 'اكتشفي عالم رَواق — حيث الأناقة الأردنية تلتقي بالجمال المعاصر.'
              : 'Discover the world of Rawaq — where Jordanian elegance meets contemporary beauty.'}
          </p>
          <Link href={`/${locale}/shop`} className="btn-rawaq-primary bg-white text-[#3F4B32] hover:bg-[#f1efeb]">
            {isAr ? 'تسوّقي رَواق' : 'Shop Rawaq'}
          </Link>
        </div>
      </section>
    </main>
  );
}

/* ══════════════════════════════════════════════════════
   SECTION HELPERS
   ══════════════════════════════════════════════════════ */

function ProductSection({
  title,
  eyebrow,
  products,
  locale,
  bg = 'bg-white',
}: {
  title: string;
  eyebrow: string;
  products: any[];
  locale: string;
  bg?: string;
}) {
  const isAr = locale === 'ar';
  return (
    <section className={`${bg} py-16 sm:py-20`}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="rawaq-eyebrow">{eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl">{title}</h2>
          <div className="mx-auto mt-4 h-px w-10 bg-[#3F4B32]" />
        </div>

        {products.length ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {products.map(product => {
              const image = product.images[0]?.url;
              const price = product.variants[0]?.price;
              const name = isAr ? product.nameAr : product.nameEn;
              return (
                <Link
                  key={product.id}
                  href={`/${locale}/products/${product.slug}`}
                  className="group relative flex h-full flex-col outline-none transition-all duration-300 hover:-translate-y-1 rounded-[1.5rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border border-[#E9DDCC] bg-white shadow-sm hover:shadow-md hover:border-[#B7935F]/60 overflow-hidden"
                >
                  <div className="relative w-full aspect-square bg-[#F7F3EA] shrink-0 border-b border-[#E9DDCC]/40 p-4 flex items-center justify-center">
                      {image ? (
                        <Image
                          src={image.startsWith('local://') ? image.replace('local://', '/') : image}
                          alt={name}
                          fill
                          sizes="(max-width: 640px) 48vw, (max-width: 1024px) 30vw, 270px"
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl text-[#76584c]/40" aria-hidden="true">
                          ✦
                        </div>
                      )}
                  </div>
                  <div className="flex flex-1 flex-col pt-4 pb-5 px-4 text-center bg-white">
                    <h3 className="line-clamp-2 min-h-[3rem] text-sm md:text-[15px] font-medium leading-[1.6] text-[#242424] transition-colors group-hover:text-[#B7935F]">
                      {name}
                    </h3>
                    <div className="mt-auto pt-4 flex items-center justify-center gap-1.5">
                      {price ? (
                        <>
                          <span className="text-[10px] uppercase tracking-widest text-[#A69A8C] font-semibold">{isAr ? 'ابتداءً من' : 'From'}</span>
                          <span className="text-[15px] font-bold text-[#3F4B32]">{filsToDisplay(price, isAr ? 'ar' : 'en')}</span>
                        </>
                      ) : (
                        <span className="text-[13px] font-medium text-[#3F4B32] underline underline-offset-4 decoration-[#D9C6A8]">{isAr ? 'اكتشفي التفاصيل' : 'Discover more'}</span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#D9C6A8] bg-[#FBF8F2] px-6 py-16 text-center">
            <span aria-hidden="true" className="block text-4xl text-[#B7935F]/50 mb-4">✦</span>
            <p className="text-[#746A64]">{isAr ? 'تُجهّز رَواق مختاراتها الجديدة قريباً.' : 'New selections are coming soon.'}</p>
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
