import { filsToDisplay } from './money';

export interface RawOfferForGrouping {
  id: string;
  supplierId?: string;
  variantId?: string;
  unitCost: number;
  supplierProfitShareBps: number;
  supplierSku?: string | null;
  isActive: boolean;
  variant: {
    id?: string;
    productId: string;
    size?: string | null;
    name?: string | null;
    sku: string;
    price: number;
    colorName?: string | null;
    colorHex?: string | null;
    mainImage?: string | null;
    images?: Array<{ url: string }>;
    shade?: { id?: string; name: string } | null;
    product: {
      id: string;
      nameAr: string;
      nameEn?: string | null;
      sku?: string | null;
      isVisible: boolean;
      images?: Array<{ url: string }>;
    };
  };
}

export interface GroupedSupplierProduct {
  productId: string;
  productNameAr: string;
  productNameEn?: string | null;
  sku: string;
  image: string | null;
  sizes: string[];
  sizesString: string;
  colors: string[];
  colorsString: string;
  fullDisplayName: string;
  minCostFils: number;
  maxCostFils: number;
  costDisplay: string;
  minPriceFils: number;
  maxPriceFils: number;
  priceDisplay: string;
  isProductVisible: boolean;
  isAnyOfferActive: boolean;
  isVisibleInStore: boolean;
  profitShareBps: number;
  profitShareDisplay: string;
  totalVariantsCount: number;
  offerIds: string[];
}

const SIZE_ORDER: Record<string, number> = {
  'XXS': 1,
  '2XS': 1,
  'XS': 2,
  'S': 3,
  'M': 4,
  'L': 5,
  'XL': 6,
  'XXL': 7,
  '2XL': 7,
  'XXXL': 8,
  '3XL': 8,
  '4XL': 9,
  '5XL': 10,
  '6XL': 11,
};

const DUMMY_SIZES = new Set([
  'STANDARD',
  'DEFAULT',
  'ONE SIZE',
  'OS',
  'ONESIZE',
  'عادي',
  'قياسي',
  '—',
  '-',
  'N/A',
  'NONE',
]);

/**
 * يجمع عروض المورد التابعة لنفس المنتج الأساسي في سطر واحد
 * بحيث تظهر المقاسات والألوان معاً في نفس السطر وبنفس كود المنتج الأساسي
 */
