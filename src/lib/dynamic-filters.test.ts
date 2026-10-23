import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const product = {
    findMany: vi.fn(),
  };
  const productTemplateField = {
    findMany: vi.fn(),
  };
  return { product, productTemplateField };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    product: mocks.product,
    productTemplateField: mocks.productTemplateField,
  },
}));

import { getDynamicCatalogFilters } from './dynamic-filters';

describe('Dynamic Catalog Filters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('calculates correct price range and extracts brands, sizes, colors and EAV facets', async () => {
    // Mock products
    mocks.product.findMany.mockResolvedValue([
      {
        id: 'p1',
        brandId: 'b1',
        productTemplateId: 'tmpl-lipstick',
        brand: { id: 'b1', nameAr: 'ديور', nameEn: 'Dior' },
        variants: [
          { id: 'v1', price: 1500, stock: 10, size: null, colorName: 'أحمر مخملي', colorHex: '#e11d48' },
          { id: 'v2', price: 1750, stock: 5, size: null, colorName: 'وردي ناعم', colorHex: '#fb7185' },
        ],
        attributeValues: [
          {
            attributeDefinitionId: 'attr-finish',
            valueJson: JSON.stringify('مات / مخملي'),
            attributeDefinition: {
              id: 'attr-finish',
              key: 'finish',
              nameAr: 'اللمسة النهائية',
              nameEn: 'Finish',
              inputType: 'select',
              optionsJson: JSON.stringify([
                { value: 'matte', labelAr: 'مات / مخملي', labelEn: 'Matte' },
                { value: 'glossy', labelAr: 'لامع', labelEn: 'Glossy' },
              ]),
            },
          },
        ],
      },
      {
        id: 'p2',
        brandId: 'b1',
        productTemplateId: 'tmpl-lipstick',
        brand: { id: 'b1', nameAr: 'ديور', nameEn: 'Dior' },
        variants: [
          { id: 'v3', price: 1200, stock: 4, size: null, colorName: 'أحمر مخملي', colorHex: '#e11d48' },
        ],
        attributeValues: [
          {
            attributeDefinitionId: 'attr-finish',
            valueJson: JSON.stringify('مات / مخملي'),
            attributeDefinition: {
              id: 'attr-finish',
              key: 'finish',
              nameAr: 'اللمسة النهائية',
              nameEn: 'Finish',
              inputType: 'select',
              optionsJson: JSON.stringify([
                { value: 'matte', labelAr: 'مات / مخملي', labelEn: 'Matte' },
              ]),
            },
          },
        ],
      },
      {
        id: 'p3',
        brandId: 'b2',
        productTemplateId: 'tmpl-abaya',
        brand: { id: 'b2', nameAr: 'سيدة الرداء', nameEn: 'Sayidat Al-Ridaa' },
        variants: [
          { id: 'v4', price: 4500, stock: 2, size: '54', colorName: 'أسود فاحم', colorHex: '#000000' },
          { id: 'v5', price: 4500, stock: 2, size: '56', colorName: 'أسود فاحم', colorHex: '#000000' },
        ],
        attributeValues: [
          {
            attributeDefinitionId: 'attr-fabric',
            valueJson: JSON.stringify('كريب ملكي فاخر'),
            attributeDefinition: {
              id: 'attr-fabric',
              key: 'fabric',
              nameAr: 'نوع القماش',
              nameEn: 'Fabric',
              inputType: 'select',
              optionsJson: null,
            },
          },
        ],
      },
    ]);

    // Mock filterable template fields
    mocks.productTemplateField.findMany.mockResolvedValue([
      {
        id: 'ptf-finish',
        templateId: 'tmpl-lipstick',
        isFilterable: true,
        sortOrder: 1,
        attributeDefinition: {
          id: 'attr-finish',
          key: 'finish',
          nameAr: 'اللمسة النهائية',
          nameEn: 'Finish',
          inputType: 'select',
          optionsJson: JSON.stringify([
            { value: 'matte', labelAr: 'مات / مخملي', labelEn: 'Matte' },
            { value: 'glossy', labelAr: 'لامع', labelEn: 'Glossy' },
          ]),
        },
      },
      {
        id: 'ptf-fabric',
        templateId: 'tmpl-abaya',
        isFilterable: true,
        sortOrder: 2,
        attributeDefinition: {
          id: 'attr-fabric',
          key: 'fabric',
          nameAr: 'نوع القماش',
          nameEn: 'Fabric',
          inputType: 'select',
          optionsJson: null,
        },
      },
    ]);

    const result = await getDynamicCatalogFilters(['cat-makeup']);

    // 1. Price Range: min is 1200, max is 4500
    expect(result.priceRange).toEqual({ min: 1200, max: 4500 });

    // 2. Brands Facet
    const brandFacet = result.facets.find((f) => f.key === 'brand');
    expect(brandFacet).toBeDefined();
    expect(brandFacet?.options).toHaveLength(2);
    const dior = brandFacet?.options.find((o) => o.value === 'b1');
    expect(dior?.count).toBe(2); // Products p1 and p2
    const abayaBrand = brandFacet?.options.find((o) => o.value === 'b2');
    expect(abayaBrand?.count).toBe(1); // Product p3

    // 3. Sizes Facet (size 54 and 56 from p3)
    const sizeFacet = result.facets.find((f) => f.key === 'size');
    expect(sizeFacet).toBeDefined();
    expect(sizeFacet?.options.map((o) => o.value)).toContain('54');
    expect(sizeFacet?.options.map((o) => o.value)).toContain('56');

    // 4. Colors Facet (deduplicated per product)
    const colorFacet = result.facets.find((f) => f.key === 'color');
    expect(colorFacet).toBeDefined();
    // 'أحمر مخملي' is in p1 and p2 => count 2
    const velvetRed = colorFacet?.options.find((o) => o.value === 'أحمر مخملي');
    expect(velvetRed?.count).toBe(2);

    // 5. Dynamic EAV Facets (keys prefixed with attr_)
    const finishFacet = result.facets.find((f) => f.key === 'attr_finish');
    expect(finishFacet).toBeDefined();
    expect(finishFacet?.nameAr).toBe('اللمسة النهائية');
    expect(finishFacet?.options[0].value).toBe('مات / مخملي');
    expect(finishFacet?.options[0].count).toBe(2);

    const fabricFacet = result.facets.find((f) => f.key === 'attr_fabric');
    expect(fabricFacet).toBeDefined();
    expect(fabricFacet?.nameAr).toBe('نوع القماش');
    expect(fabricFacet?.options[0].value).toBe('كريب ملكي فاخر');
    expect(fabricFacet?.options[0].count).toBe(1);
  });

  it('handles empty product list gracefully with 0-range and no facets', async () => {
    mocks.product.findMany.mockResolvedValue([]);
    mocks.productTemplateField.findMany.mockResolvedValue([]);

    const result = await getDynamicCatalogFilters(['cat-empty']);
    expect(result.priceRange).toEqual({ min: 0, max: 0 });
    expect(result.facets).toEqual([]);
  });
});
