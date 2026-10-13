import { prisma } from '@/lib/db';
import { ShopFilters } from '@/components/ShopFilters';
import { MobileCategoriesFeed } from '@/components/MobileCategoriesFeed';
import { PaginatedProductGrid } from '@/components/PaginatedProductGrid';
import { OliveBranchDecoration } from '@/components/RawaqMotifs';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { Prisma } from '@prisma/client';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'المتجر | رَواق' : 'Shop | Rawaq',
    description: isAr
      ? 'تصفحي تشكيلات رَواق في الجمال والأزياء، واكتشفي المنتجات المتاحة.'
      : 'Browse Rawaq beauty and fashion and discover the available collection.',
    openGraph: {
      title: isAr ? 'متجر رَواق' : 'Rawaq Shop',
      description: isAr ? 'تصفحي تشكيلات رَواق' : 'Explore the Rawaq collection',
      locale: isAr ? 'ar_JO' : 'en_US',
    },
  };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { locale } = await params;
  const sp = await searchParams;

  const q = typeof sp.q === 'string' ? sp.q : '';
  const categoryStr = typeof sp.category === 'string' ? sp.category : '';
  const where: Prisma.ProductWhereInput = { isVisible: true };

  if (categoryStr) where.categoryId = categoryStr;

  if (q) {
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } }
    ];
  }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where,
      take: 40,
      skip: 0,
      include: {
        variants: { orderBy: { price: 'asc' }, include: { supplierOffers: { where: { isActive: true, supplier: { isActive: true } }, select: { stock: true } } } },
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where })
  ]);

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });

  // Group filtered products by category for the mobile feed
  const categoriesMap = new Map();
  for (const product of products) {
    if (!categoriesMap.has(product.categoryId)) {
      categoriesMap.set(product.categoryId, {
        id: product.categoryId,
        name: product.category.name,
        slug: product.category.slug,
        products: []
      });
    }
    categoriesMap.get(product.categoryId).products.push(product);
  }
  const groupedCategories = Array.from(categoriesMap.values());
  const isAr = locale === 'ar';

  return (
    <div className="min-h-screen bg-[#F7F3EA] pb-16 sm:pb-24">
      {/* Header Banner */}
      <div className="relative overflow-hidden border-b border-[#B7935F]/60 bg-[#3F4B32] py-16 text-center text-white sm:py-24">
        <OliveBranchDecoration className="absolute -start-20 -bottom-20 w-80 text-white opacity-10 pointer-events-none scale-x-[-1]" />
        <p className="relative z-10 rawaq-eyebrow text-[#B7935F]">RAWAQ · THE COLLECTION</p>
        <h1 className="relative z-10 mt-4 text-4xl !text-white font-heading md:text-5xl">{isAr ? 'تسوّقي رَواق' : 'Shop Rawaq'}</h1>
        <p className="relative mx-auto mt-5 max-w-xl px-5 text-base leading-7 text-white/80">{isAr ? 'اختيارات من الجمال والأزياء بروح أردنية معاصرة.' : 'Beauty and fashion, selected with a contemporary Jordanian spirit.'}</p>
      </div>

      <div className="mx-auto mt-8 sm:mt-10 max-w-7xl px-5 sm:px-8">

        {/* Visual Category Filters */}
        <div className="mb-10 w-full overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex gap-4 sm:gap-6 min-w-max">
            <Link
              href={`/${locale}/shop`}
              className={`group flex flex-col items-center gap-2 sm:gap-3 w-[72px] sm:w-24 ${!categoryStr ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
            >
              <div className={`w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-full border-2 p-1 transition-all duration-300 ${!categoryStr ? 'border-[#B7935F]' : 'border-transparent group-hover:border-[#D9C6A8]'}`}>
                <div className="w-full h-full rounded-full bg-[#E9DDCC] flex items-center justify-center text-[#3F4B32] overflow-hidden shadow-inner">
                   <span aria-hidden="true" className="text-xl">✦</span>
                </div>
              </div>
              <span className={`text-[11px] sm:text-[13px] text-center leading-tight ${!categoryStr ? 'text-[#3F4B32] font-bold' : 'text-[#746A64] font-medium'}`}>
                {isAr ? 'الكل' : 'All'}
              </span>
            </Link>

            {categories.map((cat) => {
              const isSelected = categoryStr === cat.id;
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/shop?category=${encodeURIComponent(cat.id)}`}
                  className={`group flex flex-col items-center gap-2 sm:gap-3 w-[72px] sm:w-24 ${isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-100 transition-opacity'}`}
                >
                  <div className={`w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-full border-2 p-1 transition-all duration-300 ${isSelected ? 'border-[#B7935F]' : 'border-transparent group-hover:border-[#D9C6A8]'}`}>
                    <div className="w-full h-full rounded-full bg-[#e8e5df] flex items-center justify-center overflow-hidden relative shadow-inner">
                       <span aria-hidden="true" className="text-[#A69A8C] text-xl">✦</span>
                    </div>
                  </div>
                  <span className={`text-[11px] sm:text-[13px] text-center leading-tight ${isSelected ? 'text-[#3F4B32] font-bold' : 'text-[#746A64] font-medium'}`}>
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="mb-12">
          <ShopFilters
            categories={categories}
            brands={[]}
            finishes={[]}
            skinTypes={[]}
            initialCategory={categoryStr}
            locale={locale}
          />
        </div>

        {/* Product Grid */}
        <main className="w-full">
          {/* Mobile Specific: Categories Feed */}
          <div className="md:hidden">
            <MobileCategoriesFeed categories={groupedCategories} locale={locale} isAr={isAr} />

            {products.length === 0 && (
              <div className="text-center py-24 rounded-3xl border border-dashed border-[#D9C6A8] bg-[#F7F3EA]/50">
                <span aria-hidden="true" className="block text-4xl text-[#B7935F]/50 mb-4">✦</span>
                <p className="text-lg text-[#746A64]">{isAr ? 'لم يتم العثور على منتجات مطابقة.' : 'No matching products found.'}</p>
              </div>
            )}
          </div>

          {/* Desktop Specific: Flat Grid with Pagination */}
          <div className="hidden md:block">
            <PaginatedProductGrid
              initialProducts={products}
              totalCount={totalCount}
              locale={locale}
              filters={{ categoryId: categoryStr, q }}
            />
          </div>

          {products.length === 0 && (
            <div className="text-center py-32 rounded-3xl border border-dashed border-[#D9C6A8] bg-[#F7F3EA]/50 hidden md:block">
              <span aria-hidden="true" className="block text-5xl text-[#B7935F]/50 mb-6">✦</span>
              <p className="text-xl text-[#746A64]">{isAr ? 'لم يتم العثور على منتجات مطابقة.' : 'No matching products found.'}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
