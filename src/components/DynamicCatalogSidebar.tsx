'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { DynamicFilterFacet } from '@/lib/dynamic-filters';

export interface CategoryTreeNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  directCount: number;
  rollupCount: number;
  imagePath?: string | null;
  children: CategoryTreeNode[];
}

interface DynamicCatalogSidebarProps {
  categoriesTree: CategoryTreeNode[];
  facets: DynamicFilterFacet[];
  priceRange: { min: number; max: number };
  activeCategoryId?: string;
  totalProducts: number;
  locale?: string;
}

export function DynamicCatalogSidebar({
  categoriesTree,
  facets,
  priceRange,
  activeCategoryId = '',
  totalProducts,
  locale = 'ar',
}: DynamicCatalogSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const isAr = locale !== 'en';

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Expanded accordions in category tree
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    // Auto-expand path leading to active category
    const initial: Record<string, boolean> = {};
    if (activeCategoryId) {
      for (const root of categoriesTree) {
        if (root.id === activeCategoryId) {
          initial[root.id] = true;
        }
        for (const sub of root.children) {
          if (sub.id === activeCategoryId) {
            initial[root.id] = true;
            initial[sub.id] = true;
          }
          for (const leaf of sub.children) {
            if (leaf.id === activeCategoryId) {
              initial[root.id] = true;
              initial[sub.id] = true;
            }
          }
        }
      }
    }
    return initial;
  });

  const toggleNode = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // ── URL Filter Mutation ──
  const updateFilter = (key: string, value: string, isChecked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    const existing = params.getAll(key);

    params.delete(key);
    let updated: string[];

    if (isChecked) {
      updated = [...existing, value];
    } else {
      updated = existing.filter(v => v !== value);
    }

    for (const v of updated) {
      params.append(key, v);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const setSingleParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  // Determine active filters for badge pills
  const inStock = searchParams.get('inStock') === 'true';
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const selectedBrands = searchParams.getAll('brand');

  const activeAttributeKeys = Array.from(searchParams.keys()).filter(k => k.startsWith('attr_'));
  const activeSizes = searchParams.getAll('size');
  const activeColors = searchParams.getAll('color');

  const totalActiveFiltersCount =
    (activeCategoryId ? 1 : 0) +
    (inStock ? 1 : 0) +
    (minPriceParam ? 1 : 0) +
    (maxPriceParam ? 1 : 0) +
    selectedBrands.length +
    activeSizes.length +
    activeColors.length +
    activeAttributeKeys.reduce((acc, k) => acc + searchParams.getAll(k).length, 0);

  // ── Render Filter Content ──
  const renderFilterPanel = () => (
    <div className="space-y-6">

      {/* ── Active Filter Summary & Clear ── */}
      {totalActiveFiltersCount > 0 && (
        <div className="bg-[#EDE3D5]/40 rounded-2xl p-4 border border-[#E9DDCC]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-[#3F4832] flex items-center gap-1.5">
              <span>✦</span>
              {isAr ? 'الفلاتر النشطة' : 'Active Filters'} ({totalActiveFiltersCount})
            </span>
            <button
              onClick={clearAllFilters}
              className="text-xs text-[#A84242] hover:underline font-semibold"
            >
              {isAr ? 'مسح الكل' : 'Clear all'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {inStock && (
              <span className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#3F4832] border border-[#E9DDCC]">
                {isAr ? 'المتوفر فقط' : 'In stock'}
                <button onClick={() => setSingleParam('inStock', null)} className="hover:text-[#A84242]">✕</button>
              </span>
            )}
            {selectedBrands.map(bId => {
              const brandFacet = facets.find(f => f.key === 'brand');
              const opt = brandFacet?.options.find(o => o.value === bId);
              return (
                <span key={bId} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#3F4832] border border-[#E9DDCC]">
                  {opt ? (isAr ? opt.labelAr : opt.labelEn) : bId}
                  <button onClick={() => updateFilter('brand', bId, false)} className="hover:text-[#A84242]">✕</button>
                </span>
              );
            })}
            {activeSizes.map(s => (
              <span key={s} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#3F4832] border border-[#E9DDCC]">
                {s}
                <button onClick={() => updateFilter('size', s, false)} className="hover:text-[#A84242]">✕</button>
              </span>
            ))}
            {activeColors.map(c => (
              <span key={c} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#3F4832] border border-[#E9DDCC]">
                {c}
                <button onClick={() => updateFilter('color', c, false)} className="hover:text-[#A84242]">✕</button>
              </span>
            ))}
            {activeAttributeKeys.map(key => {
              const facet = facets.find(f => f.key === key);
              const vals = searchParams.getAll(key);
              return vals.map(v => {
                const opt = facet?.options.find(o => o.value === v);
                return (
                  <span key={key + v} className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-full text-[11px] font-semibold text-[#3F4832] border border-[#E9DDCC]">
                    {facet?.nameAr}: {opt ? opt.labelAr : v}
                    <button onClick={() => updateFilter(key, v, false)} className="hover:text-[#A84242]">✕</button>
                  </span>
                );
              });
            })}
          </div>
        </div>
      )}

      {/* ── 1. Interactive Category Tree (شجرة الأقسام) ── */}
      <div className="bg-white rounded-2xl p-5 border border-[#E9DDCC] shadow-sm">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E9DDCC]">
          <h3 className="text-sm font-bold font-heading text-[#2B2B2B] flex items-center gap-2">
            <span className="text-[#B7935F]">◈</span>
            {isAr ? 'شجرة الأقسام' : 'Categories'}
          </h3>
          <Link
            href={pathname}
            className={`text-xs font-semibold ${!activeCategoryId ? 'text-[#B7935F]' : 'text-[#746A64] hover:text-[#3F4832]'}`}
          >
            {isAr ? 'عرض الكل' : 'View all'}
          </Link>
        </div>

        <div className="space-y-1">
          {categoriesTree.map((root) => {
            const isRootActive = activeCategoryId === root.id;
            const hasChildren = root.children && root.children.length > 0;
            const isExpanded = Boolean(expandedNodes[root.id]);

            return (
              <div key={root.id} className="text-xs">
                {/* Level 1: Root */}
                <div
                  className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                    isRootActive
                      ? 'bg-[#3F4832] text-white font-bold shadow-sm'
                      : 'text-[#2B2B2B] hover:bg-[#F7F3EA] font-semibold'
                  }`}
                >
                  <Link
                    href={`?category=${encodeURIComponent(root.id)}`}
                    className="flex-1 flex items-center gap-2.5 min-w-0"
                  >
                    {root.imagePath ? (
                      <div className="relative w-7 h-7 rounded-lg overflow-hidden border border-[#D9C6A8]/60 shrink-0 bg-[#e8e5df]">
                        <img
                          src={root.imagePath}
                          alt={root.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-[#EDE3D5] flex items-center justify-center text-[10px] shrink-0 text-[#B7935F]">
                        ✦
                      </div>
                    )}
                    <span className="truncate">{root.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${isRootActive ? 'bg-white/20 text-white' : 'bg-[#EDE3D5] text-[#746A64]'}`}>
                      {root.rollupCount}
                    </span>
                  </Link>

                  {hasChildren && (
                    <button
                      onClick={(e) => toggleNode(root.id, e)}
                      className="p-1 hover:opacity-80 transition-opacity"
                      aria-label="توسيع"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Level 2: Subcategories */}
                {hasChildren && isExpanded && (
                  <div className="ms-3 my-1 border-s-2 border-[#E9DDCC] ps-2 space-y-1">
                    {root.children.map((sub) => {
                      const isSubActive = activeCategoryId === sub.id;
                      const hasGrandChildren = sub.children && sub.children.length > 0;
                      const isSubExpanded = Boolean(expandedNodes[sub.id]);

                      return (
                        <div key={sub.id}>
                          <div
                            className={`flex items-center justify-between p-1.5 rounded-lg transition-all ${
                              isSubActive
                                ? 'bg-[#B7935F] text-white font-bold'
                                : 'text-[#746A64] hover:bg-[#F7F3EA] hover:text-[#3F4832] font-medium'
                            }`}
                          >
                            <Link
                              href={`?category=${encodeURIComponent(sub.id)}`}
                              className="flex-1 flex items-center gap-1.5"
                            >
                              <span>{sub.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSubActive ? 'bg-white/25 text-white' : 'text-[#A69A8C]'}`}>
                                {sub.rollupCount}
                              </span>
                            </Link>

                            {hasGrandChildren && (
                              <button
                                onClick={(e) => toggleNode(sub.id, e)}
                                className="p-0.5 hover:opacity-80"
                              >
                                <svg
                                  className={`w-3 h-3 transition-transform duration-200 ${isSubExpanded ? 'rotate-180' : ''}`}
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <path d="m6 9 6 6 6-6" />
                                </svg>
                              </button>
                            )}
                          </div>

                          {/* Level 3: Leaf Items */}
                          {hasGrandChildren && isSubExpanded && (
                            <div className="ms-2.5 my-1 border-s border-[#E9DDCC] ps-2 space-y-0.5">
                              {sub.children.map((leaf) => {
                                const isLeafActive = activeCategoryId === leaf.id;
                                return (
                                  <Link
                                    key={leaf.id}
                                    href={`?category=${encodeURIComponent(leaf.id)}`}
                                    className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all ${
                                      isLeafActive
                                        ? 'bg-[#3F4832] text-white font-bold'
                                        : 'text-[#847B74] hover:text-[#3F4832] hover:bg-[#F7F3EA]'
                                    }`}
                                  >
                                    <span>{leaf.name}</span>
                                    <span className="text-[9px] opacity-70">{leaf.directCount}</span>
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2. In Stock Only Toggle ── */}
      <div className="bg-white rounded-2xl p-5 border border-[#E9DDCC] shadow-sm flex items-center justify-between">
        <label htmlFor="inStockToggle" className="text-sm font-semibold text-[#2B2B2B] cursor-pointer">
          {isAr ? 'المتوفر في المخزون فقط' : 'In stock only'}
        </label>
        <button
          id="inStockToggle"
          role="switch"
          aria-checked={inStock}
          onClick={() => setSingleParam('inStock', inStock ? null : 'true')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            inStock ? 'bg-[#3F4832]' : 'bg-[#E9DDCC]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              inStock ? (isAr ? '-translate-x-6' : 'translate-x-6') : (isAr ? '-translate-x-1' : 'translate-x-1')
            }`}
          />
        </button>
      </div>

      {/* ── 3. Price Filter (دينار أردني) ── */}
      {priceRange.max > priceRange.min && (
        <div className="bg-white rounded-2xl p-5 border border-[#E9DDCC] shadow-sm">
          <h4 className="text-sm font-bold text-[#2B2B2B] mb-3 flex items-center gap-2">
            <span className="text-[#B7935F]">✦</span>
            {isAr ? 'نطاق السعر (د.أ)' : 'Price Range (JOD)'}
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-[#A69A8C] block mb-1">{isAr ? 'من' : 'Min'}</span>
              <input
                type="number"
                defaultValue={minPriceParam ? String(Number(minPriceParam) / 1000) : ''}
                placeholder={(priceRange.min / 1000).toFixed(0)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  setSingleParam('minPrice', val ? String(Math.round(Number(val) * 1000)) : null);
                }}
                className="w-full border border-[#E9DDCC] rounded-xl px-2.5 py-1.5 text-xs text-[#2B2B2B] focus:border-[#B7935F] focus:outline-none"
              />
            </div>
            <div>
              <span className="text-[10px] text-[#A69A8C] block mb-1">{isAr ? 'إلى' : 'Max'}</span>
              <input
                type="number"
                defaultValue={maxPriceParam ? String(Number(maxPriceParam) / 1000) : ''}
                placeholder={(priceRange.max / 1000).toFixed(0)}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  setSingleParam('maxPrice', val ? String(Math.round(Number(val) * 1000)) : null);
                }}
                className="w-full border border-[#E9DDCC] rounded-xl px-2.5 py-1.5 text-xs text-[#2B2B2B] focus:border-[#B7935F] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Dynamic Facets (Brand, Size, Color, EAV Attributes) ── */}
      {facets.map((facet) => {
        const selectedValues = searchParams.getAll(facet.key);

        return (
          <div key={facet.key} className="bg-white rounded-2xl p-5 border border-[#E9DDCC] shadow-sm">
            <h4 className="text-sm font-bold text-[#2B2B2B] mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="text-[#B7935F]">✦</span>
                {isAr ? facet.nameAr : facet.nameEn}
              </span>
              {selectedValues.length > 0 && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete(facet.key);
                    router.push(`${pathname}?${params.toString()}`);
                  }}
                  className="text-[11px] text-[#A84242] hover:underline"
                >
                  {isAr ? 'مسح' : 'Clear'}
                </button>
              )}
            </h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pe-1 hide-scrollbar">
              {facet.options.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);

                return (
                  <label
                    key={opt.value}
                    className="flex items-center justify-between text-xs text-[#746A64] hover:text-[#2B2B2B] cursor-pointer select-none group py-0.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => updateFilter(facet.key, opt.value, e.target.checked)}
                        className="rounded border-[#D9C6A8] text-[#3F4832] focus:ring-[#3F4832] h-4 w-4"
                      />
                      <span className={`truncate ${isChecked ? 'font-bold text-[#3F4832]' : ''}`}>
                        {isAr ? opt.labelAr : opt.labelEn}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#A69A8C] ps-2">
                      ({opt.count})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );

  return (
    <>
      {/* ── Desktop Sidebar View ── */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-28 space-y-6">
          {renderFilterPanel()}
        </div>
      </aside>

      {/* ── Mobile Trigger Floating Button ── */}
      <div className="lg:hidden fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="pointer-events-auto bg-[#3F4832] text-white px-6 py-3.5 rounded-full font-bold shadow-2xl flex items-center gap-2.5 text-sm hover:bg-[#2A3321] transition-all duration-300 transform hover:scale-105 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" x2="20" y1="6" y2="6"/><line x1="10" x2="20" y1="12" y2="12"/><line x1="14" x2="20" y1="18" y2="18"/>
          </svg>
          <span>{isAr ? 'الأقسام والتصفية' : 'Categories & Filters'}</span>
          {totalActiveFiltersCount > 0 && (
            <span className="bg-[#B7935F] text-white text-[11px] h-5 min-w-5 px-1 rounded-full flex items-center justify-center font-bold">
              {totalActiveFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* ── Mobile Slide-Over Drawer ── */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          dir={isAr ? 'rtl' : 'ltr'}
          onClick={() => setIsMobileOpen(false)}
        >
          <div
            className="absolute inset-y-0 start-0 w-[88vw] max-w-sm bg-[#F7F3EA] shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-5 border-b border-[#E9DDCC] bg-white">
              <div className="flex items-center gap-2">
                <span className="text-[#B7935F]">✦</span>
                <h3 className="font-bold font-heading text-[#2B2B2B]">
                  {isAr ? 'الأقسام والتصفية' : 'Filter & Categories'}
                </h3>
                {totalActiveFiltersCount > 0 && (
                  <span className="bg-[#3F4832] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                    {totalActiveFiltersCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-full bg-[#F7F3EA] text-[#746A64]"
              >
                ✕
              </button>
            </div>

            {/* Drawer Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {renderFilterPanel()}
            </div>

            {/* Drawer Footer CTA */}
            <div className="p-4 border-t border-[#E9DDCC] bg-white">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="w-full bg-[#3F4832] text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-[#2A3321] transition-colors"
              >
                {isAr ? `عرض ${totalProducts} منتج` : `View ${totalProducts} products`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
