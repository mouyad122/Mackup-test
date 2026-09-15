'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { X } from 'lucide-react';
import { processPOSCheckout } from '@/actions/pos';
import { verifyUnlockPassword } from '@/actions/auth';
import { useRouter } from 'next/navigation';
import { POSOrdersPanel } from './POSOrdersPanel';

interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  isActive: boolean;
  colorHex?: string | null;
  stock: number;
}

interface ProductItem {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  shortDescription: string | null;
  stockStatus: string;
  variants: ProductVariant[];
  imageUrl: string | null;
  brandName?: string | null;
}

interface POSCashierWorkspaceProps {
  products: ProductItem[];
  settings: {
    taxEnabled: boolean;
    taxRate: number;
    pricesIncludeTax: boolean;
    posIdleEnabled?: boolean;
    posIdleTimeoutMinutes?: number;
    posIdleShowClock?: boolean;
    posIdleShowDate?: boolean;
    posIdleRequirePin?: boolean;
    posIdleMessageAr?: string;
    posIdleMessageEn?: string;
    posSessionLifetimeHours?: number;
  };
  cashierName: string;
  sessionExpiresAt: string;
  hasOrdersViewPermission?: boolean;
  hasOrdersManagePermission?: boolean;
}

export function POSCashierWorkspace({
  products,
  settings,
  cashierName,
  sessionExpiresAt,
  hasOrdersViewPermission = false,
  hasOrdersManagePermission = false
}: POSCashierWorkspaceProps) {
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [customerName, setCustomerName] = useState('عميل نقدي');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('0');
  const [isPending, startTransition] = useTransition();
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);
  const router = useRouter();

  // Mobile navigation tab: 'catalog' or 'cart'
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Idle and Session state
  const [isIdle, setIsIdle] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const { 
    taxEnabled, 
    taxRate, 
    pricesIncludeTax, 
    posIdleEnabled = true,
    posIdleTimeoutMinutes = 4,
    posIdleShowClock = true,
    posIdleShowDate = true,
    posIdleRequirePin = false,
    posIdleMessageAr = 'شاشة خمول مؤقتة - يرجى الضغط للمتابعة',
    posSessionLifetimeHours = 15
  } = settings;

  useEffect(() => {
    const channel = new BroadcastChannel('pos_session_sync');
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      if (event.data === 'LOCK') setIsLocked(true);
      else if (event.data === 'UNLOCK') setIsLocked(false);
      else if (event.data === 'LOGOUT') window.location.href = '/pos/login';
    };

    return () => channel.close();
  }, []);

  const handleLogoutAction = () => {
    broadcastChannelRef.current?.postMessage('LOGOUT');
    window.location.href = '/login';
  };

  const resetIdleTimer = () => {
    if (!posIdleEnabled) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!isLocked && !isIdle) {
      idleTimerRef.current = setTimeout(() => setIsIdle(true), posIdleTimeoutMinutes * 60 * 1000);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));

      const expiry = new Date(sessionExpiresAt).getTime();
      const diff = Math.max(0, Math.floor((expiry - now.getTime()) / 1000));
      setSessionTimeLeft(diff);

      if (diff <= 0) handleLogoutAction();
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionExpiresAt]);

  useEffect(() => {
    const handleCaptureInteraction = (e: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (isIdle) {
        e.stopPropagation();
        e.preventDefault();
        setIsIdle(false);
        if (posIdleRequirePin) {
          setIsLocked(true);
          broadcastChannelRef.current?.postMessage('LOCK');
        }
        resetIdleTimer();
      }
    };
    window.addEventListener('click', handleCaptureInteraction, true);
    window.addEventListener('pointerdown', handleCaptureInteraction, true);
    window.addEventListener('touchstart', handleCaptureInteraction, true);
    window.addEventListener('keydown', handleCaptureInteraction, true);
    return () => {
      window.removeEventListener('click', handleCaptureInteraction, true);
      window.removeEventListener('pointerdown', handleCaptureInteraction, true);
      window.removeEventListener('touchstart', handleCaptureInteraction, true);
      window.removeEventListener('keydown', handleCaptureInteraction, true);
    };
  }, [isIdle]);

  useEffect(() => {
    const events = ['pointermove', 'pointerdown', 'click', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(event => window.removeEventListener(event, resetIdleTimer));
    };
  }, [isLocked, isIdle, posIdleEnabled, posIdleTimeoutMinutes]);

  const handleUnlockAction = () => {
    if (posIdleRequirePin) {
      if (!pinInput) {
        alert('يرجى إدخال كلمة المرور');
        return;
      }
      startTransition(async () => {
        const res = await verifyUnlockPassword(pinInput);
        if (res.success) {
          setIsLocked(false);
          setPinInput('');
          broadcastChannelRef.current?.postMessage('UNLOCK');
        } else {
          alert(res.error || 'كلمة المرور غير صحيحة');
          setPinInput('');
        }
      });
    } else {
      setIsLocked(false);
      broadcastChannelRef.current?.postMessage('UNLOCK');
    }
  };

  const filteredProducts = products.filter(p => 
    p.nameAr.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.nameEn && p.nameEn.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectProduct = (product: ProductItem) => {
    setSelectedProduct(product);
  };

  const handleAddVariant = (variant: ProductVariant) => {
    if (!selectedProduct) return;
    
    const existingIdx = cart.findIndex(item => item.variantId === variant.id);
    if (existingIdx > -1) {
      const updated = [...cart];
      updated[existingIdx].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, {
        variantId: variant.id,
        sku: variant.sku,
        productName: selectedProduct.nameAr,
        variantName: variant.name,
        price: variant.price,
        quantity: 1,
        colorHex: variant.colorHex
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

  const getSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const getDiscount = () => Math.round((parseFloat(discountAmount) || 0) * 1000);
  
  const getTax = () => {
    if (!taxEnabled) return 0;
    const afterDiscount = Math.max(0, getSubtotal() - getDiscount());
    if (pricesIncludeTax) return Math.round(afterDiscount * (taxRate / (100 + taxRate)));
    return Math.round(afterDiscount * (taxRate / 100));
  };

  const getGrandTotal = () => {
    const afterDiscount = Math.max(0, getSubtotal() - getDiscount());
    if (taxEnabled && !pricesIncludeTax) return afterDiscount + getTax();
    return afterDiscount;
  };

  const getChange = () => {
    const entered = parseFloat(amountTendered);
    if (isNaN(entered) || entered <= 0) return 0;
    const tenderFils = Math.round(entered * 1000);
    return Math.max(0, tenderFils - getGrandTotal());
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const grandTotalFils = getGrandTotal();
    
    let tenderedFils = grandTotalFils;
    if (paymentMethod === 'CASH') {
      const enteredAmount = parseFloat(amountTendered);
      if (!isNaN(enteredAmount) && enteredAmount > 0) {
        tenderedFils = Math.round(enteredAmount * 1000);
      }
    }

    if (paymentMethod === 'CASH' && tenderedFils < grandTotalFils) {
      alert('المبلغ المستلم نقداً يجب أن يكون مساوياً للإجمالي أو أكبر منه!');
      return;
    }
    
    const payload = {
      items: cart.map(item => ({
        variantId: item.variantId,
        sku: item.sku,
        quantity: item.quantity
      })),
      customerName,
      paymentMethod,
      discount: getDiscount(),
      amountTendered: tenderedFils
    };

    startTransition(async () => {
      const res = await processPOSCheckout(payload);
      if (res.success) {
        setCheckoutResult(res);
        setCart([]);
        setAmountTendered('');
        setDiscountAmount('0');
        // Refresh the page data to sync inventory stock automatically
        router.refresh();
      } else {
        alert(res.error || 'حدث خطأ أثناء إتمام العملية');
      }
    });
  };

  return (
    <div className="flex flex-col w-full h-full relative" dir="rtl">
      <div className="flex-1 flex flex-col md:flex-row w-full overflow-hidden">
        {/* Mobile screen tabs */}
        <div className="md:hidden flex border-b border-[var(--color-ivory-200)] bg-white sticky top-0 z-10 shrink-0">
          <button
            onClick={() => setMobileTab('catalog')}
            className={`flex-1 text-center py-3 font-bold text-sm border-b-2 transition-colors ${
              mobileTab === 'catalog'
                ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]'
                : 'border-transparent text-zinc-500'
            }`}
          >
            قائمة المنتجات
          </button>
          <button
            onClick={() => setMobileTab('cart')}
            className={`flex-1 text-center py-3 font-bold text-sm border-b-2 transition-colors relative ${
              mobileTab === 'cart'
                ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]'
                : 'border-transparent text-zinc-500'
            }`}
          >
            السلة ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>

        {/* LEFT COLUMN: Catalog List */}
        <div className={`flex-grow md:w-[60%] flex flex-col p-4 md:p-6 overflow-hidden ${mobileTab === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
          <div className="flex gap-4 mb-4 shrink-0">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو SKU..." 
              className="flex-grow border border-[var(--color-ivory-200)] bg-white rounded px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-[var(--color-rose-600)]"
            />
          </div>

          <div className="flex-grow overflow-y-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-2">
            {filteredProducts.map((product) => {
              const lowestPrice = product.variants.length > 0
                ? Math.min(...product.variants.map((v: any) => v.price))
                : 0;

              return (
                <button 
                  key={product.id} 
                  onClick={() => handleSelectProduct(product)}
                  className="bg-white rounded-lg border border-[var(--color-ivory-200)] shadow-sm hover:border-[var(--color-rose-600)] hover:shadow transition-all text-right flex flex-col justify-between active:scale-95 duration-100 animate-fade-in overflow-hidden h-64"
                >
                  <div className="w-full h-40 bg-zinc-50 relative flex items-center justify-center border-b border-zinc-100 overflow-hidden">
                    {product.imageUrl ? (
                       <img src={product.imageUrl.startsWith('local://') ? product.imageUrl.replace('local://', '/') : product.imageUrl} alt={product.nameAr} className="w-full h-full object-contain p-2" />
                    ) : (
                       <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
                         <span className="text-zinc-400 font-bold text-xs">صورة</span>
                       </div>
                    )}
                  </div>
                  
                  <div className="p-3 flex flex-col justify-between flex-1 w-full">
                    <span className="font-bold text-zinc-900 text-xs md:text-sm line-clamp-1 leading-tight">
                      {product.nameAr}
                    </span>
                    {product.brandName && (
                      <span className="text-xs text-zinc-500 mt-0.5 block">{product.brandName}</span>
                    )}
                    
                    <div className="mt-1 w-full pt-1.5 border-t border-zinc-50 flex justify-between items-end">
                      <span className="text-[var(--color-rose-600)] font-bold text-xs">
                        {(lowestPrice / 1000).toFixed(3)} د.أ
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {product.variants.length} درجات
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Cart */}
        <div className={`w-full md:w-[40%] md:max-w-md bg-white border-r border-[var(--color-ivory-200)] flex flex-col h-full shadow-lg ${mobileTab === 'cart' ? 'flex' : 'hidden md:flex'}`}>
          <div className="p-3 border-b border-zinc-100 shrink-0">
            <input 
              type="text" 
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="اسم العميل" 
              className="w-full border border-zinc-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-rose-600)]"
            />
          </div>

          <div className="flex-grow overflow-y-auto p-3 space-y-3">
            {cart.map((item) => (
              <div key={item.variantId} className="flex gap-3 border-b pb-3 text-xs md:text-sm">
                <div className="flex-grow">
                  <div className="flex items-center gap-2">
                    {item.colorHex && (
                      <span className="w-3 h-3 rounded-full border border-zinc-200" style={{ backgroundColor: item.colorHex }} />
                    )}
                    <h4 className="font-bold text-zinc-900">{item.productName}</h4>
                  </div>
                  <p className="text-[10px] text-zinc-500">{item.variantName} | SKU: {item.sku}</p>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center border rounded">
                      <button onClick={() => handleUpdateQty(item.variantId, -1)} className="px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 font-bold">-</button>
                      <span className="px-3 font-bold">{item.quantity}</span>
                      <button onClick={() => handleUpdateQty(item.variantId, 1)} className="px-2 py-0.5 bg-zinc-50 hover:bg-zinc-100 font-bold">+</button>
                    </div>
                    <span className="font-bold text-[var(--color-rose-600)]">
                      {((item.price * item.quantity) / 1000).toFixed(3)} د.أ
                    </span>
                  </div>
                </div>
                <button onClick={() => handleRemoveItem(item.variantId)} className="text-red-500 hover:text-red-700 text-xs self-start">إزالة</button>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 py-12">
                <span className="text-xs">السلة فارغة</span>
              </div>
            )}
          </div>

          <div className="bg-zinc-50 p-4 border-t space-y-3 shrink-0">
            <div className="space-y-2 text-xs md:text-sm text-zinc-600">
              <div className="flex justify-between">
                <span>المجموع الفرعي</span>
                <span>{(getSubtotal() / 1000).toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between items-center">
                <span>الخصم</span>
                <input 
                  type="number" 
                  step="0.1"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="w-20 border border-zinc-300 rounded px-2 py-0.5 text-left text-xs outline-none focus:ring-1 focus:ring-[var(--color-rose-600)]"
                />
              </div>
              {taxEnabled && (
                <div className="flex justify-between">
                  <span>الضريبة ({taxRate}%)</span>
                  <span>{(getTax() / 1000).toFixed(3)} د.أ</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-zinc-900 pt-1.5 border-t">
                <span>الإجمالي</span>
                <span className="text-lg text-[var(--color-charcoal-900)]">
                  {(getGrandTotal() / 1000).toFixed(3)} د.أ
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs md:text-sm font-bold">
              <button onClick={() => setPaymentMethod('CASH')} className={`py-2 border rounded transition-colors ${paymentMethod === 'CASH' ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}>نقدي</button>
              <button onClick={() => setPaymentMethod('CARD')} className={`py-2 border rounded transition-colors ${paymentMethod === 'CARD' ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' : 'bg-white text-zinc-700 border-zinc-300'}`}>بطاقة</button>
            </div>

            {paymentMethod === 'CASH' && (
              <div className="space-y-2 text-xs border-t pt-2">
                <div className="flex justify-between items-center">
                  <span>المبلغ المستلم نقداً</span>
                  <input type="number" step="0.01" value={amountTendered} onChange={(e) => setAmountTendered(e.target.value)} placeholder={(getGrandTotal() / 1000).toFixed(3)} className="w-24 border border-zinc-300 rounded px-2 py-1 text-left outline-none focus:ring-1 focus:ring-[var(--color-rose-600)]" />
                </div>
                <div className="flex justify-between font-bold text-amber-700">
                  <span>الباقي للعميل</span>
                  <span>{(getChange() / 1000).toFixed(3)} د.أ</span>
                </div>
              </div>
            )}

            <button onClick={handleCheckout} disabled={isPending || cart.length === 0} className="w-full bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white font-bold py-3 rounded transition-colors disabled:opacity-50 text-base">
              {isPending ? 'جاري الدفع...' : 'تأكيد الدفع'}
            </button>
          </div>
        </div>
      </div>

      {/* CHECKOUT SUCCESS DIALOG */}
      {checkoutResult && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-zinc-900">تم إتمام الفاتورة بنجاح</h2>
              {checkoutResult.orderNumber && <p className="text-sm text-zinc-500 mt-2 font-mono">رقم الطلب: {checkoutResult.orderNumber}</p>}
            </div>
            <div className="flex gap-3 pt-4">
              <button onClick={() => setCheckoutResult(null)} className="flex-1 bg-[var(--color-charcoal-900)] text-white font-bold py-2.5 rounded transition-colors hover:bg-[var(--color-charcoal-800)]">
                طلب جديد
              </button>
              <button onClick={() => window.print()} className="flex-1 bg-zinc-100 text-zinc-800 font-bold py-2.5 rounded transition-colors hover:bg-zinc-200">
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT DETAILS DIALOG */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in">
          <div className="bg-white rounded-t-2xl md:rounded-lg p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-[var(--color-charcoal-900)]">{selectedProduct.nameAr}</h3>
                <span className="text-[10px] text-zinc-400">SKU: {selectedProduct.sku}</span>
              </div>
              <button onClick={() => setSelectedProduct(null)} className="text-zinc-400 hover:text-zinc-600 text-xl font-bold px-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedProduct.shortDescription && (
              <p className="text-xs text-zinc-650 leading-relaxed bg-zinc-50 p-2.5 rounded border border-zinc-100">
                {selectedProduct.shortDescription}
              </p>
            )}

            <div className="space-y-2 pt-3 border-t">
              <h4 className="text-xs font-bold text-neutral-800">اختر الدرجة للإضافة للسلة:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedProduct.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleAddVariant(v)}
                    disabled={!v.isActive || v.stock <= 0}
                    className="flex flex-col items-center justify-center p-3 border border-zinc-200 rounded-lg hover:border-[var(--color-rose-600)] hover:bg-rose-50 transition-all text-center disabled:opacity-40 active:scale-95"
                  >
                    {v.colorHex && (
                      <div className="w-6 h-6 rounded-full mb-2 shadow-sm border border-zinc-200" style={{ backgroundColor: v.colorHex }} />
                    )}
                    <span className="font-bold text-zinc-900 text-sm line-clamp-1">{v.name}</span>
                    <span className="text-xs text-[var(--color-rose-600)] font-bold mt-1">{(v.price / 1000).toFixed(3)} د.أ</span>
                    <span className="text-[10px] text-zinc-500 mt-1">المخزون: {v.stock}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IDLE / LOCK OVERLAYS */}
      {isLocked && (
        <div className="fixed inset-0 bg-neutral-950/95 z-55 flex flex-col items-center justify-center p-6 text-white text-center">
          <div className="max-w-sm w-full space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold font-heading text-[var(--color-rose-400)]">شاشة POS مقفلة</h2>
              <p className="text-xs text-neutral-400">يرجى إدخال كلمة المرور للمتابعة</p>
            </div>
            <div className="space-y-4">
              <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleUnlockAction()} placeholder="كلمة المرور" className="w-full text-center tracking-widest text-2xl bg-neutral-900 border border-neutral-700 rounded py-3 outline-none text-white focus:border-[var(--color-rose-600)]" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleUnlockAction} disabled={isPending} className="bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white py-3 rounded font-bold text-sm transition-colors disabled:opacity-50">
                  {isPending ? 'جاري التحقق...' : 'فتح الشاشة'}
                </button>
                <button onClick={handleLogoutAction} className="bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white py-3 rounded font-bold text-sm transition-colors">
                  خروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isIdle && (
        <div className="fixed inset-0 z-54 flex flex-col items-center justify-end pb-6 p-4 text-white text-center animate-fade-in select-none bg-zinc-900">
          <div className="relative z-10 w-full space-y-3 flex flex-col items-center drop-shadow-2xl">
            <div className="space-y-1">
              {posIdleShowClock && <h1 className="text-3xl md:text-4xl font-mono tracking-wider font-extrabold text-[var(--color-rose-400)]">{currentTime}</h1>}
              {posIdleShowDate && <p className="text-sm md:text-base text-neutral-200 font-medium">{currentDate}</p>}
            </div>
            <div className="text-lg md:text-xl font-bold text-white animate-pulse">
              انقر للمتابعة
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POSCashierWorkspace;
