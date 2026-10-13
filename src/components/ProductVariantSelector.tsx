'use client';

import { useState, useEffect } from 'react';
import { filsToDisplay } from '@/lib/money';

export function ProductVariantSelector({ 
  variants, 
  locale,
  product,
  mainImage
}: { 
  variants: any[], 
  locale: string,
  product: any,
  mainImage?: string
}) {
  const [selectedVariant, setSelectedVariant] = useState<any | null>(variants.length === 1 ? variants[0] : null);

  // Dispatch event when variant changes so ProductGallery can react
  useEffect(() => {
    if (selectedVariant) {
      window.dispatchEvent(new CustomEvent('variant-changed', { detail: selectedVariant }));
    }
  }, [selectedVariant]);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const isAr = locale === 'ar';

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    
    try {
      const saved = localStorage.getItem('makeup_cart');
      const cartItems = saved ? JSON.parse(saved) : [];
      
      const existingItem = cartItems.find((item: any) => item.variantId === selectedVariant.id);
      
      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cartItems.push({
          productId: product.id,
          variantId: selectedVariant.id,
          sku: selectedVariant.sku,
          name: isAr ? product.nameAr : product.nameEn,
          size: selectedVariant.name, // Kept for backwards compatibility with cart temporarily
          variantName: selectedVariant.name,
          colorHex: selectedVariant.colorHex,
          price: selectedVariant.price,
          quantity: quantity,
          image: mainImage || null
        });
      }
      
      localStorage.setItem('makeup_cart', JSON.stringify(cartItems));
      
      window.dispatchEvent(new CustomEvent('cart_updated'));
      window.dispatchEvent(new Event('cart_updated'));
      
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error('Failed to add to cart', e);
    }
  };

  return (
    <>
      <div className="text-2xl font-bold text-[#3F4B32] mb-4 h-10 flex items-center">
        {selectedVariant ? (
          filsToDisplay(selectedVariant.price, locale === 'ar' ? 'ar' : 'en')
        ) : (
          <span className="text-lg font-normal text-[#746A64]">
            {isAr ? 'الرجاء تحديد الدرجة لعرض السعر' : 'Please select a shade to view price'}
          </span>
        )}
      </div>

      {/* Shade/Variant Selector */}
      <div className="mb-8 mt-6">
        <div className="mb-4 flex items-end justify-start gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#A69A8C]">
            {isAr ? 'الدرجة' : 'Shade / Variant'}
          </h3>
          {selectedVariant && (
            <span className="text-sm font-bold text-[#2B2B2B]">{selectedVariant.name}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setSelectedVariant(variant)}
              title={variant.name}
              className={`relative flex items-center justify-center p-1 rounded-full transition-all duration-300 cursor-pointer ${
                selectedVariant?.id === variant.id
                  ? 'border-2 border-[#B7935F] shadow-[0_4px_12px_rgba(201,162,77,.2)] scale-110'
                  : 'border-2 border-transparent hover:border-[#B7935F]/50 hover:scale-105'
              }`}
            >
              {variant.colorHex ? (
                <div 
                  className="w-8 h-8 rounded-full border border-[#E9DDCC] shadow-inner" 
                  style={{ backgroundColor: variant.colorHex }}
                />
              ) : (
                <div className={`rounded-full px-5 py-2.5 text-sm font-bold transition-colors ${selectedVariant?.id === variant.id ? 'bg-[#3F4B32] text-white' : 'border border-[#E9DDCC] bg-[#F7F3EA] text-[#2B2B2B]'}`}>
                  {variant.name}
                </div>
              )}
            </button>
          ))}
          {variants.length === 0 && (
            <span className="text-sm text-[#746A64]">
              {isAr ? 'لا توجد خيارات متاحة' : 'No options available'}
            </span>
          )}
        </div>
      </div>

      {/* Quantity & Add to Cart */}
      <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center rounded-full border border-[#E9DDCC] bg-white p-1">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="w-12 h-10 rounded-full flex items-center justify-center text-[#2B2B2B] hover:bg-[#F7F3EA] transition-colors font-bold text-lg"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-bold text-[#2B2B2B]">{quantity}</span>
          <button 
            onClick={() => setQuantity(quantity + 1)}
            className="w-12 h-10 rounded-full flex items-center justify-center text-[#2B2B2B] hover:bg-[#F7F3EA] transition-colors font-bold text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={!selectedVariant}
          onClick={handleAddToCart}
          className="btn-rawaq-primary flex-1 py-3.5 text-sm sm:text-base justify-center"
        >
          {added ? (isAr ? 'تمت الإضافة بنجاح!' : 'Added Successfully!') : 
           (isAr ? 'أضف إلى السلة' : 'Add to Cart')}
        </button>
      </div>
    </>
  );
}
