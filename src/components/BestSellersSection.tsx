import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

/**
 * BestSellersSection — القسم 05: الأكثر طلباً
 * يعتمد مبيعات حقيقية. إذا لا توجد بيانات كافية → fallback.
 */
export async function BestSellersSection({ locale }: { locale: string }) {
  const isAr = locale === 'ar';

  // 1. حساب مبيعات الطلبات الإلكترونية المكتملة/المؤكدة فقط (استبعاد الملغاة والمرتجعة)
  const orderSales = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: {
        status: {
          notIn: ['CANCELLED', 'REFUNDED', 'DRAFT'],
        },
      },
    },
    _sum: { quantity: true },
  });

  // 2. حساب مبيعات نقطة البيع POS المكتملة فقط
  const posSales = await prisma.saleItem.findMany({
    where: {
      sale: {
        status: 'COMPLETED',
      },
    },
    select: {
      quantity: true,
      variant: {
        select: {
          productId: true,
        },
      },
    },
  });

  // دمج الكميات المباعة لكل منتج
  const productQuantityMap: Record<string, number> = {};

  for (const item of orderSales) {
    if (item.productId && (item._sum.quantity ?? 0) > 0) {
      productQuantityMap[item.productId] = (productQuantityMap[item.productId] || 0) + (item._sum.quantity ?? 0);
    }
  }

  for (const item of posSales) {
    const pId = item.variant?.productId;
    if (pId && item.quantity > 0) {
      productQuantityMap[pId] = (productQuantityMap[pId] || 0) + item.quantity;
    }
  }

  // فرز المنتجات حسب إجمالي المبيعات الفعلية
  const sortedProductIds = Object.entries(productQuantityMap)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  let products: any[] = [];
  let isFallback = false;

  if (sortedProductIds.length >= 3) {
    const rawProducts = await prisma.product.findMany({
      where: {
        id: { in: sortedProductIds.slice(0, 10) },
        isVisible: true,
      },
      include: {
        images: { where: { isMain: true }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
      },
    });

    // ترتيب حسب إجمالي المبيعات
    products = rawProducts
      .sort((a, b) => (productQuantityMap[b.id] || 0) - (productQuantityMap[a.id] || 0))
      .slice(0, 4);
  }

  // Fallback ذكي وأنيق إذا كانت المبيعات في البداية
  if (products.length < 4) {
    isFallback = true;
    products = await prisma.product.findMany({
      where: { isVisible: true, isFeatured: true },
      take: 4,
      orderBy: { featuredOrder: 'asc' },
      include: {
        images: { where: { isMain: true }, take: 1 },
        variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
      },
    });
    if (products.length < 4) {
      products = await prisma.product.findMany({
        where: { isVisible: true },
        take: 4,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { where: { isMain: true }, take: 1 },
          variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
        },
      });
    }
  }

  if (products.length === 0) return null;

  const title = isFallback
    ? (isAr ? 'منتجات تستحق الاكتشاف' : 'Products Worth Discovering')
    : (isAr ? 'الأكثر طلباً' : 'Most Popular');

  const eyebrow = isFallback
    ? (isAr ? 'اختيارات رَواق' : 'RAWAQ PICKS')
    : (isAr ? 'يحبها عملاؤنا' : 'LOVED BY CUSTOMERS');

  return (
    <section className="bg-[#F7F3EA] py-16 sm:py-20" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Heading */}
        <div className="mb-10 text-center">
          <span className="rawaq-eyebrow">{eyebrow}</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-bold text-[#3F4832]">{title}</h2>
          <div className="mx-auto mt-4 h-px w-12 bg-[#B7935F]" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {products.map((product) => {
            const image = product.images[0]?.url;
            const price = product.variants[0]?.price;
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
                      className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-4xl text-[#B7935F]/30">✦</div>
                  )}
                </div>
                <div className="flex flex-1 flex-col pt-4 pb-5 px-4 text-center bg-white">
                  <h3 className="line-clamp-2 min-h-[3rem] text-sm md:text-[15px] font-medium leading-[1.6] text-[#242424] transition-colors group-hover:text-[#3F4832]">
                    {name}
                  </h3>
                  <div className="mt-auto pt-3 flex items-center justify-center gap-1.5">
                    {price ? (
                      <>
                        <span className="text-[10px] uppercase tracking-widest text-[#A69A8C] font-semibold">{isAr ? 'ابتداءً من' : 'From'}</span>
                        <span className="text-[15px] font-bold text-[#3F4832]">{filsToDisplay(price, isAr ? 'ar' : 'en')}</span>
                      </>
                    ) : (
                      <span className="text-[13px] font-medium text-[#3F4832] underline underline-offset-4 decoration-[#D9C6A8]">{isAr ? 'اكتشفي التفاصيل' : 'Discover more'}</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link href={`/${locale}/shop`} className="btn-rawaq-gold text-sm">
            {isAr ? 'عرض جميع المنتجات' : 'View all products'}
          </Link>
        </div>
      </div>
    </section>
  );
}
