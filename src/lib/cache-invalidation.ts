import { prisma } from './db';

// Cache version manager
export async function getCacheVersion(key: string): Promise<number> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key: `cache_version:${key}` }
  });
  if (!setting) {
    try {
      await prisma.siteSettings.upsert({
        where: { key: `cache_version:${key}` },
        update: {},
        create: { key: `cache_version:${key}`, value: '1' }
      });
    } catch (e) {
      // Ignore concurrency conflict during creation
    }
    return 1;
  }
  return parseInt(setting.value || '1', 10);
}

export async function incrementCacheVersion(key: string): Promise<number> {
  const current = await getCacheVersion(key);
  const next = current + 1;
  await prisma.siteSettings.update({
    where: { key: `cache_version:${key}` },
    data: { value: String(next) }
  });
  return next;
}

// Invalidate all catalog-related caches
export async function invalidateCatalogCaches() {
  await incrementCacheVersion('catalog');
  await incrementCacheVersion('product_detail');
  await incrementCacheVersion('product_list');
  await incrementCacheVersion('featured_home');
  await incrementCacheVersion('filters');
  await incrementCacheVersion('categories_accords');
}