export function groupSupplierOffersByProduct(rawOffers: RawOfferForGrouping[]): GroupedSupplierProduct[] {
  const productMap = new Map<
    string,
    {
      product: RawOfferForGrouping['variant']['product'];
      offers: RawOfferForGrouping[];
    }
  >();

  for (const offer of rawOffers) {
    const prodId = offer.variant.productId;
    if (!productMap.has(prodId)) {
      productMap.set(prodId, {
        product: offer.variant.product,
        offers: [],
      });
    }
    productMap.get(prodId)!.offers.push(offer);
  }

  const results: GroupedSupplierProduct[] = [];

  for (const [productId, { product, offers }] of productMap.entries()) {
    // 1. استخراج الصورة المعتمدة
    let image: string | null = null;
    if (product.images && product.images.length > 0 && product.images[0].url) {
      image = product.images[0].url;
    }
    if (!image) {
      for (const o of offers) {
        if (o.variant.mainImage) {
          image = o.variant.mainImage;
          break;
        }
        if (o.variant.images && o.variant.images.length > 0 && o.variant.images[0].url) {
          image = o.variant.images[0].url;
          break;
        }
      }
    }

    // 2. استخراج المقاسات وترتيبها منطقياً
    const rawSizesSet = new Set<string>();
    for (const o of offers) {
      const s = o.variant.size?.trim();
      if (s && !DUMMY_SIZES.has(s.toUpperCase())) {
        rawSizesSet.add(s);
      }
    }
    const sizes = Array.from(rawSizesSet).sort((a, b) => {
      const upperA = a.toUpperCase();
      const upperB = b.toUpperCase();
      const orderA = SIZE_ORDER[upperA];
      const orderB = SIZE_ORDER[upperB];
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB;
      if (orderA !== undefined) return -1;
      if (orderB !== undefined) return 1;

      // ترتيب رقمي (مثل مقاسات الأحذية أو العبايات 36, 38, 40...)
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;

      return a.localeCompare(b, 'ar');
    });
    const sizesString = sizes.join(', ');

    // 3. استخراج الألوان
    const rawColorsSet = new Set<string>();
    for (const o of offers) {
      const c = o.variant.colorName?.trim();
      const s = o.variant.shade?.name?.trim();
      if (c && !DUMMY_SIZES.has(c.toUpperCase())) rawColorsSet.add(c);
      if (s && !DUMMY_SIZES.has(s.toUpperCase())) rawColorsSet.add(s);
    }
    const colors = Array.from(rawColorsSet);
    const colorsString = colors.join('، ');

    // 4. كود الصنف الأساسي (SKU)
    // الأولوية: كود المورد الموحد -> كود المنتج في النظام -> كود أول تنوع بعد إزالة لاحقة المقاس
    const supplierSkus = offers.map((o) => o.supplierSku?.trim()).filter(Boolean) as string[];
    const firstSupplierSku = supplierSkus.length > 0 ? supplierSkus[0] : null;

    let displaySku = firstSupplierSku;
    if (!displaySku && product.sku && product.sku.trim()) {
      displaySku = product.sku.trim();
    }
    if (!displaySku && offers.length > 0 && offers[0].variant.sku) {
      const vSku = offers[0].variant.sku.trim();
      // إزالة لواحق المقاسات الشائعة مثل -M أو -L أو -38 للحصول على الكود الجذري
      displaySku = vSku.replace(/[-_](XS|S|M|L|XL|2XL|XXL|3XL|XXXL|4XL|5XL|[0-9]{2})$/i, '');
    }
    if (!displaySku) {
      displaySku = '—';
    }

    // 5. الاسم الشامل في سطر واحد
    const specTags: string[] = [];
    if (sizesString) specTags.push(`المقاسات: ${sizesString}`);
    if (colorsString) specTags.push(`الألوان: ${colorsString}`);
    const specsSuffix = specTags.length > 0 ? ` — ${specTags.join(' · ')}` : '';
    const fullDisplayName = `${product.nameAr}${specsSuffix}`;

    // 6. أسعار التكلفة وأسعار البيع
    const costs = offers.map((o) => o.unitCost);
    const minCostFils = Math.min(...costs);
    const maxCostFils = Math.max(...costs);
    const costDisplay =
      minCostFils === maxCostFils
        ? filsToDisplay(minCostFils, 'ar')
        : `${filsToDisplay(minCostFils, 'ar')} - ${filsToDisplay(maxCostFils, 'ar')}`;

    const prices = offers.map((o) => o.variant.price);
    const minPriceFils = Math.min(...prices);
    const maxPriceFils = Math.max(...prices);
    const priceDisplay =
      minPriceFils === maxPriceFils
        ? filsToDisplay(minPriceFils, 'ar')
        : `${filsToDisplay(minPriceFils, 'ar')} - ${filsToDisplay(maxPriceFils, 'ar')}`;

    // 7. حالة العرض والظهور في المتجر
    const isProductVisible = Boolean(product.isVisible);
    const isAnyOfferActive = offers.some((o) => o.isActive);
    const isVisibleInStore = isProductVisible && isAnyOfferActive;

    const profitShares = Array.from(new Set(offers.map((o) => o.supplierProfitShareBps)));
    const minBps = Math.min(...profitShares);
    const maxBps = Math.max(...profitShares);
    const profitShareBps = minBps;
    const profitShareDisplay =
      minBps === maxBps
        ? `${(minBps / 100).toFixed(0)}%`
        : `${(minBps / 100).toFixed(0)}% - ${(maxBps / 100).toFixed(0)}%`;

    results.push({
      productId,
      productNameAr: product.nameAr,
      productNameEn: product.nameEn || null,
      sku: displaySku,
      image,
      sizes,
      sizesString,
      colors,
      colorsString,
      fullDisplayName,
      minCostFils,
      maxCostFils,
      costDisplay,
      minPriceFils,
      maxPriceFils,
      priceDisplay,
      isProductVisible,
      isAnyOfferActive,
      isVisibleInStore,
      profitShareBps,
      profitShareDisplay,
      totalVariantsCount: offers.length,
      offerIds: offers.map((o) => o.id),
    });
  }

  return results;
}
