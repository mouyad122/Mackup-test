import { prisma } from '@/lib/db';
import { DynamicCatalogSidebar, type CategoryTreeNode } from '@/components/DynamicCatalogSidebar';
import { PaginatedProductGrid } from '@/components/PaginatedProductGrid';
import { OliveBranchDecoration } from '@/components/RawaqMotifs';
import { getDynamicCatalogFilters } from '@/lib/dynamic-filters';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import type { Prisma } from '@prisma/client';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale !== 'en';
  return {
    title: isAr ? 'المتجر | رَواق' : 'Shop | Rawaq',
    description: isAr
      ? 'تصفحي تشكيلات رَواق في الجمال والأزياء والعطور، واكتشفي المنتجات المتاحة.'
      : 'Browse Rawaq beauty, fashion, and perfumes, and discover the available collection.',
    openGraph: {
      title: isAr ? 'متجر رَواق' : 'Rawaq Shop',
      description: isAr ? 'تصفحي تشكيلات رَواق' : 'Explore the Rawaq collection',
      locale: isAr ? 'ar_JO' : 'en_US',
    },
  };
}

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale !== 'en';

  const q = typeof sp.q === 'string' ? sp.q.trim() : '';
  const categoryStr = typeof sp.category === 'string' ? sp.category : '';

  const getParamArray = (param: string | string[] | undefined): string[] => {
    if (!param) return [];
    if (Array.isArray(param)) return param.filter(Boolean);
    return [param].filter(Boolean);
  };

  const selectedBrands = getParamArray(sp.brand);
  const selectedSizes = getParamArray(sp.size);
  const selectedColors = getParamArray(sp.color);
  const inStock = sp.inStock === 'true';
  const minPrice = sp.minPrice ? Number(sp.minPrice) : null;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : null;

  // استخراج فلاتر السمات الديناميكية (attr_*)
  const attrFilters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(sp)) {
    if (key.startsWith('attr_')) {
      const attrKey = key.replace('attr_', '');
      attrFilters[attrKey] = getParamArray(value);
    }
  }

  // 1. جلب كافة الأقسام المفعلة وشجرتها الهرمية الكاملة
  const allCategories = await prisma.category.findMany({
    where: { isVisible: true },
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      imagePath: true,
      defaultTemplateId: true,
      children: {
        where: { isVisible: true },
        select: {
          id: true,
          name: true,
          slug: true,
          parentId: true,
          imagePath: true,
          defaultTemplateId: true,
          children: {
            where: { isVisible: true },
            select: {
              id: true,
              name: true,
              slug: true,
              parentId: true,
              imagePath: true,
              defaultTemplateId: true,
            },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  const rootCategories = allCategories.filter(c => !c.parentId);

  // 2. كشف مسار القسم المختار لتطبيق التجميع التراكمي (Rollup)
  let targetCategoryIds: string[] = [];
  let activeRootId: string | null = null;
  let activeSubId: string | null = null;
  let activeLeafId: string | null = null;
  let activeCatName: string | null = null;
  let activeTemplateId: string | null = null;

  if (categoryStr) {
    for (const root of rootCategories) {
      if (root.id === categoryStr) {
        activeRootId = root.id;
        activeCatName = root.name;
        activeTemplateId = root.defaultTemplateId;
        targetCategoryIds = [
          root.id,
          ...root.children.map(c => c.id),
          ...root.children.flatMap(c => c.children.map(gc => gc.id)),
        ];
        break;
      }
      for (const sub of root.children) {
        if (sub.id === categoryStr) {
          activeRootId = root.id;
          activeSubId = sub.id;
          activeCatName = sub.name;
          activeTemplateId = sub.defaultTemplateId || root.defaultTemplateId;
          targetCategoryIds = [
            sub.id,
            ...sub.children.map(c => c.id),
          ];
          break;
        }
        for (const leaf of sub.children) {
          if (leaf.id === categoryStr) {
            activeRootId = root.id;
            activeSubId = sub.id;
            activeLeafId = leaf.id;
            activeCatName = leaf.name;
            activeTemplateId = leaf.defaultTemplateId || sub.defaultTemplateId || root.defaultTemplateId;
            targetCategoryIds = [leaf.id];
            break;
          }
        }
      }
    }

    if (targetCategoryIds.length === 0) {
      targetCategoryIds = [categoryStr];
    }
  }

  const activeRoot = activeRootId ? rootCategories.find(c => c.id === activeRootId) : null;
  const activeSubList = activeRoot?.children || [];
  const activeSub = activeSubId ? activeSubList.find(c => c.id === activeSubId) : null;
  const activeLeafList = activeSub?.children || [];

  // 3. بناء شرط البحث الشامل Prisma Where
  const where: Prisma.ProductWhereInput = { isVisible: true };

  if (targetCategoryIds.length > 0) {
    where.categoryId = { in: targetCategoryIds };
  }

  if (q) {
    where.OR = [
      { nameAr: { contains: q, mode: 'insensitive' } },
      { nameEn: { contains: q, mode: 'insensitive' } },
      { shortDescription: { contains: q, mode: 'insensitive' } },
      { tags: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (selectedBrands.length > 0) {
    where.brandId = { in: selectedBrands };
  }

  // شروط المتغيرات (المقاس، اللون، السعر، التوفر)
  const variantConditions: Prisma.ProductVariantWhereInput = { isActive: true };
  let hasVariantFilter = false;

  if (selectedSizes.length > 0) {
    variantConditions.size = { in: selectedSizes };
    hasVariantFilter = true;
  }
  if (selectedColors.length > 0) {
    variantConditions.colorName = { in: selectedColors };
    hasVariantFilter = true;
  }
  if (inStock) {
    variantConditions.stock = { gt: 0 };
    hasVariantFilter = true;
  }
  if (minPrice !== null || maxPrice !== null) {
    variantConditions.price = {};
    if (minPrice !== null) variantConditions.price.gte = minPrice;
    if (maxPrice !== null) variantConditions.price.lte = maxPrice;
    hasVariantFilter = true;
  }

  if (hasVariantFilter) {
    where.variants = { some: variantConditions };
  }

  // شروط السمات الديناميكية (EAV Attributes)
  const andAttrConditions: Prisma.ProductWhereInput[] = [];
  for (const [attrKey, values] of Object.entries(attrFilters)) {
    if (values.length > 0) {
      andAttrConditions.push({
        attributeValues: {
          some: {
            attributeDefinition: { key: attrKey },
            OR: values.map(val => ({
              valueJson: { contains: val }
            }))
          }
        }
      });
    }
  }
  if (andAttrConditions.length > 0) {
    where.AND = andAttrConditions;
  }

  // 4. تنفيذ الاستعلامات بالتوازي: المنتجات والعدد الإجمالي والفلاتر الديناميكية
  const [products, totalCount, dynamicFiltersData, categoryProductCounts] = await Promise.all([
    prisma.product.findMany({
      where,
      take: 40,
      skip: 0,
      include: {
        variants: {
          where: { isActive: true },
          orderBy: { price: 'asc' },
          include: {
            supplierOffers: {
              where: { isActive: true, supplier: { isActive: true } },
              select: { stock: true },
            },
          },
        },
        images: { orderBy: { order: 'asc' } },
        category: true,
        brand: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
    getDynamicCatalogFilters(targetCategoryIds, activeTemplateId),
    prisma.product.groupBy({
      by: ['categoryId'],
      where: { isVisible: true },
      _count: { id: true },
    }),
  ]);

  // 5. بناء شجرة الأقسام مع الأعداد المباشرة والتراكمية (Rollup Counts)
  const countMap = new Map(categoryProductCounts.map(c => [c.categoryId, c._count.id]));

  const categoriesTree: CategoryTreeNode[] = rootCategories.map(root => {
    const rootDirect = countMap.get(root.id) || 0;
    let rootRollup = rootDirect;

    const subNodes = root.children.map(sub => {
      const subDirect = countMap.get(sub.id) || 0;
      let subRollup = subDirect;

      const leafNodes = sub.children.map(leaf => {
        const leafDirect = countMap.get(leaf.id) || 0;
        subRollup += leafDirect;
        return {
          id: leaf.id,
          name: leaf.name,
          slug: leaf.slug,
          parentId: leaf.parentId,
          directCount: leafDirect,
          rollupCount: leafDirect,
          children: [],
        };
      });

      rootRollup += subRollup;
      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        parentId: sub.parentId,
        directCount: subDirect,
        rollupCount: subRollup,
        children: leafNodes,
      };
    });

    return {
      id: root.id,
      name: root.name,
      slug: root.slug,
      parentId: null,
      imagePath: root.imagePath,
      directCount: rootDirect,
      rollupCount: rootRollup,
      children: subNodes,
    };
  });

  // أيقونات تمييز الأقسام الرئيسية في رَواق
  const categoryIcons: Record<string, string> = {
    'makeup': '💄',
    'fashion-abayas': '👗',
    'perfumes-fragrances': '🌸',
    'skincare': '✨',
    'gifts-sets': '🎁',
    'accessories': '💍',
  };

  return (
    <div className="min-h-screen bg-[#F7F3EA] pb-16 sm:pb-24">
      {/* ── Header Banner ── */}
      <div className="relative overflow-hidden border-b border-[#B7935F]/60 bg-[#3F4832] py-14 text-center text-white sm:py-20">
        <OliveBranchDecoration className="absolute -start-20 -bottom-20 w-80 text-white opacity-10 pointer-events-none scale-x-[-1]" />
        <p className="relative z-10 rawaq-eyebrow text-[#B7935F]">RAWAQ · SMART CATALOG & DISCOVERY</p>
        <h1 className="relative z-10 mt-3 text-4xl !text-white font-heading md:text-5xl">
          {activeCatName ? activeCatName : (isAr ? 'تسوّقي رَواق' : 'Shop Rawaq')}
        </h1>
        <p className="relative mx-auto mt-3 max-w-xl px-5 text-sm leading-7 text-white/80">
          {isAr ? 'عالم من الجمال والأزياء والعطور، مختار بعناية ليلائم ذوقكِ الراقي.' : 'Beauty, fashion, and perfumes, carefully curated for your refined taste.'}
        </p>
      </div>

      <div className="mx-auto mt-6 sm:mt-8 max-w-7xl px-4 sm:px-8">

        {/* ── Level 1: الأقسام الرئيسية (Circular Visual Navigation With Images) ── */}
        <div className="mb-4 w-full overflow-x-auto pb-2 hide-scrollbar">
          <div className="flex gap-4 sm:gap-6 min-w-max">
            <Link
              href={`/${locale}/shop`}
              className={`group flex flex-col items-center gap-2 sm:gap-3 w-[74px] sm:w-24 ${!categoryStr ? 'opacity-100' : 'opacity-65 hover:opacity-100 transition-opacity'}`}
            >
              <div className={`w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-full border-2 p-1 transition-all duration-300 ${!categoryStr ? 'border-[#B7935F] shadow-md scale-105' : 'border-[#E9DDCC] group-hover:border-[#D9C6A8]'}`}>
                <div className="w-full h-full rounded-full bg-[#E9DDCC] flex items-center justify-center text-[#3F4832] overflow-hidden shadow-inner">
                   <span aria-hidden="true" className="text-xl">✦</span>
                </div>
              </div>
              <span className={`text-[11px] sm:text-[13px] text-center leading-tight ${!categoryStr ? 'text-[#3F4832] font-bold' : 'text-[#746A64] font-medium'}`}>
                {isAr ? 'الكل' : 'All'}
              </span>
            </Link>

            {rootCategories.map((cat) => {
              const isRootActive = activeRootId === cat.id;
              const icon = categoryIcons[cat.slug] || '✦';
              return (
                <Link
                  key={cat.id}
                  href={`/${locale}/shop?category=${encodeURIComponent(cat.id)}`}
                  className={`group flex flex-col items-center gap-2 sm:gap-3 w-[74px] sm:w-24 ${isRootActive ? 'opacity-100' : 'opacity-70 hover:opacity-100 transition-opacity'}`}
                >
                  <div className={`w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-full border-2 p-0.5 transition-all duration-300 ${isRootActive ? 'border-[#B7935F] shadow-lg scale-105 ring-2 ring-[#B7935F]/30' : 'border-[#E9DDCC] group-hover:border-[#B7935F]'}`}>
                    <div className={`w-full h-full rounded-full flex items-center justify-center overflow-hidden relative shadow-inner bg-[#EDE3D5]`}>
                      {cat.imagePath ? (
                        <Image
                          src={cat.imagePath}
                          alt={cat.name}
                          fill
                          sizes="84px"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      ) : (
                        <span aria-hidden="true" className="text-2xl">{icon}</span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[11px] sm:text-[13px] text-center leading-tight ${isRootActive ? 'text-[#3F4832] font-bold' : 'text-[#746A64] font-medium'}`}>
                    {cat.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Level 2: الأقسام الفرعية التفاعلية ── */}
        {activeRoot && activeSubList.length > 0 && (
          <div className="mb-3 w-full overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex items-center gap-2 min-w-max p-1 bg-white/80 backdrop-blur-sm rounded-2xl border border-[#E9DDCC] px-3 shadow-xs">
              <span className="text-xs font-bold text-[#B7935F] pe-2 border-e border-[#E9DDCC]">
                {activeRoot.name}:
              </span>
              <Link
                href={`/${locale}/shop?category=${encodeURIComponent(activeRoot.id)}`}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  categoryStr === activeRoot.id
                    ? 'bg-[#3F4832] text-white shadow-sm'
                    : 'text-[#626262] hover:bg-[#EDE3D5] hover:text-[#3F4832]'
                }`}
              >
                {isAr ? `كل ${activeRoot.name}` : `All ${activeRoot.name}`}
              </Link>
              {activeSubList.map((sub) => {
                const isSubActive = activeSubId === sub.id;
                return (
                  <Link
                    key={sub.id}
                    href={`/${locale}/shop?category=${encodeURIComponent(sub.id)}`}
                    className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                      isSubActive
                        ? 'bg-[#3F4832] text-white shadow-sm'
                        : 'text-[#626262] hover:bg-[#EDE3D5] hover:text-[#3F4832]'
                    }`}
                  >
                    {sub.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Level 3: الأصناف التخصصية ── */}
        {activeSub && activeLeafList.length > 0 && (
          <div className="mb-5 w-full overflow-x-auto pb-2 hide-scrollbar">
            <div className="flex items-center gap-2 min-w-max p-1 bg-[#FDFBF7] rounded-2xl border border-[#E9DDCC]/70 px-3">
              <span className="text-[11px] font-bold text-[#746A64] pe-2 border-e border-[#E9DDCC]">
                {activeSub.name}:
              </span>
              <Link
                href={`/${locale}/shop?category=${encodeURIComponent(activeSub.id)}`}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  categoryStr === activeSub.id
                    ? 'bg-[#B7935F] text-white shadow-sm'
                    : 'text-[#626262] hover:bg-[#EDE3D5] hover:text-[#3F4832]'
                }`}
              >
                {isAr ? `كل ${activeSub.name}` : `All ${activeSub.name}`}
              </Link>
              {activeLeafList.map((leaf) => {
                const isLeafActive = categoryStr === leaf.id;
                return (
                  <Link
                    key={leaf.id}
                    href={`/${locale}/shop?category=${encodeURIComponent(leaf.id)}`}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      isLeafActive
                        ? 'bg-[#B7935F] text-white shadow-sm'
                        : 'text-[#746A64] hover:bg-white hover:text-[#3F4832]'
                    }`}
                  >
                    {leaf.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── مسار التصفح الحي (Breadcrumbs Trail) ── */}
        <div className="mb-6 flex items-center gap-2 text-xs text-[#746A64]">
          <Link href={`/${locale}`} className="hover:text-[#B7935F] transition-colors">{isAr ? 'الرئيسية' : 'Home'}</Link>
          <span>/</span>
          <Link href={`/${locale}/shop`} className="hover:text-[#B7935F] transition-colors">{isAr ? 'المتجر' : 'Shop'}</Link>
          {activeRoot && (
            <>
              <span>/</span>
              <Link href={`/${locale}/shop?category=${activeRoot.id}`} className="hover:text-[#B7935F] transition-colors">{activeRoot.name}</Link>
            </>
          )}
          {activeSub && (
            <>
              <span>/</span>
              <Link href={`/${locale}/shop?category=${activeSub.id}`} className="hover:text-[#B7935F] transition-colors">{activeSub.name}</Link>
            </>
          )}
          {activeLeafId && activeCatName && (
            <>
              <span>/</span>
              <span className="font-bold text-[#3F4832]">{activeCatName}</span>
            </>
          )}
        </div>

        {/* ── Main Catalog Grid: Sidebar + Products ── */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* Dynamic Interactive Filter Sidebar */}
          <DynamicCatalogSidebar
            categoriesTree={categoriesTree}
            facets={dynamicFiltersData.facets}
            priceRange={dynamicFiltersData.priceRange}
            activeCategoryId={categoryStr}
            totalProducts={totalCount}
            locale={locale}
          />

          {/* Products Grid Area */}
          <main className="flex-1 w-full min-w-0">
            <PaginatedProductGrid
              initialProducts={products}
              totalCount={totalCount}
              locale={locale}
              filters={{ categoryId: categoryStr, q }}
            />

            {products.length === 0 && (
              <div className="text-center py-28 rounded-3xl border border-dashed border-[#D9C6A8] bg-white p-8 shadow-xs">
                <span aria-hidden="true" className="block text-5xl text-[#B7935F]/40 mb-4">✦</span>
                <h3 className="text-lg font-bold text-[#2B2B2B] mb-2">
                  {isAr ? 'لم نعثر على منتجات مطابقة' : 'No matching products found'}
                </h3>
                <p className="text-sm text-[#746A64] max-w-sm mx-auto mb-6">
                  {isAr ? 'جربي تعديل خيارات الفلترة أو مسح بعض المحددات لتوسيع نطاق البحث.' : 'Try adjusting your filters or clearing some options to widen your search.'}
                </p>
                <Link
                  href={`/${locale}/shop`}
                  className="inline-flex items-center gap-2 bg-[#3F4832] text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-sm hover:bg-[#2A3321] transition-colors"
                >
                  {isAr ? 'إعادة ضبط كافة الفلاتر' : 'Reset all filters'}
                </Link>
              </div>
            )}
          </main>
        </div>

      </div>
    </div>
  );
}
