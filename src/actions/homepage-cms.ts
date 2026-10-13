'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { STORE_PHONE_DISPLAY } from '@/lib/contact';
import { randomUUID } from 'crypto';

// Helper to validate origin/host for security
async function validateOriginAndHost() {
  const headersList = await headers();
  const host = headersList.get('host');
  const origin = headersList.get('origin');
  
  if (origin && host) {
    const originUrl = new URL(origin);
    // Ignore port mismatch in development/test environments
    if (process.env.NODE_ENV !== 'test' && originUrl.hostname !== host.split(':')[0]) {
      throw new Error('فشل التحقق من أصل الطلب (Origin Mismatch)');
    }
  }
}

// Helper to validate URLs safely (no javascript:, data:, etc.)
function validateSafeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim().toLowerCase();
  if (
    clean.startsWith('javascript:') ||
    clean.startsWith('data:') ||
    clean.startsWith('file:') ||
    clean.startsWith('vbscript:')
  ) {
    throw new Error('الرابط غير آمن أو غير مدعوم');
  }
  return url.trim();
}

// Zod schemas for input validation
const carouselSettingsSchema = z.object({
  enabled: z.boolean(),
  autoplayEnabled: z.boolean(),
  autoplayIntervalMs: z.number().min(3000).max(15000),
  pauseOnHover: z.boolean(),
  showIndicators: z.boolean(),
  showNavigation: z.boolean(),
  transitionType: z.enum(['FADE', 'SLIDE'])
});

const slideInputSchema = z.object({
  titleAr: z.string().min(1),
  titleEn: z.string().min(1),
  descriptionAr: z.string(),
  descriptionEn: z.string(),
  eyebrowAr: z.string().nullable().optional(),
  eyebrowEn: z.string().nullable().optional(),
  ctaAr: z.string().nullable().optional(),
  ctaEn: z.string().nullable().optional(),
  imageDesktopPath: z.string().min(1),
  imageMobilePath: z.string().min(1),
  altAr: z.string(),
  altEn: z.string(),
  destinationType: z.enum(['COLLECTION', 'CATEGORY', 'PRODUCT', 'INTERNAL_ROUTE', 'EXTERNAL_URL', 'NONE']),
  productId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  internalPath: z.string().nullable().optional(),
  externalUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  openInNewTab: z.boolean().default(false),
  overlayStrength: z.number().min(0.0).max(1.0).default(0.4),
  textPosition: z.enum(['LEFT', 'RIGHT', 'CENTER']).default('CENTER')
});

const locationSettingsSchema = z.object({
  storeName: z.string().min(1),
  addressAr: z.string().min(1),
  addressEn: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  mapPlaceUrl: z.string().optional().nullable(),
  mapEmbedUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  openingHours: z.string().min(1),
  locationSectionEnabled: z.boolean(),
  directionsButtonEnabled: z.boolean(),
  mapZoom: z.number().min(1).max(21),
  mapLabelAr: z.string().nullable().optional(),
  mapLabelEn: z.string().nullable().optional(),
  sectionOrder: z.number().int().default(10)
});

const defaultHeroCarouselSettings = {
  id: 'default',
  enabled: true,
  autoplayEnabled: true,
  autoplayIntervalMs: 5000,
  pauseOnHover: true,
  showIndicators: true,
  showNavigation: true,
  transitionType: 'FADE'
};

const CMS_KEYS = {
  carousel: 'homepage_hero_carousel_settings',
  slides: 'homepage_hero_slides',
  location: 'store_location_settings',
} as const;

async function readJsonSetting<T>(key: string, fallback: T): Promise<T> {
  const setting = await prisma.siteSettings.findUnique({ where: { key } });
  if (!setting) return fallback;
  try {
    return JSON.parse(setting.value) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonSetting(key: string, value: unknown) {
  const serialized = JSON.stringify(value);
  await prisma.siteSettings.upsert({
    where: { key },
    create: { key, value: serialized },
    update: { value: serialized },
  });
}

type HomepageHeroSlideRecord = z.infer<typeof slideInputSchema> & {
  id: string;
  isEnabled: boolean;
  startsAt: string | null;
  endsAt: string | null;
  [key: string]: unknown;
};

// ----------------------------------------------------------------------
// CAROUSEL SETTINGS
// ----------------------------------------------------------------------

export async function getHeroCarouselSettings() {
  return readJsonSetting(CMS_KEYS.carousel, defaultHeroCarouselSettings);
}

export async function updateHeroCarouselSettings(data: z.infer<typeof carouselSettingsSchema>) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();
  
  const parsed = carouselSettingsSchema.parse(data);

  const updated = { ...parsed, id: 'default' };
  await writeJsonSetting(CMS_KEYS.carousel, updated);

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'UPDATE_HERO_CAROUSEL_SETTINGS',
      entityType: 'HomepageHeroCarouselSettings',
      entityId: 'default',
      details: JSON.stringify(parsed)
    }
  });

  revalidatePath('/', 'layout');
  return { success: true, settings: updated };
}

// ----------------------------------------------------------------------
// HERO SLIDES
// ----------------------------------------------------------------------

export async function getHeroSlides() {
  const slides = await readJsonSetting<HomepageHeroSlideRecord[]>(CMS_KEYS.slides, []);
  const productIds = slides.map(slide => slide.productId).filter((id): id is string => Boolean(id));
  const categoryIds = slides.map(slide => slide.categoryId).filter((id): id is string => Boolean(id));
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, slug: true } }),
    prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, slug: true, name: true } }),
  ]);
  const productMap = new Map(products.map(product => [product.id, product]));
  const categoryMap = new Map(categories.map(category => [category.id, category]));
  return slides
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(slide => ({
      ...slide,
      product: slide.productId ? productMap.get(slide.productId) ?? null : null,
      category: slide.categoryId ? categoryMap.get(slide.categoryId) ?? null : null,
    }));
}

