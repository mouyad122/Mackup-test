import { prisma } from '@/lib/db';

// أنواع الصفحات المُدرجة في الـ sitemap
const BASE_URL = 'https://www.makeup-makeup.com';

export default async function sitemap() {
  const now = new Date();

  // الصفحات الثابتة — ar
  const staticPagesAr = [
    { url: `${BASE_URL}/ar`, lastModified: now, changeFrequency: 'daily' as const, priority: 1.0 },
    { url: `${BASE_URL}/ar/shop`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE_URL}/ar/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/ar/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/ar/faq`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/ar/ingredients`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/ar/returns`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/ar/shipping`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/ar/privacy`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE_URL}/ar/terms`, lastModified: now, changeFrequency: 'yearly' as const, priority: 0.3 },
    { url: `${BASE_URL}/ar/store-location`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.8 },
  ];

  // الصفحات الثابتة — en
  const staticPagesEn = [
    { url: `${BASE_URL}/en`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.9 },
    { url: `${BASE_URL}/en/shop`, lastModified: now, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/en/about`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/en/contact`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/en/faq`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/en/store-location`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.7 },
  ];

  // صفحات المنتجات — ديناميكية من قاعدة البيانات
  let productPages: Array<{ url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }> = [];
  let categoryPages: Array<{ url: string; lastModified: Date; changeFrequency: 'weekly'; priority: number }> = [];

  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { isVisible: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.category.findMany({
        select: { id: true, slug: true },
      }),
    ]);

    // صفحات المنتجات
    productPages = products.flatMap((product) => [
      {
        url: `${BASE_URL}/ar/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      },
      {
        url: `${BASE_URL}/en/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
    ]);

    // صفحات التصنيفات (shop مع فلتر)
    categoryPages = categories.flatMap((cat) => [
      {
        url: `${BASE_URL}/ar/shop?category=${cat.id}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      },
    ]);
  } catch (error) {
    // إذا فشلت قاعدة البيانات، نُرجع الصفحات الثابتة فقط
    console.error('[Sitemap] Failed to fetch dynamic pages:', error);
  }

  return [
    ...staticPagesAr,
    ...staticPagesEn,
    ...productPages,
    ...categoryPages,
  ];
}
