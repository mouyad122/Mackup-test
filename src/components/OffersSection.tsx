import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

/**
 * OffersSection — القسم 09: العروض والهدايا
 * يعرض عروضاً نشطة فعلية. إذا لا توجد → قسم الهدايا فقط.
 * لا عروض وهمية أبداً.
 */
export async function OffersSection({ locale }: { locale: string }) {
  const isAr = locale === 'ar';

  // 1. العروض النشطة الفعلية (Point 4: compareAt > price والمنتج والمتغير نشط)
  const rawOfferProducts = await prisma.product.findMany({
    where: {
      isVisible: true,
      variants: {
        some: {
          isActive: true,
          compareAt: { not: null },
        },
      },
    },
    take: 8,
    orderBy: { updatedAt: 'desc' },
    include: {
      images: { where: { isMain: true }, take: 1 },
      variants: {
        where: { isActive: true, compareAt: { not: null } },
        orderBy: { price: 'asc' },
      },
    },
  });

  // تصفية العروض للتأكد من وجود خصم حقيقي (compareAt > price)
  const offerProducts = rawOfferProducts
    .filter((product) => {
      const bestDiscountVariant = product.variants.find(
        (v) => v.compareAt !== null && v.compareAt > v.price
      );
      return Boolean(bestDiscountVariant);
    })
    .slice(0, 4);

  // 2. منتجات الهدايا (tagged as gifts أو من تصنيف الهدايا)
  const giftProducts = await prisma.product.findMany({
    where: {
      isVisible: true,
      OR: [
        { tags: { contains: 'gift', mode: 'insensitive' } },
        { tags: { contains: 'هدية', mode: 'insensitive' } },
        { category: { name: { contains: 'هدايا', mode: 'insensitive' } } },
      ],
    },
    take: 4,
    orderBy: { createdAt: 'desc' },
    include: {
      images: { where: { isMain: true }, take: 1 },
      variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
    },
  });

  const hasOffers = offerProducts.length > 0;
  const hasGifts = giftProducts.length > 0;

  if (!hasOffers && !hasGifts) return null;

  return (
    <section
      className="py-16 sm:py-20"
      dir={isAr ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(135deg, #fdf7f5 0%, #f5ede8 40%, #fdf7f5 100%)' }}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">

        {/* Offers Block */}
        {hasOffers && (
          <div className="mb-16">
            <div className="mb-10 text-center">
              <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'عروض سارية' : 'ACTIVE OFFERS'}</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">
                {isAr ? 'تفاصيل جميلة، بأسعار أجمل' : 'Beautiful details, better prices'}
              </h2>
              <div className="mx-auto mt-4 h-px w-12 bg-[#C9A89E]" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {offerProducts.map((product) => {
                const image = product.images[0]?.url;
                const variant = product.variants.find((v) => v.compareAt && v.compareAt > v.price) || product.variants[0];
                const name = isAr ? product.nameAr : product.nameEn;
                const currentPrice = variant?.price;
                const comparePrice = variant?.compareAt;
                const discountAmount = comparePrice && currentPrice ? comparePrice - currentPrice : 0;
                const discountPct = comparePrice && currentPrice ? Math.round((discountAmount / comparePrice) * 100) : 0;

                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.slug}`}
                    className="group relative flex flex-col overflow-hidden rounded-[1.25rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border border-[#E9DDCC] bg-white shadow-sm hover:shadow-lg hover:border-[#C9A89E]/60 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Discount badge */}
                    {discountPct > 0 && (
                      <span className="absolute top-3 start-3 z-10 flex items-center justify-center rounded-full bg-[#3F4832] px-2.5 py-1 text-[11px] font-bold text-white">
                        -{discountPct}%
                      </span>
                    )}
                    <div className="relative aspect-square overflow-hidden bg-[#fdf7f5]">
                      {image ? (
                        <Image
                          src={image.startsWith('local://') ? image.replace('local://', '/') : image}
                          alt={name}
                          fill
                          sizes="(max-width: 640px) 48vw, 270px"
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl text-[#C9A89E]/30">✦</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col px-4 pb-5 pt-3 text-center">
                      <h3 className="line-clamp-2 min-h-[3rem] text-sm font-medium text-[#242424]">{name}</h3>
                      <div className="mt-auto pt-2 flex flex-col items-center gap-0.5">
                        {comparePrice && (
                          <span className="text-xs text-[#A69A8C] line-through">{filsToDisplay(comparePrice, isAr ? 'ar' : 'en')}</span>
                        )}
                        {currentPrice && (
                          <span className="text-base font-bold text-[#3F4832]">{filsToDisplay(currentPrice, isAr ? 'ar' : 'en')}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <Link href={`/${locale}/offers`} className="btn-rawaq-gold text-sm">
                {isAr ? 'كل العروض' : 'All offers'}
              </Link>
            </div>
          </div>
        )}

        {/* Gifts Block */}
        {hasGifts && (
          <div>
            <div className="mb-10 text-center">
              <span className="rawaq-eyebrow text-[#B7935F]">{isAr ? 'هدايا مختارة' : 'GIFT IDEAS'}</span>
              <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">
                {isAr ? 'للفرح تفاصيل خاصة' : 'Joy is in the details'}
              </h2>
              <div className="mx-auto mt-4 h-px w-12 bg-[#C9A89E]" />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
              {giftProducts.map((product) => {
                const image = product.images[0]?.url;
                const price = product.variants[0]?.price;
                const name = isAr ? product.nameAr : product.nameEn;
                return (
                  <Link
                    key={product.id}
                    href={`/${locale}/products/${product.slug}`}
                    className="group flex flex-col overflow-hidden rounded-[1.25rem] rounded-tr-[2.5rem] rounded-bl-[2.5rem] border border-[#E9DDCC] bg-white shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#fdf7f5]">
                      {image ? (
                        <Image
                          src={image.startsWith('local://') ? image.replace('local://', '/') : image}
                          alt={name} fill
                          sizes="(max-width: 640px) 48vw, 270px"
                          className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-4xl text-[#C9A89E]/30">✦</div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col px-4 pb-5 pt-3 text-center">
                      <h3 className="line-clamp-2 min-h-[3rem] text-sm font-medium text-[#242424]">{name}</h3>
                      <div className="mt-auto pt-2">
                        {price && <span className="text-[15px] font-bold text-[#3F4832]">{filsToDisplay(price, isAr ? 'ar' : 'en')}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
