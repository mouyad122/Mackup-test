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
      <div className="text-2xl font-bold text-[var(--color-rose-600)] mb-2 h-10 flex items-center">
        {selectedVariant ? (
          filsToDisplay(selectedVariant.price, locale === 'ar' ? 'ar' : 'en')
        ) : (
          <span className="text-lg text-zinc-500 font-normal">
            {isAr ? 'الرجاء تحديد الدرجة لعرض السعر' : 'Please select a shade to view price'}
          </span>
        )}
      </div>

      {/* Shade/Variant Selector */}
      <div className="mb-8 mt-6">
        <div className="flex justify-between items-end mb-3">
          <h3 className="text-sm font-bold text-[var(--color-charcoal-900)]">
            {isAr ? 'الدرجة' : 'Shade / Variant'}
          </h3>
          {selectedVariant && (
            <span className="text-sm text-zinc-500 font-medium">{selectedVariant.name}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {variants.map((variant) => (
            <button
              key={variant.id}
              onClick={() => setSelectedVariant(variant)}
              title={variant.name + (variant.stock <= 0 ? (isAr ? ' (نفذت الكمية)' : ' (Out of stock)') : '')}
              className={`relative flex items-center justify-center p-1 border-2 rounded-full transition-all ${
                selectedVariant?.id === variant.id
                  ? 'border-[var(--color-charcoal-900)] scale-110'
                  : 'border-transparent hover:border-[var(--color-ivory-200)]'
              } ${variant.stock <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {variant.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-full h-[2px] bg-red-500 rotate-45 transform origin-center absolute rounded-full shadow-sm"></div>
                </div>
              )}
              {variant.colorHex ? (
                <div 
                  className="w-8 h-8 rounded-full border border-zinc-200 shadow-inner" 
                  style={{ backgroundColor: variant.colorHex }}
                />
              ) : (
                <div className={`px-4 py-2 rounded-full text-sm font-bold border ${selectedVariant?.id === variant.id ? 'bg-[var(--color-charcoal-900)] text-white' : 'bg-[var(--color-ivory-100)] text-[var(--color-charcoal-900)]'}`}>
                  {variant.name}
                </div>
              )}
            </button>
          ))}
          {variants.length === 0 && (
            <span className="text-sm text-zinc-500">
              {isAr ? 'لا توجد خيارات متاحة' : 'No options available'}
            </span>
          )}
        </div>
      </div>

      {/* Quantity & Add to Cart */}
      <div className="flex items-center gap-4 mb-12">
        <div className="flex items-center border border-[var(--color-charcoal-900)] rounded-md">
          <button 
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-3 hover:bg-[var(--color-ivory-200)] text-[var(--color-charcoal-900)] transition-colors"
          >
            -
          </button>
          <span className="w-12 text-center font-bold text-[var(--color-charcoal-900)]">{quantity}</span>
          <button 
            onClick={() => setQuantity(quantity + 1)}
            className="px-4 py-3 hover:bg-[var(--color-ivory-200)] text-[var(--color-charcoal-900)] transition-colors"
          >
            +
          </button>
        </div>
          <button
            type="button"
            disabled={!selectedVariant || selectedVariant.stock <= 0}
            onClick={handleAddToCart}
            className="flex-1 bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-md transition-colors shadow-md">

          {added ? (isAr ? 'تمت الإضافة بنجاح!' : 'Added Successfully!') : 
           (selectedVariant && selectedVariant.stock <= 0) ? (isAr ? 'نفذت الكمية من هذه الدرجة' : 'Out of Stock') : 
           (isAr ? 'أضف إلى السلة' : 'Add to Cart')}
        </button>
      </div>
    </>
  );
}
