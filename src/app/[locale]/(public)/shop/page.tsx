import { prisma } from '@/lib/db';
import { ShopFilters } from '@/components/ShopFilters';
import { MobileCategoriesFeed } from '@/components/MobileCategoriesFeed';
import { PaginatedProductGrid } from '@/components/PaginatedProductGrid';
import type { Metadata } from 'next';

export const revalidate = 60;

const BASE_URL = 'https://www.makeup-demo.com';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  return {
    title: isAr ? 'المتجر | ميكاب ديمو' : 'Shop | Makeup Demo',
    description: isAr
      ? 'تصفح تشكيلتنا الكاملة من منتجات التجميل والعناية بالبشرة. اكتشفي أحدث الأرواج، الفاونديشن، والعناية بالبشرة.'
      : 'Browse our full collection of beauty and skincare products. Discover the latest lipsticks, foundations, and skincare.',
    alternates: {
      canonical: `${BASE_URL}/${locale}/shop`,
      languages: { ar: `${BASE_URL}/ar/shop`, en: `${BASE_URL}/en/shop` },
    },
    openGraph: {
      title: isAr ? 'متجر ميكاب ديمو' : 'Makeup Demo Shop',
      description: isAr ? 'منتجات تجميل راقية' : 'Premium Beauty Products',
      url: `${BASE_URL}/${locale}/shop`,
      locale: isAr ? 'ar_JO' : 'en_US',
    },
  };
}

export default async function ShopPage({ params, searchParams }: { params: Promise<{ locale: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { locale } = await params;
  const sp = await searchParams;
  
  const q = typeof sp.q === 'string' ? sp.q : '';
  const categoryStr = typeof sp.category === 'string' ? sp.category : '';
  const brandStr = typeof sp.brand === 'string' ? sp.brand : '';
  const finishStr = typeof sp.finish === 'string' ? sp.finish : '';
  const skinTypeStr = typeof sp.skinType === 'string' ? sp.skinType : '';
  
  // Build prisma where clause
  const where: any = { isVisible: true };
  
  if (categoryStr) where.categoryId = categoryStr;
  if (brandStr) where.brandId = brandStr;
  if (finishStr) where.finish = finishStr;
  if (skinTypeStr) where.skinType = skinTypeStr;
  
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
        variants: { orderBy: { price: 'asc' } },
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.product.count({ where })
  ]);

  const categories = await prisma.category.findMany();
  const brands = await prisma.brand.findMany();
  
  const rawFinishes = await prisma.product.findMany({
    where: { finish: { not: null } },
    select: { finish: true },
    distinct: ['finish']
  });
  const finishes = rawFinishes.map(f => f.finish as string).filter(Boolean);

  const rawSkinTypes = await prisma.product.findMany({
    where: { skinType: { not: null } },
    select: { skinType: true },
    distinct: ['skinType']
  });
  const skinTypes = rawSkinTypes.map(s => s.skinType as string).filter(Boolean);

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
    <div className="bg-[var(--color-ivory-100)] min-h-screen pb-20">
      {/* Header Banner */}
      <div className="bg-[var(--color-charcoal-900)] text-white py-16 text-center border-b-4 border-[var(--color-rose-600)]">
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">{isAr ? 'المتجر' : 'Shop'}</h1>
        <p className="text-zinc-300 text-lg">{isAr ? 'اكتشفي تشكيلتنا الحصرية من منتجات التجميل' : 'Discover our exclusive beauty collection'}</p>
      </div>

      <div className="container mx-auto px-6 mt-8 flex flex-col gap-6">
        
        {/* Inline Top Filters */}
        <div className="mb-12">
          <ShopFilters 
            categories={categories} 
            brands={brands}
            finishes={finishes}
            skinTypes={skinTypes}
            initialCategory={categoryStr}
            initialBrand={brandStr}
            initialFinish={finishStr}
            initialSkinType={skinTypeStr}
            locale={locale}
          />
        </div>

        {/* Product Grid */}
        <main className="w-full overflow-hidden">
          {/* Mobile Specific: Categories Feed */}
          <div className="md:hidden">
            <MobileCategoriesFeed categories={groupedCategories} locale={locale} isAr={locale === 'ar'} />
            
            {products.length === 0 && (
              <div className="text-center py-20">
                <p className="text-xl text-zinc-500">{isAr ? 'لا توجد منتجات مطابقة.' : 'No products found.'}</p>
              </div>
            )}
          </div>

          {/* Desktop Specific: Flat Grid with Pagination */}
          <div className="hidden md:block">
            <PaginatedProductGrid 
              initialProducts={products}
              totalCount={totalCount}
              locale={locale}
              filters={{ categoryId: categoryStr, brandId: brandStr, finish: finishStr, skinType: skinTypeStr, q }}
            />
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-20 hidden md:block">
              <p className="text-xl text-zinc-500">{isAr ? 'لا توجد منتجات مطابقة.' : 'No products found.'}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
