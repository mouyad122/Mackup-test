'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { processCheckout } from '@/actions/checkout';
import { filsToDisplay } from '@/lib/money';
import Link from 'next/link';
import { FileText } from 'lucide-react';

export default function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const [state, formAction, isPending] = useActionState(processCheckout, null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [rewardRules, setRewardRules] = useState<{ name: string; minimumAmount: number; rewardType: string; rewardValue: number }[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [isOrderConfirmed, setIsOrderConfirmed] = useState(false);
  const [confirmedRef, setConfirmedRef] = useState<string>('');
  const [isDuplicatePrevented, setIsDuplicatePrevented] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const isSubmittingRef = React.useRef(false);

  useEffect(() => {
    // Generate unique idempotency key on mount
    setIdempotencyKey(`rq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

    const loadCart = () => {
      try {
        const saved = localStorage.getItem('makeup_cart');
        setCartItems(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };

    loadCart();
    
    // Fetch shipping zones
    fetch('/api/shipping-zones')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.zones) {
          setZones(data.zones);
          if (data.zones.length > 0) {
            setSelectedZoneId(data.zones[0].id);
          }
        }
      })
      .catch(console.error);
    fetch('/api/cart-rewards').then(res => res.json()).then(data => setRewardRules(data.rules || [])).catch(() => setRewardRules([]));

    setMounted(true);

    // Keep cart in sync if user navigates back or another tab changes cart
    const handleCartUpdate = () => loadCart();
    window.addEventListener('cart_updated', handleCartUpdate);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'makeup_cart') loadCart();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', loadCart);

    return () => {
      window.removeEventListener('cart_updated', handleCartUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadCart);
    };
  }, []);

  // Cooldown countdown interval
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      // Clear cart on success immediately
      localStorage.removeItem('makeup_cart');
      window.dispatchEvent(new CustomEvent('cart_updated'));
      if ('reference' in state && typeof state.reference === 'string') {
        setConfirmedRef(state.reference);
        try {
          localStorage.setItem('rawaq_active_order', JSON.stringify({
            reference: state.reference,
            customerName: 'customerName' in state ? state.customerName : '',
            createdAt: Date.now(),
          }));
          window.dispatchEvent(new CustomEvent('rawaq_order_updated'));
        } catch (e) {}
      }
      if ('isDuplicatePrevented' in state && state.isDuplicatePrevented) {
        setIsDuplicatePrevented(true);
      }
      setIsOrderConfirmed(true);
      setIsSubmittingLocal(false);
      isSubmittingRef.current = false;
    } else if (state && 'error' in state && state.error) {
      setIsSubmittingLocal(false);
      isSubmittingRef.current = false;
      // Impose a 10-second cooldown lock before customer can click confirm again
      setCooldown(10);
      // Re-generate fresh idempotency key for deliberate next attempt
      setIdempotencyKey(`rq-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    }
  }, [state]);

  const removeItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
    localStorage.setItem('makeup_cart', JSON.stringify(updated));
    // Dispatch both custom and standard events for consistency
    window.dispatchEvent(new CustomEvent('cart_updated'));
    window.dispatchEvent(new Event('cart_updated'));
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('makeup_cart');
    // Dispatch both custom and standard events for consistency
    window.dispatchEvent(new CustomEvent('cart_updated'));
    window.dispatchEvent(new Event('cart_updated'));
  };

  const getSubtotal = () => {
    return cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  };

  const getSelectedZone = () => {
    return zones.find(z => z.id === selectedZoneId);
  };

  const getShippingFee = () => {
    const zone = getSelectedZone();
    if (!zone) return 0;
    const subtotal = getSubtotal();
    const freeReward = rewardRules.some(rule => rule.rewardType === 'FREE_DELIVERY' && subtotal >= rule.minimumAmount);
    if ((zone.freeShippingThreshold && subtotal >= zone.freeShippingThreshold) || freeReward) {
      return 0;
    }
    return zone.fee;
  };

  const getRewardDiscount = () => {
    const subtotal = getSubtotal();
    const eligible = rewardRules.filter(rule => rule.rewardType !== 'FREE_DELIVERY' && subtotal >= rule.minimumAmount);
    return Math.max(0, ...eligible.map(rule => rule.rewardType === 'PERCENT'
      ? Math.floor(subtotal * Math.min(rule.rewardValue, 100) / 100)
      : Math.min(subtotal, rule.rewardValue)));
  };

  const getBestReward = () => rewardRules.filter(rule => getSubtotal() >= rule.minimumAmount).at(-1);

  const getGrandTotal = () => {
    return Math.max(0, getSubtotal() - getRewardDiscount()) + getShippingFee();
  };

  const isBelowMinimum = getSubtotal() < 5000;

  if (!mounted) return null;

  return (
    <div className="container mx-auto px-6 py-12 bg-[var(--color-ivory-100)] min-h-screen">
      <h1 className="text-3xl font-bold font-heading text-[#3F4832] mb-8">
        {isAr ? 'إتمام الشراء' : 'Checkout'}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Delivery Form */}
        <div>
          <form 
            action={formAction} 
            onSubmit={(e) => {
              if (isSubmittingRef.current || isPending || isSubmittingLocal || isOrderConfirmed || cooldown > 0) {
                e.preventDefault();
                return;
              }
              isSubmittingRef.current = true;
              setIsSubmittingLocal(true);
            }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-[#E9DDCC]"
          >
            <h2 className="text-xl font-bold text-[#2B2B2B] mb-6 font-heading">
              {isAr ? 'تفاصيل التوصيل' : 'Delivery Details'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  {isAr ? 'الاسم الكامل' : 'Full Name'}
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  required
                  className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none transition-all"
                />
              </div>
              
              <div>
                <label htmlFor="customerPhone" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  {isAr ? 'رقم الهاتف (الأردن)' : 'Phone Number (Jordan)'}
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  required
                  dir="ltr"
                  placeholder="07XXXXXXXX"
                  className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 text-right focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="addressStreet" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    {isAr ? 'الشارع' : 'Street'}
                  </label>
                  <input
                    type="text"
                    id="addressStreet"
                    name="addressStreet"
                    required
                    placeholder={isAr ? 'اسم الشارع' : 'Street name'}
                    className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="addressBuilding" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                    {isAr ? 'البناية / المنزل' : 'Building / House'}
                  </label>
                  <input
                    type="text"
                    id="addressBuilding"
                    name="addressBuilding"
                    required
                    placeholder={isAr ? 'رقم البناية أو الاسم' : 'Building number or name'}
                    className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="addressApartment" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  {isAr ? 'رقم الشقة / الطابق (اختياري)' : 'Apartment / Floor (Optional)'}
                </label>
                <input
                  type="text"
                  id="addressApartment"
                  name="addressApartment"
                  placeholder={isAr ? 'الشقة، الطابق، تفاصيل إضافية...' : 'Apartment, floor, extra details...'}
                  className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none transition-all"
                />
              </div>

              <div>
                <label htmlFor="shippingZoneId" className="block text-sm font-medium text-[#2B2B2B] mb-1.5">
                  {isAr ? 'منطقة التوصيل' : 'Shipping Zone'}
                </label>
                <select
                  id="shippingZoneId"
                  name="shippingZoneId"
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  className="w-full border border-[#E9DDCC] rounded-xl px-4 py-2.5 focus:border-[#3F4832] focus:ring-2 focus:ring-[#3F4832]/20 outline-none bg-white text-[#2B2B2B] transition-all"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {isAr ? zone.nameAr : zone.nameEn}
                    </option>
                  ))}
                </select>
              </div>



              {/* Hidden payload inputs */}
              <input type="hidden" name="items" value={JSON.stringify(cartItems)} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
            </div>

            {state && 'error' in state && state.error && (
              <div className="mt-6 p-4 bg-red-50 text-red-600 rounded text-sm font-bold">
                {state.error}
              </div>
            )}

            {isBelowMinimum && (
              <div className="mt-6 p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-sm leading-relaxed text-center font-bold">
                <p>
                  {isAr 
                    ? `الحد الأدنى للطلب هو 5 د.أ (مجموع طلبك الحالي: ${filsToDisplay(getSubtotal(), 'ar')})`
                    : `Minimum order amount is 5 JOD (Your current total: ${filsToDisplay(getSubtotal(), 'en')})`}
                </p>
                <Link href={`/${locale}/shop`} className="text-amber-700 underline text-xs block mt-1">
                  {isAr ? 'اضغطي هنا لإضافة منتجات إلى سلتك ←' : 'Click here to add more items to your cart ←'}
                </Link>
              </div>
            )}

            {/* شروط وأحكام الشراء وسياسة الإرجاع المتوافقة مع القانون الأردني */}
            <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-[#FBF8F2] border border-[#E9DDCC] space-y-3.5 text-right">
              <div className="flex items-start gap-2.5">
                <span className="text-amber-700 text-base shrink-0 mt-0.5">⚠️</span>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-[#3F4832] font-heading">
                    {isAr ? 'مهم قبل تأكيد طلبكِ:' : 'Important before confirming your order:'}
                  </h4>
                  <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed mt-1">
                    {isAr
                      ? 'المنتجات المستخدمة أو التي فُتحت أختام الحماية والتغليف الصحي الخاص بها لا تشملها الإرجاعات الاختيارية، مع حفظ كامل الحقوق القانونية المتعلقة بالعيوب أو عدم المطابقة وفق قانون حماية المستهلك الأردني.'
                      : 'Products used or with protective/hygiene seals opened are not eligible for voluntary returns, without prejudice to statutory consumer rights for defects or non-conformity.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E9DDCC]/70">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    value="true"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    required
                    className="mt-1 w-4 h-4 rounded border-stone-300 text-[#3F4832] focus:ring-[#3F4832] cursor-pointer accent-[#3F4832]"
                  />
                  <span className="text-xs sm:text-sm font-medium text-stone-800 leading-snug">
                    {isAr
                      ? 'أقرّ بأنني اطّلعت على شروط وأحكام الشراء وسياسة الاستبدال والإرجاع وأوافق عليها.'
                      : 'I acknowledge that I have read and agree to the Terms of Purchase and Returns Policy.'}
                  </span>
                </label>
              </div>

              <div className="text-left flex items-center justify-between text-xs">
                <span className="text-[10px] text-stone-500 font-mono">الإصدار: JO-2026-v1.0</span>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#3F4832] hover:text-[#B7935F] font-bold underline inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isAr ? 'قراءة السياسات والشروط كاملة 📄' : 'Read full Terms & Policies 📄'}</span>
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="submit"
                disabled={isPending || isSubmittingLocal || isOrderConfirmed || cooldown > 0 || cartItems.length === 0 || isBelowMinimum || !termsAccepted}
                className="w-full btn-rawaq-primary py-4 rounded-full text-base font-bold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {!termsAccepted ? (
                  <span>{isAr ? 'يجب الموافقة على الشروط للمتابعة' : 'Please accept terms to proceed'}</span>
                ) : isOrderConfirmed ? (
                  <>
                    <span className="inline-block animate-pulse">✓</span>
                    <span>{isAr ? 'تم تأكيد طلبك بنجاح!' : 'Order Placed Successfully!'}</span>
                  </>
                ) : (isPending || isSubmittingLocal) ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>{isAr ? 'جاري تأكيد وتجهيز الطلب... يرجى الانتظار' : 'Processing your order... Please wait'}</span>
                  </>
                ) : cooldown > 0 ? (
                  <span>{isAr ? `يرجى الانتظار (${cooldown} ثوانٍ) قبل إعادة المحاولة` : `Please wait (${cooldown}s) before retrying`}</span>
                ) : (
                  <span>{isAr ? 'تأكيد الطلب الآن' : 'Confirm Order Now'}</span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-zinc-500 font-medium text-center">
                <span>🛡️</span>
                <span>{isAr ? 'نظام حماية الطلب المزدوج مفعّل: لن يتم تسجيل أو تكرار طلبك أكثر من مرة.' : 'Double-order protection active: Your order will never be duplicated.'}</span>
              </div>
            </div>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white p-8 rounded-2xl border border-[#E9DDCC] shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-[#2B2B2B] font-heading">
                {isAr ? 'ملخص الطلب' : 'Order Summary'}
              </h2>
              {cartItems.length > 0 && (
                <button 
                  onClick={clearCart}
                  className="text-sm text-red-500 hover:text-red-700 underline font-bold"
                >
                  {isAr ? 'إفراغ السلة' : 'Empty Cart'}
                </button>
              )}
            </div>
            
            {cartItems.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                {isAr ? 'السلة فارغة.' : 'Your cart is empty.'}{' '}
                <Link href={`/${locale}/shop`} className="text-[var(--color-champagne-600)] underline">
                  {isAr ? 'تسوق الآن' : 'Shop now'}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <div>
                      <h4 className="font-bold text-zinc-900">{item.name}</h4>
                      <p className="text-xs text-zinc-500">
                        {item.size} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-zinc-700">
                        {filsToDisplay(item.price * item.quantity, isAr ? 'ar' : 'en')}
                      </span>
                      <button 
                        onClick={() => removeItem(idx)}
                        className="text-xs text-red-400 hover:text-red-600 font-bold"
                        title={isAr ? 'حذف العنصر' : 'Remove item'}
                      >
                        {isAr ? 'حذف' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 space-y-2 border-t border-zinc-200">
                  <div className="flex justify-between text-zinc-600">
                    <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                    <span>{filsToDisplay(getSubtotal(), isAr ? 'ar' : 'en')}</span>
                  </div>
                  {getRewardDiscount() > 0 && <div className="flex justify-between text-emerald-800"><span>{isAr ? `مكافأة: ${getBestReward()?.name || ''}` : `Reward: ${getBestReward()?.name || ''}`}</span><span>−{filsToDisplay(getRewardDiscount(), isAr ? 'ar' : 'en')}</span></div>}
                  <div className="flex justify-between text-zinc-600">
                    <span>{isAr ? 'رسوم التوصيل' : 'Shipping Fee'}</span>
                    <span>
                      {getShippingFee() > 0 
                        ? filsToDisplay(getShippingFee(), isAr ? 'ar' : 'en') 
                        : (isAr ? 'شحن مجاني' : 'Free Shipping')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-[#3F4832] pt-2 border-t">
                    <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                    <span>{filsToDisplay(getGrandTotal(), isAr ? 'ar' : 'en')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* نافذة تأكيد الطلب بنجاح */}
      {isOrderConfirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" dir="rtl">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#E9DDCC] text-center space-y-5 animate-scale-up">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl shadow-xs">
              ✓
            </div>
            
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-[#2B2B2B] font-heading">
                {isAr ? 'تم استلام طلبكِ بنجاح!' : 'Order Placed Successfully!'}
              </h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                {isAr
                  ? 'شكراً لتسوقكِ من رَواق. طلبكِ الآن قيد المراجعة، وسيتم إرسال الفاتورة وتفاصيل التأكيد على واتساب قريباً.'
                  : 'Thank you for shopping at Rawaq. Your order is under review, and details will be sent to your WhatsApp shortly.'}
              </p>
            </div>

            <div className="p-4 bg-[#FBF8F2] rounded-2xl border border-[#E9DDCC] text-stone-800 space-y-3 text-sm text-right">
              {confirmedRef && (
                <div className="flex justify-between items-center border-b border-[#E9DDCC] pb-2">
                  <span className="text-xs text-stone-500 font-bold">{isAr ? 'رقم الطلب:' : 'Order Ref:'}</span>
                  <span className="font-mono font-black text-[#3F4832] text-base">#{confirmedRef}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-[#E9DDCC] pb-2">
                <span className="text-xs text-stone-500 font-bold">{isAr ? 'الحالة:' : 'Status:'}</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>{isAr ? 'بانتظار مراجعة الإدارة' : 'Pending Admin Review'}</span>
                </span>
              </div>

              {isDuplicatePrevented && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 font-medium leading-relaxed">
                  🛡️ {isAr ? 'لديكِ طلب مطابق قيد المراجعة بالفعل. تم استرجاع تفاصيل طلبكِ لحمايتكِ من تكرار المشتريات.' : 'You already have an active matching order. Details retrieved safely.'}
                </div>
              )}

              <div className="flex items-start gap-2.5 text-xs text-stone-600 bg-white border border-[#E9DDCC] p-3 rounded-xl leading-relaxed">
                <span className="text-base shrink-0">💬</span>
                <span>
                  {isAr 
                    ? 'لا تحتاجين لإعادة إرسال الطلب. سيتم التواصل معكِ عند تأكيده.' 
                    : 'No need to resend the order. We will contact you once confirmed.'}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {confirmedRef && (
                <a
                  href={`/${locale}/invoice/${confirmedRef}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-full text-sm font-bold bg-[#3F4832] hover:bg-[#2e3524] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4 text-[#B7935F]" />
                  <span>{isAr ? 'عرض الفاتورة الإلكترونية المباشرة' : 'View Digital Invoice'}</span>
                </a>
              )}
              {confirmedRef && (
                <Link
                  href={`/${locale}/order-status/${confirmedRef}`}
                  className="w-full btn-rawaq-primary py-3 rounded-full text-sm font-bold shadow-sm hover:shadow-md transition-all block text-center"
                >
                  {isAr ? 'متابعة حالة الطلب' : 'Track My Order Status'}
                </Link>
              )}
              <Link
                href={`/${locale}/shop`}
                className="w-full py-2.5 rounded-full text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 font-bold transition block text-center"
              >
                {isAr ? 'متابعة التسوق في المتجر' : 'Continue Shopping'}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* نافذة استعراض الشروط والأحكام وسياسة الإرجاع كاملة */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs animate-fade-in"
          dir={isAr ? 'rtl' : 'ltr'}
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-[#E9DDCC] flex flex-col overflow-hidden animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-[#3F4832] text-white flex items-center justify-between border-b border-[#B7935F]/40">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-[#D9C6A8] uppercase block">
                  {isAr ? 'وثيقة رسمية معتمدة — JO-2026-v1.0' : 'OFFICIAL DOCUMENT — JO-2026-v1.0'}
                </span>
                <h3 className="text-lg sm:text-xl font-bold font-heading mt-0.5">
                  {isAr ? 'الشروط والأحكام وسياسة الشراء والاستبدال والإرجاع' : 'Terms of Purchase & Returns Policy'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg font-bold transition cursor-pointer"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-sm text-[#4A4643] leading-relaxed">
              <div className="p-4 rounded-2xl bg-[#FBF8F2] border border-[#E9DDCC] space-y-2">
                <div className="font-bold text-[#3F4832] flex items-center gap-1.5 text-xs sm:text-sm">
                  <span>⚖️</span>
                  <span>{isAr ? 'ضوابط فتح المنتجات وحماية المستهلك الأردني' : 'Jordan Consumer Protection Compliance'}</span>
                </div>
                <p className="text-xs text-stone-600 leading-normal">
                  {isAr
                    ? 'حرصاً على سلامتكِ وصحتكِ، المنتجات التي تم فتح أختام حمايتها أو استخدامها لا تشملها الإرجاعات الاختيارية، مع حفظ كامل حقوقكِ القانونية المكفولة بموجب قانون حماية المستهلك الأردني رقم (7) لسنة 2017 عند وجود أي عيب مصنعي أو عدم مطابقة.'
                    : 'For your health and safety, unsealed or used items are not eligible for voluntary returns, while fully preserving statutory rights for defects or non-conformity under Jordanian Consumer Protection Law No. 7 of 2017.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 1: التعريف بالمنصة' : 'Article 1: Platform Definition'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'رَواق منصة إلكترونية أردنية متعددة الموردين، تتيح للعملاء شراء منتجات متنوعة من محلات وموردين مستقلين عبر موقع إلكتروني موحد، وتتولى تنظيم الفواتير والتجهيز وخدمة العملاء.' : 'Rawaq is a Jordanian multi-vendor platform connecting customers with curated merchants.'}</p>
                </div>

                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 2: تأكيد الطلب' : 'Article 2: Order Placement'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'يُعد تقديم الطلب إقراراً بصحة البيانات والموافقة على الشروط. تخضع الطلبات للتحقق من التوفر ويتم التواصل مع العميلة لتأكيد الجاهزية والتوصيل.' : 'Order placement constitutes formal agreement to terms and confirmation of accurate details.'}</p>
                </div>

                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 3: سياسة فتح المنتجات واستخدامها' : 'Article 3: Opened Products Policy'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'لا تقبل رَواق الإرجاع الاختياري للمنتجات المستخدمة أو منزوعة أختام الحماية أو التغليف الصحي، خصوصاً مستحضرات التجميل والعطور، مع حفظ حقوق العيوب المصنعية قانوناً.' : 'Opened or used cosmetic and fragrance items cannot be voluntarily returned.'}</p>
                </div>

                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 4: الاستبدال والإرجاع الاختياري' : 'Article 4: Voluntary Returns'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'العدول عن الشراء متاح خلال 3 أيام للأصناف المؤهلة شريطة بقائها مغلقة بتغليفها الأصلي، وتتحمل العميلة أجور التوصيل المترتبة على ذلك.' : 'Voluntary returns require pristine unopened condition; courier fees apply.'}</p>
                </div>

                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 5: المنتجات المعيبة أو غير المطابقة' : 'Article 5: Defective Items'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'يحق للعميلة الاستبدال أو رد الثمن عملاً بالمادتين 6 و 7 من قانون حماية المستهلك الأردني عند ثبوت العيب أو عدم المطابقة، ولا يُمنع الحق لمجرد فتح العبوة الخارجية اللازمة للفحص.' : 'Statutory remedies apply for defective or non-conforming items under Jordanian law.'}</p>
                </div>

                <div className="border-b border-stone-150 pb-3">
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 6: إجراءات الشكاوى والتوصيل' : 'Article 6: Complaints & Delivery'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'يتم التوصيل عبر شركات معتمدة، ويُرجى التواصل مع خدمة عملاء رَواق برقم الطلب والصور لأي شكوى لسرعة معالجتها.' : 'Deliveries handled by licensed couriers; support available via WhatsApp.'}</p>
                </div>

                <div>
                  <h4 className="font-bold text-[#3F4832] mb-1">{isAr ? 'المادة 7: القانون الواجب التطبيق' : 'Article 7: Governing Law'}</h4>
                  <p className="text-xs text-stone-600">{isAr ? 'تخضع هذه الشروط والسياسات وتُفسر حصراً وفق القوانين والتشريعات النافذة في المملكة الأردنية الهاشمية.' : 'Governed exclusively by the laws of the Hashemite Kingdom of Jordan.'}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href={`/${locale}/terms`}
                target="_blank"
                className="text-xs text-[#3F4832] underline hover:text-[#B7935F] font-bold"
              >
                {isAr ? 'فتح صفحة الشروط المستقلة في نافذة جديدة ←' : 'Open standalone Terms page in new tab ←'}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setTermsAccepted(true);
                  setShowTermsModal(false);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#3F4832] hover:bg-[#2e3524] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer"
              >
                {isAr ? 'أوافق على الشروط والأحكام والمتابعة ✓' : 'I Agree to the Terms & Proceed ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
