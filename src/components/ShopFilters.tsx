'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ShopFiltersProps {
  categories: { id: string; name: string; slug: string }[];
  brands: { id: string; nameAr: string; nameEn: string }[];
  finishes: string[];
  skinTypes: string[];
  initialCategory?: string;
  initialBrand?: string;
  initialFinish?: string;
  initialSkinType?: string;
  locale?: string;
}

export function ShopFilters({
  categories,
  brands,
  finishes,
  skinTypes,
  initialCategory = '',
  initialBrand = '',
  initialFinish = '',
  initialSkinType = '',
  locale = 'ar'
}: ShopFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedBrand, setSelectedBrand] = useState(initialBrand);
  const [selectedFinish, setSelectedFinish] = useState(initialFinish);
  const [selectedSkinType, setSelectedSkinType] = useState(initialSkinType);
  const isAr = locale === 'ar';

  const isFirstRender = React.useRef(true);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
    setSelectedCategory(searchParams.get('category') || '');
    setSelectedBrand(searchParams.get('brand') || '');
    setSelectedFinish(searchParams.get('finish') || '');
    setSelectedSkinType(searchParams.get('skinType') || '');
  }, [searchParams]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      let changed = false;

      const currentQ = searchParams.get('q') || '';
      if (searchQuery !== currentQ) {
        if (searchQuery) params.set('q', searchQuery);
        else params.delete('q');
        changed = true;
      }

      const currentCat = searchParams.get('category') || '';
      if (selectedCategory !== currentCat) {
        if (selectedCategory) params.set('category', selectedCategory);
        else params.delete('category');
        changed = true;
      }

      const currentBrand = searchParams.get('brand') || '';
      if (selectedBrand !== currentBrand) {
        if (selectedBrand) params.set('brand', selectedBrand);
        else params.delete('brand');
        changed = true;
      }

      const currentFinish = searchParams.get('finish') || '';
      if (selectedFinish !== currentFinish) {
        if (selectedFinish) params.set('finish', selectedFinish);
        else params.delete('finish');
        changed = true;
      }

      const currentSkin = searchParams.get('skinType') || '';
      if (selectedSkinType !== currentSkin) {
        if (selectedSkinType) params.set('skinType', selectedSkinType);
        else params.delete('skinType');
        changed = true;
      }

      if (changed) {
        router.push(`?${params.toString()}`);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedCategory, selectedBrand, selectedFinish, selectedSkinType, router, searchParams]);

  return (
    <div className="rounded-2xl border border-[#E9DDCC] bg-white p-5 shadow-[0_4px_16px_rgba(139,30,45,.04)] flex flex-col md:flex-row flex-wrap gap-5 lg:gap-6">

      {/* Search Input */}
      <div className="flex-1 min-w-[220px]">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'بحث بالاسم' : 'Search'}</label>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث عن منتج...' : 'Search products...'}
            className="w-full border-b-2 border-[#E9DDCC] bg-transparent py-2.5 pe-4 ps-1 text-sm text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none placeholder:text-[#A69A8C]"
          />
          <svg className="absolute end-1 top-3 h-4 w-4 text-[#B7935F]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
      </div>

      {/* Category Select */}
      <div className="flex-1 min-w-[160px]">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'الفئة' : 'Category'}</label>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2.5 pe-8 ps-1 text-sm font-semibold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
        >
          <option value="">{isAr ? 'الجميع' : 'All'}</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Brand Select */}
      {brands.length > 0 && <div className="flex-1 min-w-[140px]">
        <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'الماركة' : 'Brand'}</label>
        <select
          value={selectedBrand}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2.5 pe-8 ps-1 text-sm font-semibold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
        >
          <option value="">{isAr ? 'الجميع' : 'All'}</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{isAr ? b.nameAr : b.nameEn}</option>
          ))}
        </select>
      </div>}

      {/* Finish Select */}
      {finishes.length > 0 && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'اللمسة النهائية' : 'Finish'}</label>
          <select
            value={selectedFinish}
            onChange={(e) => setSelectedFinish(e.target.value)}
            className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2.5 pe-8 ps-1 text-sm font-semibold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
          >
            <option value="">{isAr ? 'الجميع' : 'All'}</option>
            {finishes.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
      )}

      {/* Skin Type Select */}
      {skinTypes.length > 0 && (
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'نوع البشرة' : 'Skin Type'}</label>
          <select
            value={selectedSkinType}
            onChange={(e) => setSelectedSkinType(e.target.value)}
            className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2.5 pe-8 ps-1 text-sm font-semibold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none"
          >
            <option value="">{isAr ? 'الجميع' : 'All'}</option>
            {skinTypes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
