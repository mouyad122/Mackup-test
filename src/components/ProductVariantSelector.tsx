'use client';

import { useState, useEffect, useMemo } from 'react';
import { filsToDisplay } from '@/lib/money';
import { AlertCircle, Check } from 'lucide-react';

export interface ProductVariantItem {
  id: string;
  sku: string;
  size: string;
  name?: string;
  shadeName?: string | null;
  colorHex?: string | null;
  price: number;
  compareAt?: number | null;
  stock?: number;
  isActive?: boolean;
}

export function ProductVariantSelector({ 
  variants = [], 
  locale,
  product,
  mainImage
}: { 
  variants: ProductVariantItem[], 
  locale: string,
  product: { id: string; nameAr: string; nameEn: string },
  mainImage?: string
}) {
  const isAr = locale === 'ar';

  // Distinct sizes
  const distinctSizes = useMemo(() => {
    const raw = variants.map(v => v.size?.trim()).filter(Boolean);
    return Array.from(new Set(raw));
  }, [variants]);

  // Distinct shades
  const distinctShades = useMemo(() => {
    const map = new Map<string, { id: string; name: string; colorHex?: string | null }>();
    variants.forEach(v => {
      const shadeKey = (v.shadeName || (v.name && v.name !== v.size ? v.name : '') || v.colorHex || '').trim();
      if (shadeKey && !map.has(shadeKey)) {
        map.set(shadeKey, {
          id: shadeKey,
          name: v.shadeName || (v.name && v.name !== v.size ? v.name : shadeKey),
          colorHex: v.colorHex || null,
        });
      }
    });
    return Array.from(map.values());
  }, [variants]);

  const hasMultipleSizes = distinctSizes.length > 1;
  const hasMultipleShades = distinctShades.length > 1;
  const hasBoth = hasMultipleSizes && hasMultipleShades;

  // If there's only 1 single variant overall, preselect it; otherwise force explicit selection!
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantItem | null>(
    variants.length === 1 ? variants[0] : null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedShade, setSelectedShade] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // When size or shade changes in multi-mode, update the selected variant
  useEffect(() => {
    if (variants.length <= 1) return;

    if (hasBoth) {
      if (selectedSize && selectedShade) {
        const match = variants.find(v => 
          v.size?.trim() === selectedSize.trim() &&
          ((v.shadeName && v.shadeName.trim() === selectedShade.trim()) ||
           (v.name && v.name.trim() === selectedShade.trim()) ||
           (v.colorHex && v.colorHex.trim() === selectedShade.trim()))
        ) || variants.find(v => v.size?.trim() === selectedSize.trim());

        setSelectedVariant(match || null);
        if (match) setValidationError(null);
      } else {
        setSelectedVariant(null);
      }
    } else if (hasMultipleSizes) {
      if (selectedSize) {
        const match = variants.find(v => v.size?.trim() === selectedSize.trim());
        setSelectedVariant(match || null);
        if (match) setValidationError(null);
      } else {
        setSelectedVariant(null);
      }
    } else if (hasMultipleShades) {
      if (selectedShade) {
        const match = variants.find(v => 
          (v.shadeName && v.shadeName.trim() === selectedShade.trim()) ||
          (v.name && v.name.trim() === selectedShade.trim()) ||
          (v.colorHex && v.colorHex.trim() === selectedShade.trim())
        );
        setSelectedVariant(match || null);
        if (match) setValidationError(null);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [selectedSize, selectedShade, hasBoth, hasMultipleSizes, hasMultipleShades, variants]);

  // Dispatch event when variant changes so ProductGallery can react
  useEffect(() => {
    if (selectedVariant) {
      window.dispatchEvent(new CustomEvent('variant-changed', { detail: selectedVariant }));
    }
  }, [selectedVariant]);

  const handleSelectSize = (size: string) => {
    setSelectedSize(size);
    setValidationError(null);
  };

  const handleSelectShade = (shadeName: string) => {
    setSelectedShade(shadeName);
    setValidationError(null);
  };

  const handleSelectFlatVariant = (variant: ProductVariantItem) => {
    setSelectedVariant(variant);
    setValidationError(null);
  };

  const handleAddToCart = () => {
    // Enforce selection for multiple sizes and/or shades
    if (hasBoth) {
      if (!selectedSize && !selectedShade) {
        setValidationError(isAr ? 'يرجى اختيار المقاس والدرجة أولاً لإضافة المنتج إلى السلة' : 'Please choose both size and shade first');
        return;
      }
      if (!selectedSize) {
        setValidationError(isAr ? 'يرجى اختيار المقاس أولاً' : 'Please choose a size first');
        return;
      }
      if (!selectedShade) {
        setValidationError(isAr ? 'يرجى اختيار الدرجة أولاً' : 'Please choose a shade first');
        return;
      }
    } else if (hasMultipleSizes && !selectedSize) {
      setValidationError(isAr ? 'يرجى اختيار المقاس أولاً' : 'Please choose a size first');
      return;
    } else if (hasMultipleShades && !selectedShade) {
      setValidationError(isAr ? 'يرجى اختيار الدرجة أولاً' : 'Please choose a shade first');
      return;
    } else if (!selectedVariant && variants.length > 1) {
      setValidationError(isAr ? 'يرجى تحديد الخيار المطلوب أولاً' : 'Please select an option first');
      return;
    }

    if (!selectedVariant) {
      setValidationError(isAr ? 'يرجى اختيار المواصفات المطلوبة أولاً' : 'Please choose options first');
      return;
    }

    setValidationError(null);

    try {
      const saved = localStorage.getItem('makeup_cart');
      const cartItems = saved ? JSON.parse(saved) : [];
      
      const existingItem = cartItems.find((item: any) => item.variantId === selectedVariant.id);
      
      const displayVariantTitle = selectedVariant.shadeName 
        ? `${selectedVariant.size} - ${selectedVariant.shadeName}` 
        : (selectedVariant.name || selectedVariant.size);

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cartItems.push({
          productId: product.id,
          variantId: selectedVariant.id,
          sku: selectedVariant.sku,
          name: isAr ? product.nameAr : product.nameEn,
          size: selectedVariant.size || selectedVariant.name,
          variantName: displayVariantTitle,
          colorHex: selectedVariant.colorHex || null,
          price: selectedVariant.price,
          quantity: quantity,
          image: mainImage || null
        });
      }
      
      localStorage.setItem('makeup_cart', JSON.stringify(cartItems));
      
      window.dispatchEvent(new CustomEvent('cart_updated'));
      window.dispatchEvent(new Event('cart_updated'));
      
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch (e) {
      console.error('Failed to add to cart', e);
    }
  };

  // Lowest price helper for when no option is chosen yet
  const lowestPrice = useMemo(() => {
    if (variants.length === 0) return 0;
    return Math.min(...variants.map(v => v.price));
  }, [variants]);

  return (
    <div className="space-y-6">
      {/* Price Section */}
      <div className="flex items-baseline gap-3">
        {selectedVariant ? (
          <>
            <span className="text-3xl font-extrabold text-[#3F4832] font-heading">
              {filsToDisplay(selectedVariant.price, locale === 'ar' ? 'ar' : 'en')}
            </span>
            {selectedVariant.compareAt && selectedVariant.compareAt > selectedVariant.price && (
              <span className="text-sm text-stone-400 line-through">
                {filsToDisplay(selectedVariant.compareAt, locale === 'ar' ? 'ar' : 'en')}
              </span>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-[#3F4832] font-heading">
              {isAr ? `يبدأ من ${filsToDisplay(lowestPrice, 'ar')}` : `From ${filsToDisplay(lowestPrice, 'en')}`}
            </span>
            <span className="text-xs text-stone-500 font-medium">
              {hasBoth
                ? (isAr ? 'حددي المقاس والدرجة لعرض السعر الدقيق' : 'Select size and shade to view price')
                : hasMultipleSizes
                ? (isAr ? 'حددي المقاس لعرض السعر الدقيق' : 'Select size to view price')
                : hasMultipleShades
                ? (isAr ? 'حددي الدرجة لعرض السعر الدقيق' : 'Select shade to view price')
                : (isAr ? 'حددي الخيار لعرض السعر' : 'Select option to view price')}
            </span>
          </div>
        )}
      </div>

      {/* Case 1: Both Sizes AND Shades */}
      {hasBoth && (
        <div className="space-y-5">
          {/* 1. Size Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span>{isAr ? 'المقاس / الحجم:' : 'Size:'}</span>
                <span className="text-rose-600 font-bold">*</span>
              </label>
              {selectedSize ? (
                <span className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 px-2 py-0.5 rounded-full">
                  {selectedSize}
                </span>
              ) : (
                <span className="text-xs font-medium text-stone-400">
                  {isAr ? '(مطلوب الاختيار)' : '(Required)'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {distinctSizes.map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSelectSize(size)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#3F4832] text-white border-[#3F4832] shadow-md ring-2 ring-[#3F4832]/20'
                        : 'bg-white text-stone-800 border-stone-200 hover:border-[#3F4832]/40 hover:bg-stone-50'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Shade Selection */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <span>{isAr ? 'الدرجة / اللون:' : 'Shade / Color:'}</span>
                <span className="text-rose-600 font-bold">*</span>
              </label>
              {selectedShade ? (
                <span className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 px-2 py-0.5 rounded-full">
                  {selectedShade}
                </span>
              ) : (
                <span className="text-xs font-medium text-stone-400">
                  {isAr ? '(مطلوب الاختيار)' : '(Required)'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {distinctShades.map((shade) => {
                const isSelected = selectedShade === shade.name;
                return (
                  <button
                    key={shade.id}
                    type="button"
                    onClick={() => handleSelectShade(shade.name)}
                    title={shade.name}
                    className={`group relative flex items-center gap-2 p-1.5 rounded-xl transition-all border cursor-pointer ${
                      isSelected
                        ? 'border-[#B7935F] ring-2 ring-[#B7935F] shadow-md bg-stone-50 scale-[1.02]'
                        : 'border-stone-200 bg-white hover:border-[#B7935F]/50 hover:bg-stone-50'
                    }`}
                  >
                    {shade.colorHex && (
                      <div
                        className="w-6 h-6 rounded-lg border border-stone-200 shadow-inner shrink-0"
                        style={{ backgroundColor: shade.colorHex }}
                      />
                    )}
                    <span className="text-xs sm:text-sm font-bold text-stone-800 px-2">
                      {shade.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Case 2: Only Multiple Sizes */}
      {!hasBoth && hasMultipleSizes && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <span>{isAr ? 'المقاس / الحجم:' : 'Size:'}</span>
              <span className="text-rose-600 font-bold">*</span>
            </label>
            {selectedSize ? (
              <span className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 px-2 py-0.5 rounded-full">
                {selectedSize}
              </span>
            ) : (
              <span className="text-xs font-medium text-stone-400">
                {isAr ? '(مطلوب الاختيار)' : '(Required)'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {distinctSizes.map((size) => {
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => handleSelectSize(size)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#3F4832] text-white border-[#3F4832] shadow-md ring-2 ring-[#3F4832]/20'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-[#3F4832]/40 hover:bg-stone-50'
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Case 3: Only Multiple Shades */}
      {!hasBoth && hasMultipleShades && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <span>{isAr ? 'الدرجة / اللون:' : 'Shade / Color:'}</span>
              <span className="text-rose-600 font-bold">*</span>
            </label>
            {selectedShade ? (
              <span className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 px-2 py-0.5 rounded-full">
                {selectedShade}
              </span>
            ) : (
              <span className="text-xs font-medium text-stone-400">
                {isAr ? '(مطلوب الاختيار)' : '(Required)'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {distinctShades.map((shade) => {
              const isSelected = selectedShade === shade.name;
              return (
                <button
                  key={shade.id}
                  type="button"
                  onClick={() => handleSelectShade(shade.name)}
                  title={shade.name}
                  className={`group relative flex items-center gap-2 p-1.5 rounded-xl transition-all border cursor-pointer ${
                    isSelected
                      ? 'border-[#B7935F] ring-2 ring-[#B7935F] shadow-md bg-stone-50 scale-[1.02]'
                      : 'border-stone-200 bg-white hover:border-[#B7935F]/50 hover:bg-stone-50'
                  }`}
                >
                  {shade.colorHex && (
                    <div
                      className="w-6 h-6 rounded-lg border border-stone-200 shadow-inner shrink-0"
                      style={{ backgroundColor: shade.colorHex }}
                    />
                  )}
                  <span className="text-xs sm:text-sm font-bold text-stone-800 px-2">
                    {shade.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Case 4: Multiple variants with generic options */}
      {!hasBoth && !hasMultipleSizes && !hasMultipleShades && variants.length > 1 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
              <span>{isAr ? 'الخيارات المتاحة:' : 'Available Options:'}</span>
              <span className="text-rose-600 font-bold">*</span>
            </label>
            {selectedVariant ? (
              <span className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 px-2 py-0.5 rounded-full">
                {selectedVariant.name || selectedVariant.size}
              </span>
            ) : (
              <span className="text-xs font-medium text-stone-400">
                {isAr ? '(مطلوب الاختيار)' : '(Required)'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2.5">
            {variants.map((v) => {
              const isSelected = selectedVariant?.id === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleSelectFlatVariant(v)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all border ${
                    isSelected
                      ? 'bg-[#3F4832] text-white border-[#3F4832] shadow-md ring-2 ring-[#3F4832]/20'
                      : 'bg-white text-stone-800 border-stone-200 hover:border-[#3F4832]/40 hover:bg-stone-50'
                  }`}
                >
                  {v.name || v.size}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mandatory selection warning alert */}
      {validationError && (
        <div 
          role="alert" 
          className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs sm:text-sm font-bold transition-all animate-in fade-in slide-in-from-top-1"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Quantity & Add to Cart Controls */}
      <div className="pt-2 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Quantity Stepper */}
        <div className="flex items-center justify-between sm:justify-start rounded-2xl border border-stone-200 bg-white p-1 shadow-sm shrink-0">
          <button 
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors font-bold text-lg"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-extrabold text-stone-900 text-sm">
            {quantity}
          </span>
          <button 
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-700 hover:bg-stone-100 transition-colors font-bold text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        {/* Add to Cart Button */}
        <button
          type="button"
          onClick={handleAddToCart}
          className={`flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm sm:text-base transition-all duration-300 flex items-center justify-center gap-2 shadow-sm ${
            added 
              ? 'bg-emerald-700 text-white shadow-emerald-700/20' 
              : selectedVariant
              ? 'btn-rawaq-primary hover:shadow-lg'
              : 'bg-stone-800 text-white hover:bg-stone-900'
          }`}
        >
          {added ? (
            <>
              <Check className="w-5 h-5" />
              <span>{isAr ? 'تمت الإضافة إلى السلة بنجاح!' : 'Added Successfully!'}</span>
            </>
          ) : !selectedVariant && variants.length > 1 ? (
            <span>
              {hasBoth
                ? (isAr ? 'اختاري المقاس والدرجة للإضافة' : 'Select Size & Shade to Add')
                : hasMultipleSizes
                ? (isAr ? 'اختاري المقاس للإضافة' : 'Select Size to Add')
                : hasMultipleShades
                ? (isAr ? 'اختاري الدرجة للإضافة' : 'Select Shade to Add')
                : (isAr ? 'اختاري الخيار المطلوب للإضافة' : 'Select Option to Add')}
            </span>
          ) : (
            <span>{isAr ? 'أضف إلى السلة' : 'Add to Cart'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
