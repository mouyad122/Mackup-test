import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export interface DynamicFilterOption {
  value: string;
  labelAr: string;
  labelEn: string;
  count: number;
}

export interface DynamicFilterFacet {
  key: string;
  nameAr: string;
  nameEn: string;
  type: 'checkbox' | 'select' | 'range' | 'boolean';
  options: DynamicFilterOption[];
}

export interface DynamicCatalogFilterResult {
  priceRange: { min: number; max: number };
  facets: DynamicFilterFacet[];
}

/**
 * Extracts available, non-empty filter facets dynamically based on the current category
 * and actual product inventory (EAV attributes, brands, sizes, colors, price ranges).
 */
export async function getDynamicCatalogFilters(
  categoryIds: string[],
  activeCategoryTemplateId?: string | null
): Promise<DynamicCatalogFilterResult> {
  const productWhere: Prisma.ProductWhereInput = {
    isVisible: true,
    ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
  };

  // 1. Fetch matching products with their brands, active variants, and attribute values
  const products = await prisma.product.findMany({
    where: productWhere,
    select: {
      id: true,
      brandId: true,
      productTemplateId: true,
      brand: {
        select: {
          id: true,
          nameAr: true,
          nameEn: true,
        },
      },
      variants: {
        where: { isActive: true },
        select: {
          id: true,
          price: true,
          stock: true,
          size: true,
          colorName: true,
          colorHex: true,
        },
      },
      attributeValues: {
        select: {
          attributeDefinitionId: true,
          valueJson: true,
          attributeDefinition: {
            select: {
              id: true,
              key: true,
              nameAr: true,
              nameEn: true,
              inputType: true,
              optionsJson: true,
            },
          },
        },
      },
    },
  });

  const facets: DynamicFilterFacet[] = [];

  // ── Calculate Price Range across all matching variants ──
  let minPrice = Infinity;
  let maxPrice = 0;
  for (const p of products) {
    for (const v of p.variants) {
      if (v.price < minPrice) minPrice = v.price;
      if (v.price > maxPrice) maxPrice = v.price;
    }
  }
  if (minPrice === Infinity) minPrice = 0;

  // ── 1. Brands Facet (Only brands present in matching products) ──
  const brandCountMap = new Map<string, { id: string; nameAr: string; nameEn: string; count: number }>();
  for (const p of products) {
    if (p.brand) {
      const existing = brandCountMap.get(p.brand.id);
      if (existing) {
        existing.count += 1;
      } else {
        brandCountMap.set(p.brand.id, {
          id: p.brand.id,
          nameAr: p.brand.nameAr,
          nameEn: p.brand.nameEn,
          count: 1,
        });
      }
    }
  }

  if (brandCountMap.size > 0) {
    const brandOptions: DynamicFilterOption[] = Array.from(brandCountMap.values())
      .sort((a, b) => b.count - a.count)
      .map(b => ({
        value: b.id,
        labelAr: b.nameAr,
        labelEn: b.nameEn,
        count: b.count,
      }));

    facets.push({
      key: 'brand',
      nameAr: 'الماركة',
      nameEn: 'Brand',
      type: 'checkbox',
      options: brandOptions,
    });
  }

  // ── 2. Sizes Facet (Relevant when products have non-standard size variants) ──
  const sizeCountMap = new Map<string, number>();
  for (const p of products) {
    // Unique sizes per product to avoid double-counting multi-inventory variants of the same product
    const productSizes = new Set<string>();
    for (const v of p.variants) {
      const s = (v.size || '').trim();
      if (s && s !== 'Standard' && s !== 'واحد' && s !== 'افتراضي' && s !== 'Default') {
        productSizes.add(s);
      }
    }
    for (const s of productSizes) {
      sizeCountMap.set(s, (sizeCountMap.get(s) || 0) + 1);
    }
  }

  if (sizeCountMap.size > 0) {
    const sizeOptions: DynamicFilterOption[] = Array.from(sizeCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([size, count]) => ({
        value: size,
        labelAr: size,
        labelEn: size,
        count,
      }));

    facets.push({
      key: 'size',
      nameAr: 'المقاس',
      nameEn: 'Size',
      type: 'checkbox',
      options: sizeOptions,
    });
  }

  // ── 3. Colors Facet ──
  const colorCountMap = new Map<string, number>();
  for (const p of products) {
    const productColors = new Set<string>();
    for (const v of p.variants) {
      const c = (v.colorName || '').trim();
      if (c) productColors.add(c);
    }
    for (const c of productColors) {
      colorCountMap.set(c, (colorCountMap.get(c) || 0) + 1);
    }
  }

  if (colorCountMap.size > 0) {
    const colorOptions: DynamicFilterOption[] = Array.from(colorCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([color, count]) => ({
        value: color,
        labelAr: color,
        labelEn: color,
        count,
      }));

    facets.push({
      key: 'color',
      nameAr: 'اللون',
      nameEn: 'Color',
      type: 'checkbox',
      options: colorOptions,
    });
  }

  // ── 4. Dynamic EAV Attributes (Configured on Product Templates) ──
  // Determine relevant templates for this category
  const templateIds = new Set<string>();
  if (activeCategoryTemplateId) templateIds.add(activeCategoryTemplateId);
  for (const p of products) {
    if (p.productTemplateId) templateIds.add(p.productTemplateId);
  }

  // Fetch filterable template fields
  const filterableFields = templateIds.size > 0
    ? await prisma.productTemplateField.findMany({
        where: {
          templateId: { in: Array.from(templateIds) },
          isFilterable: true,
        },
        include: {
          attributeDefinition: true,
        },
        orderBy: { sortOrder: 'asc' },
      })
    : [];

  const filterableAttrMap = new Map<string, typeof filterableFields[0]['attributeDefinition']>();
  for (const f of filterableFields) {
    filterableAttrMap.set(f.attributeDefinition.id, f.attributeDefinition);
  }

  // Aggregate product attribute values for each filterable attribute
  const attrValueCounts = new Map<string, Map<string, number>>();

  for (const p of products) {
    for (const attr of p.attributeValues) {
      if (!filterableAttrMap.has(attr.attributeDefinitionId)) continue;

      let parsedVal: unknown;
      try {
        parsedVal = JSON.parse(attr.valueJson);
      } catch {
        parsedVal = attr.valueJson;
      }

      if (!parsedVal) continue;

      const valuesToCount: string[] = [];
      if (Array.isArray(parsedVal)) {
        valuesToCount.push(...parsedVal.map(v => String(v).trim()));
      } else if (typeof parsedVal === 'boolean') {
        valuesToCount.push(parsedVal ? 'true' : 'false');
      } else {
        const strVal = String(parsedVal).trim();
        if (strVal) valuesToCount.push(strVal);
      }

      if (!attrValueCounts.has(attr.attributeDefinitionId)) {
        attrValueCounts.set(attr.attributeDefinitionId, new Map());
      }
      const valMap = attrValueCounts.get(attr.attributeDefinitionId)!;

      for (const val of valuesToCount) {
        valMap.set(val, (valMap.get(val) || 0) + 1);
      }
    }
  }

  // Build EAV facets
  for (const [attrId, valMap] of attrValueCounts.entries()) {
    const attrDef = filterableAttrMap.get(attrId);
    if (!attrDef || valMap.size === 0) continue;

    // Parse options metadata if available for Arabic/English labels
    let optionsMeta: Array<{ value: string; labelAr?: string; labelEn?: string }> = [];
    if (attrDef.optionsJson) {
      try {
        optionsMeta = JSON.parse(attrDef.optionsJson);
      } catch {}
    }
    const metaMap = new Map(optionsMeta.map(o => [o.value, o]));

    const options: DynamicFilterOption[] = Array.from(valMap.entries())
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([val, count]) => {
        const meta = metaMap.get(val);
        return {
          value: val,
          labelAr: meta?.labelAr || val,
          labelEn: meta?.labelEn || val,
          count,
        };
      });

    if (options.length > 0) {
      facets.push({
        key: `attr_${attrDef.key}`,
        nameAr: attrDef.nameAr,
        nameEn: attrDef.nameEn || attrDef.nameAr,
        type: 'checkbox',
        options,
      });
    }
  }

  return {
    priceRange: { min: minPrice, max: maxPrice },
    facets,
  };
}
