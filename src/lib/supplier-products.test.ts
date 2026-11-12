import { describe, it, expect } from 'vitest';
import { groupSupplierOffersByProduct, RawOfferForGrouping } from './supplier-products';

describe('groupSupplierOffersByProduct', () => {
  it('groups multiple variants of a dress into a single row with sizes, colors, and base SKU', () => {
    const rawOffers: RawOfferForGrouping[] = [
      {
        id: 'offer-1',
        supplierId: 'sup-1',
        variantId: 'var-1',
        unitCost: 15000,
        supplierProfitShareBps: 2000,
        supplierSku: 'SUP-DEMO-DRS-001',
        isActive: true,
        variant: {
          id: 'var-1',
          productId: 'prod-dress-1',
          size: 'M',
          colorName: 'زيتوني',
          sku: 'SUP-DEMO-DRS-001-M',
          price: 25000,
          product: {
            id: 'prod-dress-1',
            nameAr: 'فستان سهرة زيتوني',
            nameEn: 'Olive Evening Dress',
            sku: 'SUP-DEMO-DRS-001',
            isVisible: true,
          },
        },
      },
      {
        id: 'offer-2',
        supplierId: 'sup-1',
        variantId: 'var-2',
        unitCost: 15000,
        supplierProfitShareBps: 2000,
        supplierSku: 'SUP-DEMO-DRS-001',
        isActive: true,
        variant: {
          id: 'var-2',
          productId: 'prod-dress-1',
          size: 'L',
          colorName: 'زيتوني',
          sku: 'SUP-DEMO-DRS-001-L',
          price: 25000,
          product: {
            id: 'prod-dress-1',
            nameAr: 'فستان سهرة زيتوني',
            nameEn: 'Olive Evening Dress',
            sku: 'SUP-DEMO-DRS-001',
            isVisible: true,
          },
        },
      },
      {
        id: 'offer-3',
        supplierId: 'sup-1',
        variantId: 'var-3',
        unitCost: 15000,
        supplierProfitShareBps: 2000,
        supplierSku: 'SUP-DEMO-DRS-001',
        isActive: true,
        variant: {
          id: 'var-3',
          productId: 'prod-dress-1',
          size: 'XL',
          colorName: 'أسود',
          sku: 'SUP-DEMO-DRS-001-XL',
          price: 25000,
          product: {
            id: 'prod-dress-1',
            nameAr: 'فستان سهرة زيتوني',
            nameEn: 'Olive Evening Dress',
            sku: 'SUP-DEMO-DRS-001',
            isVisible: true,
          },
        },
      },
    ];

    const result = groupSupplierOffersByProduct(rawOffers);

    expect(result).toHaveLength(1);
    const prod = result[0];

    // Single row with product name
    expect(prod.productNameAr).toBe('فستان سهرة زيتوني');
    expect(prod.sku).toBe('SUP-DEMO-DRS-001');

    // All sizes in order
    expect(prod.sizes).toEqual(['M', 'L', 'XL']);
    expect(prod.sizesString).toBe('M, L, XL');

    // Colors combined
    expect(prod.colors).toContain('زيتوني');
    expect(prod.colors).toContain('أسود');

    // Single line combined representation
    expect(prod.fullDisplayName).toContain('فستان سهرة زيتوني');
    expect(prod.fullDisplayName).toContain('المقاسات: M, L, XL');

    // Costs and prices
    expect(prod.costDisplay).toBe('15.000 د.أ');
    expect(prod.priceDisplay).toBe('25.000 د.أ');
    expect(prod.isVisibleInStore).toBe(true);
    expect(prod.totalVariantsCount).toBe(3);
  });

  it('strips size suffixes from variant SKU when supplierSku and product.sku are missing', () => {
    const rawOffers: RawOfferForGrouping[] = [
      {
        id: 'offer-1',
        unitCost: 10000,
        supplierProfitShareBps: 1500,
        isActive: true,
        variant: {
          productId: 'prod-abaya',
          size: '52',
          sku: 'SUP-ABAYA-001-52',
          price: 20000,
          product: {
            id: 'prod-abaya',
            nameAr: 'عباية كلوش كريب',
            isVisible: true,
          },
        },
      },
      {
        id: 'offer-2',
        unitCost: 10000,
        supplierProfitShareBps: 1500,
        isActive: true,
        variant: {
          productId: 'prod-abaya',
          size: '54',
          sku: 'SUP-ABAYA-001-54',
          price: 20000,
          product: {
            id: 'prod-abaya',
            nameAr: 'عباية كلوش كريب',
            isVisible: true,
          },
        },
      },
    ];

    const result = groupSupplierOffersByProduct(rawOffers);
    expect(result).toHaveLength(1);
    expect(result[0].sku).toBe('SUP-ABAYA-001');
    expect(result[0].sizesString).toBe('52, 54');
  });

  it('filters out dummy standard sizes like STANDARD and DEFAULT', () => {
    const rawOffers: RawOfferForGrouping[] = [
      {
        id: 'offer-1',
        unitCost: 30000,
        supplierProfitShareBps: 1500,
        isActive: true,
        variant: {
          productId: 'prod-perfume',
          size: 'STANDARD',
          sku: 'PERF-OUD-001',
          price: 45000,
          product: {
            id: 'prod-perfume',
            nameAr: 'عطر عود ملكي',
            sku: 'PERF-OUD-001',
            isVisible: true,
          },
        },
      },
    ];

    const result = groupSupplierOffersByProduct(rawOffers);
    expect(result).toHaveLength(1);
    expect(result[0].sizes).toEqual([]);
    expect(result[0].sizesString).toBe('');
    expect(result[0].fullDisplayName).toBe('عطر عود ملكي');
  });
});