export async function createHeroSlide(data: z.infer<typeof slideInputSchema>) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();

  const parsed = slideInputSchema.parse(data);

  // Validate URL properties
  validateSafeUrl(parsed.imageDesktopPath);
  validateSafeUrl(parsed.imageMobilePath);
  validateSafeUrl(parsed.internalPath);
  validateSafeUrl(parsed.externalUrl);

  const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : null;
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;

  const slides = await readJsonSetting<HomepageHeroSlideRecord[]>(CMS_KEYS.slides, []);
  const slide: HomepageHeroSlideRecord = {
    ...parsed,
    id: randomUUID(),
    startsAt: startsAt?.toISOString() ?? null,
    endsAt: endsAt?.toISOString() ?? null,
  };
  slides.push(slide);
  await writeJsonSetting(CMS_KEYS.slides, slides);

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'CREATE_HERO_SLIDE',
      entityType: 'HomepageHeroSlide',
      entityId: slide.id,
      details: JSON.stringify(slide)
    }
  });

  revalidatePath('/', 'layout');
  return { success: true, slide };
}

export async function updateHeroSlide(id: string, data: z.infer<typeof slideInputSchema>) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();

  const parsed = slideInputSchema.parse(data);

  validateSafeUrl(parsed.imageDesktopPath);
  validateSafeUrl(parsed.imageMobilePath);
  validateSafeUrl(parsed.internalPath);
  validateSafeUrl(parsed.externalUrl);

  const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : null;
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : null;

  const slides = await readJsonSetting<HomepageHeroSlideRecord[]>(CMS_KEYS.slides, []);
  const index = slides.findIndex(slide => slide.id === id);
  if (index === -1) throw new Error('شريحة الهيرو غير موجودة.');
  const slide: HomepageHeroSlideRecord = {
    ...parsed,
    id,
    startsAt: startsAt?.toISOString() ?? null,
    endsAt: endsAt?.toISOString() ?? null,
  };
  slides[index] = slide;
  await writeJsonSetting(CMS_KEYS.slides, slides);

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'UPDATE_HERO_SLIDE',
      entityType: 'HomepageHeroSlide',
      entityId: id,
      details: JSON.stringify(slide)
    }
  });

  revalidatePath('/', 'layout');
  return { success: true, slide };
}

export async function deleteHeroSlide(id: string) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();

  const slides = await readJsonSetting<HomepageHeroSlideRecord[]>(CMS_KEYS.slides, []);
  await writeJsonSetting(CMS_KEYS.slides, slides.filter(slide => slide.id !== id));

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'DELETE_HERO_SLIDE',
      entityType: 'HomepageHeroSlide',
      entityId: id
    }
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function reorderHeroSlides(ids: string[]) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();

  const slides = await readJsonSetting<HomepageHeroSlideRecord[]>(CMS_KEYS.slides, []);
  const order = new Map(ids.map((id, index) => [id, index]));
  const reordered = slides.map(slide => ({
    ...slide,
    displayOrder: order.get(slide.id) ?? slide.displayOrder,
  }));
  await writeJsonSetting(CMS_KEYS.slides, reordered);

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'REORDER_HERO_SLIDES',
      entityType: 'HomepageHeroSlide',
      entityId: 'bulk',
      details: JSON.stringify(ids)
    }
  });

  revalidatePath('/', 'layout');
  return { success: true };
}

// ----------------------------------------------------------------------
// STORE LOCATION SETTINGS
// ----------------------------------------------------------------------

export async function getStoreLocationSettings() {
  return readJsonSetting(CMS_KEYS.location, {
      id: 'default',
      storeName: 'Velora Beauty',
      addressAr: 'عمان، الأردن',
      addressEn: 'Amman, Jordan',
      latitude: 31.9522,
      longitude: 35.9334,
      mapPlaceUrl: '',
      mapEmbedUrl: '',
      phone: STORE_PHONE_DISPLAY,
      whatsapp: STORE_PHONE_DISPLAY,
      openingHours: '10:00 AM - 11:00 PM',
      locationSectionEnabled: true,
      directionsButtonEnabled: true,
      mapZoom: 15,
      mapLabelAr: 'موقعنا',
      mapLabelEn: 'Our Location',
      sectionOrder: 10
  });
}

export async function updateStoreLocationSettings(data: z.infer<typeof locationSettingsSchema>) {
  const session = await requirePermission('manage:settings');
  await validateOriginAndHost();

  const parsed = locationSettingsSchema.parse(data);

  if (parsed.mapPlaceUrl) validateSafeUrl(parsed.mapPlaceUrl);
  if (parsed.mapEmbedUrl) validateSafeUrl(parsed.mapEmbedUrl);

  const updated = {
    ...parsed,
    id: 'default',
    mapPlaceUrl: parsed.mapPlaceUrl || '',
    mapEmbedUrl: parsed.mapEmbedUrl || '',
    phone: parsed.phone || '',
    whatsapp: parsed.whatsapp || '',
  };
  await writeJsonSetting(CMS_KEYS.location, updated);

  await prisma.auditLog.create({
    data: {
      employeeId: session.employeeId,
      action: 'UPDATE_STORE_LOCATION_SETTINGS',
      entityType: 'StoreLocationSettings',
      entityId: 'default',
      details: JSON.stringify(parsed)
    }
  });

  revalidatePath('/', 'layout');
  return { success: true, settings: updated };
}
