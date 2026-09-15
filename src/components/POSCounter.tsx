'use client';

import React, { useState, useTransition } from 'react';
import { processPOSCheckout } from '@/actions/pos';
import { X } from 'lucide-react';

interface POSCounterProps {
  products: any[];
  settings: {
    taxEnabled: boolean;
    taxRate: number;
    pricesIncludeTax: boolean;
  };
}

export function POSCounter({ products, settings }: POSCounterProps) {
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [isPending, startTransition] = useTransition();
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  // Mobile navigation tab: 'catalog' or 'cart'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  const { taxEnabled, taxRate, pricesIncludeTax } = settings;

  // Filter products by name or SKU
  const filteredProducts = products.filter(p => 
    p.nameAr.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.nameEn && p.nameEn.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
  };

  const handleAddVariant = (variant: any) => {
    if (!selectedProduct) return;
    
    // Check if variant already in cart
    const existingIdx = cart.findIndex(item => item.variantId === variant.id);
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        variantId: variant.id,
        sku: variant.sku,
        name: selectedProduct.nameAr,
        size: variant.size,
        price: variant.price,
        quantity: 1,
        stockStatus: selectedProduct.stockStatus
      }]);
    }
    setSelectedProduct(null);
  };

  const handleRemoveItem = (variantId: string) => {
    setCart(cart.filter(item => item.variantId !== variantId));
  };

  const handleUpdateQty = (variantId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.variantId === variantId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const getSubtotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const getDiscount = () => {
    const discVal = parseFloat(discountAmount) || 0;
    return Math.round(discVal * 1000); // 1 JOD = 1000 Fils
  };

  const getTax = () => {
    if (!taxEnabled) return 0;
    const afterDiscount = Math.max(0, getSubtotal() - getDiscount());
    if (pricesIncludeTax) {
      // Inclusive Tax Calculation
      return Math.round(afterDiscount * (taxRate / (100 + taxRate)));
    } else {
      // Exclusive Tax Calculation
      return Math.round(afterDiscount * (taxRate / 100));
    }
  };

  const getGrandTotal = () => {
    const afterDiscount = Math.max(0, getSubtotal() - getDiscount());
    if (taxEnabled && !pricesIncludeTax) {
      return afterDiscount + getTax();
    }
    return afterDiscount;
  };

  const getChange = () => {
    const tender = parseFloat(amountTendered) || 0;
    const tenderFils = Math.round(tender * 1000);
    const total = getGrandTotal();
    return Math.max(0, tenderFils - total);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    const payload = {
      items: cart.map(item => ({
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity
      })),
      customerName,
      paymentMethod,
      discount: getDiscount(),
      amountTendered: paymentMethod === 'CASH' ? (parseFloat(amountTendered) || 0) * 1000 : getGrandTotal()
    };

    startTransition(async () => {
      const res = await processPOSCheckout(payload);
      if (res.success) {
        setCheckoutResult(res);
        setCart([]);
        setAmountTendered('');
        setDiscountAmount('0');
      } else {
        alert(res.error || 'حدث خطأ أثناء إتمام العملية');
      }
    });
  };

  return (
    <div className="flex flex-col md:flex-row w-full h-full font-sans bg-[var(--color-ivory-100)]" dir="rtl">
      
      {/* Mobile Screen Navigation Tabs (Visible only on mobile screens) */}
      <div className="md:hidden flex border-b border-[var(--color-ivory-200)] bg-white sticky top-0 z-10 shrink-0">
        <button
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 text-center py-3 font-bold text-sm border-b-2 transition-colors ${
            mobileTab === 'catalog'
              ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]'
              : 'border-transparent text-zinc-500'
          }`}
        >
          قائمة المكياج
        </button>
        <button
          onClick={() => setMobileTab('cart')}
          className={`flex-1 text-center py-3 font-bold text-sm border-b-2 transition-colors relative ${
            mobileTab === 'cart'
              ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]'
              : 'border-transparent text-zinc-500'
          }`}
        >
          سلة المشتريات
          {cart.length > 0 && (
            <span className="absolute top-2.5 right-6 bg-red-500 text-white rounded-full text-[10px] w-5 h-5 flex items-center justify-center font-mono">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* 1. Products & Search Area */}
      <div
        className={`flex-grow flex flex-col p-4 md:p-6 overflow-hidden ${
          mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Top bar search */}
        <div className="flex gap-4 mb-4 shrink-0">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم العربي أو الإنجليزي أو SKU..." 
            className="flex-grow border border-[var(--color-ivory-200)] bg-white rounded px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-[var(--color-champagne-600)]"
          />
        </div>

        {/* Products Grid (optimized for phone taps) */}
        <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
          {filteredProducts.map((product) => {
            const lowestPrice = product.variants.length > 0
              ? Math.min(...product.variants.map((v: any) => v.price))
              : 0;

            const isUnverified = product.stockStatus === 'UNVERIFIED';

            return (
              <button 
                key={product.id} 
                onClick={() => handleSelectProduct(product)}
                className="bg-white p-3 rounded-lg border border-[var(--color-ivory-200)] shadow-sm hover:border-[var(--color-champagne-600)] hover:shadow transition-all text-right flex flex-col justify-between h-32 active:scale-95 duration-100"
              >
                <div>
                  <span className="text-[10px] text-zinc-400 block mb-0.5">{product.category.name}</span>
                  <span className="font-bold text-zinc-900 text-xs md:text-sm line-clamp-2 leading-tight">
                    {product.nameAr}
                  </span>
                </div>
                
                <div className="mt-2">
                  {isUnverified && (
                    <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded w-fit block mb-1">
                      بانتظار التحقق
                    </span>
                  )}

                  <div className="flex justify-between items-end w-full pt-1.5 border-t border-zinc-50">
                    <span className="text-[var(--color-champagne-600)] font-bold text-xs md:text-sm">
                      {(lowestPrice / 1000).toFixed(3)} د.أ
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {product.variants.length} أحجام
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Cart & Checkout Panel */}
      <div
        className={`w-full md:w-96 bg-white border-r border-[var(--color-ivory-200)] flex flex-col h-full shadow-lg ${
          mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Customer Input */}
        <div className="p-3 border-b border-zinc-100 shrink-0">
          <input 
            type="text" 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="اسم العميل" 
            className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-champagne-600)]"
          />
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {cart.map((item) => (
            <div key={item.variantId} className="flex gap-3 border-b pb-3 text-xs md:text-sm">
              <div className="flex-grow">
                <h4 className="font-bold text-zinc-900">{item.name}</h4>
                <p className="text-[10px] text-zinc-500">{item.size} | SKU: {item.sku}</p>
                {item.stockStatus === 'UNVERIFIED' && (
                  <span className="text-amber-600 text-[9px] font-bold block mt-0.5">
                    بانتظار التحقق من المخزن
                  </span>
                )}
                
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center border rounded">
                    <button 
                      onClick={() => handleUpdateQty(item.variantId, -1)}
                      className="px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 font-bold"
                    >
                      -
                    </button>
                    <span className="px-3 font-bold">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateQty(item.variantId, 1)}
                      className="px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="font-bold text-[var(--color-champagne-600)]">
                    {((item.price * item.quantity) / 1000).toFixed(3)} د.أ
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleRemoveItem(item.variantId)}
                className="text-red-500 hover:text-red-700 text-xs self-start"
              >
                إزالة
              </button>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-50"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              <span className="text-xs">السلة فارغة</span>
            </div>
          )}
        </div>

        {/* Totals & Payments */}
        <div className="bg-zinc-50 p-4 border-t space-y-3 shrink-0">
          <div className="space-y-2 text-xs md:text-sm text-zinc-650">
            <div className="flex justify-between">
              <span>المجموع الفرعي</span>
              <span>{(getSubtotal() / 1000).toFixed(3)} د.أ</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span>الخصم المسموح</span>
              <input 
                type="number" 
                step="0.1"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
                className="w-20 border border-zinc-300 rounded px-2 py-0.5 text-left text-xs outline-none focus:ring-1 focus:ring-[var(--color-champagne-600)]"
              />
            </div>

            {taxEnabled && (
              <div className="flex justify-between">
                <span>ضريبة المبيعات ({taxRate}%) {pricesIncludeTax ? '(شاملة)' : ''}</span>
                <span>{(getTax() / 1000).toFixed(3)} د.أ</span>
              </div>
            )}
            
            <div className="flex justify-between text-base md:text-lg font-bold text-zinc-900 pt-1.5 border-t">
              <span>الإجمالي الكلي</span>
              <span className="text-lg md:text-xl text-[var(--color-charcoal-900)]">
                {(getGrandTotal() / 1000).toFixed(3)} د.أ
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-2 gap-3 text-xs md:text-sm font-bold">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 border rounded transition-colors ${paymentMethod === 'CASH' ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
            >
              نقدي
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`py-2 border rounded transition-colors ${paymentMethod === 'CARD' ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}
            >
              بطاقة
            </button>
          </div>

          {/* Cash Payment Tendered Input */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-2 text-xs md:text-sm border-t pt-2">
              <div className="flex justify-between items-center">
                <span>المبلغ المستلم (Tendered)</span>
                <input 
                  type="number" 
                  step="0.01"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                  placeholder="0.00"
                  className="w-24 border border-zinc-300 rounded px-2 py-1 text-left text-xs outline-none focus:ring-1 focus:ring-[var(--color-champagne-600)]"
                />
              </div>
              <div className="flex justify-between font-bold text-amber-700">
                <span>الباقي للعميل (Change)</span>
                <span>{(getChange() / 1000).toFixed(3)} د.أ</span>
              </div>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={isPending || cart.length === 0}
            className="w-full bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white font-bold py-3.5 rounded transition-colors disabled:opacity-50 text-base shadow-md mt-1"
          >
            {isPending ? 'جاري المعالجة...' : 'دفع وإصدار الفاتورة'}
          </button>
        </div>
      </div>

      {/* 3. Variant Selector Overlay (Mobile bottom-sheet style overlay) */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-lg p-6 max-w-md w-full border-t-4 md:border-4 border-[var(--color-champagne-600)] shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[var(--color-charcoal-900)]">
                  {selectedProduct.nameAr}
                </h3>
                <p className="text-[10px] text-zinc-500">{selectedProduct.sku}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-xl px-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-zinc-700 mb-1">اختر الحجم المطلوب:</h4>
              {selectedProduct.variants.map((v: any) => (
                <button
                  key={v.id}
                  onClick={() => handleAddVariant(v)}
                  className="w-full flex justify-between items-center p-3 border border-zinc-200 rounded hover:border-[var(--color-champagne-600)] hover:bg-[var(--color-ivory-100)] transition-colors text-right"
                >
                  <span className="font-bold text-zinc-900 text-xs md:text-sm">{v.size}</span>
                  <span className="text-[var(--color-champagne-600)] font-bold text-xs md:text-sm">
                    {(v.price / 1000).toFixed(3)} د.أ
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectedProduct(null)}
              className="w-full bg-zinc-150 text-zinc-700 py-2.5 rounded font-bold transition-colors hover:bg-zinc-200 text-sm"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* 4. Checkout Success/Receipt Modal */}
      {checkoutResult && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full border-t-8 border-emerald-600 shadow-2xl text-center space-y-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-emerald-600"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            
            <h3 className="text-xl font-bold text-zinc-900">تم إتمام البيع بنجاح!</h3>
            <p className="text-xs text-zinc-500">الرمز المرجعي: <span className="font-bold font-mono text-zinc-800">{checkoutResult.reference}</span></p>
            
            <div className="bg-zinc-50 p-3 rounded text-right space-y-1.5 text-xs text-zinc-650">
              <div className="flex justify-between border-b pb-1">
                <span>الإجمالي المدفوع:</span>
                <span className="font-bold text-zinc-800">{(checkoutResult.total / 1000).toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between">
                <span>طريقة الدفع المطبقة:</span>
                <span className="font-bold text-zinc-800">{paymentMethod === 'CASH' ? 'نقدي' : 'بطاقة'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => window.print()}
                className="w-full bg-[var(--color-charcoal-900)] text-white py-2.5 rounded font-bold hover:bg-[var(--color-charcoal-800)] text-sm shadow"
              >
                طباعة الفاتورة والوصل
              </button>
              <button
                onClick={() => {
                  setCheckoutResult(null);
                  setMobileTab('catalog');
                }}
                className="w-full bg-zinc-200 text-zinc-700 py-2.5 rounded font-bold hover:bg-zinc-300 text-sm"
              >
                متابعة البيع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
