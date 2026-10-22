'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';

export default function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const resolvedParams = React.use(params);
  const locale = resolvedParams.locale;
  const isAr = locale === 'ar';

  const [cart, setCart] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [rewardRules, setRewardRules] = useState<{ name: string; minimumAmount: number; rewardType: string; rewardValue: number }[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  useEffect(() => {
    const loadCart = () => {
      try {
        const saved = localStorage.getItem('makeup_cart');
        setCart(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };
    loadCart();
    fetch('/api/cart-rewards').then(res => res.json()).then(data => setRewardRules(data.rules || [])).catch(() => setRewardRules([]));
    fetch('/api/shipping-zones').then(res => res.json()).then(data => {
      if (data.success && data.zones) {
        setZones(data.zones);
        if (data.zones.length > 0) setSelectedZoneId(data.zones[0].id);
      }
    }).catch(console.error);
    setMounted(true);

    window.addEventListener('cart_updated', loadCart);
    const handleStorage = (e: StorageEvent) => { if (e.key === 'makeup_cart') loadCart(); };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', loadCart);

    return () => {
      window.removeEventListener('cart_updated', loadCart);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', loadCart);
    };
  }, []);

  const updateQuantity = (sku: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.sku === sku) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setCart(updated);
    localStorage.setItem('makeup_cart', JSON.stringify(updated));
  };

  const removeFromCart = (sku: string) => {
    const updated = cart.filter(item => item.sku !== sku);
    setCart(updated);
    localStorage.setItem('makeup_cart', JSON.stringify(updated));
  };

  const getSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const subtotal = getSubtotal();
  const unlockedReward = [...rewardRules].filter(rule => subtotal >= rule.minimumAmount).at(-1);
  const unlockedFreeDelivery = rewardRules.some(rule => rule.rewardType === 'FREE_DELIVERY' && subtotal >= rule.minimumAmount);
  const nextReward = rewardRules.find(rule => subtotal < rule.minimumAmount);
  const rewardProgress = nextReward
    ? Math.min(100, Math.round((subtotal / nextReward.minimumAmount) * 100))
    : rewardRules.length ? 100 : 0;

  const getShippingFee = () => {
    const zone = zones.find(z => z.id === selectedZoneId);
    if (!zone) return 0;
    if ((zone.freeShippingThreshold && subtotal >= zone.freeShippingThreshold) || unlockedFreeDelivery) {
      return 0;
    }
    return zone.fee;
  };

  const shippingFee = getShippingFee();
  const grandTotal = subtotal + shippingFee;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#F7F3EA] pb-24">
      {/* Header Pattern */}
      <div className="bg-[#3F4832] py-16 relative overflow-hidden border-b border-[#B7935F]/60 text-center text-white">
        <p className="rawaq-eyebrow text-[#B7935F]">SHOPPING CART</p>
        <h1 className="mt-4 text-4xl md:text-5xl !text-white">{isAr ? 'سلة المشتريات' : 'Your Cart'}</h1>
      </div>

      <div className="mx-auto max-w-6xl px-5 sm:px-8 -mt-8 relative z-10">
        {cart.length === 0 ? (
          <div className="rounded-3xl border border-[#E9DDCC] bg-white p-16 text-center shadow-sm">
            <span aria-hidden="true" className="block text-6xl text-[#B7935F]/30 mb-6">✦</span>
            <h2 className="text-2xl font-bold text-[#2B2B2B] mb-3">{isAr ? 'سلتك فارغة' : 'Your cart is empty'}</h2>
            <p className="text-[#746A64] mb-8">{isAr ? 'اكتشفي مجموعة رَواق الرائعة.' : 'Discover the beautiful Rawaq collection.'}</p>
            <Link href={`/${locale}/shop`} className="btn-rawaq-primary">{isAr ? 'تسوّقي الآن' : 'Shop Now'}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8">
            
            {/* Cart Items */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-[#E9DDCC] bg-white p-6 sm:p-8 shadow-[0_4px_16px_rgba(139,30,45,.03)]">
                
                {rewardRules.length > 0 && (
                  <div className="flex items-center gap-6 border-b border-[#E9DDCC] pb-6 mb-6">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" className="stroke-[#F7F3EA]" strokeWidth="4" />
                        <circle cx="18" cy="18" r="16" fill="none" className={`stroke-current ${rewardProgress >= 100 ? 'text-[#3F4832]' : 'text-[#B7935F]'} transition-all duration-700`} strokeWidth="4" strokeDasharray="100" strokeDashoffset={Math.max(0, 100 - rewardProgress)} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-[#2B2B2B]">{rewardProgress}%</div>
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[#2B2B2B]">
                        {rewardProgress >= 100 ? (unlockedReward?.name || (isAr ? 'تم تفعيل المكافأة!' : 'Reward Unlocked!')) : (nextReward?.name || (isAr ? 'مكافأة قريبة' : 'Upcoming Reward'))}
                      </h3>
                      <p className="text-sm text-[#746A64] mt-1">
                        {rewardProgress >= 100 
                          ? (isAr ? 'لقد حصلت على المكافأة بنجاح.' : 'You have unlocked this reward.')
                          : nextReward && (isAr ? `أضف بقيمة ${filsToDisplay(nextReward.minimumAmount - subtotal, 'ar')} للحصول عليها.` : `Add ${filsToDisplay(nextReward.minimumAmount - subtotal, 'en')} more to unlock.`)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-8">
                  {cart.map(item => (
                    <div key={item.sku} className="flex gap-4 sm:gap-6">
                      <div className="w-24 h-32 rounded-xl border border-[#E9DDCC] bg-[#F7F3EA] flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${item.image.startsWith('local://') ? item.image.replace('local://','/') : item.image})` }} />
                        ) : <span className="text-[#A69A8C]">✦</span>}
                      </div>

                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="font-bold text-[#2B2B2B] leading-snug">{item.name}</h3>
                            <button onClick={() => removeFromCart(item.sku)} className="text-[#A69A8C] hover:text-[#3F4832] transition-colors p-1" aria-label="Remove">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                            </button>
                          </div>
                          <p className="text-sm text-[#746A64] mt-1">{item.size}</p>
                        </div>

                        <div className="flex justify-between items-end mt-4">
                          <div className="flex items-center rounded-full border border-[#E9DDCC] bg-[#FBF8F2] p-1">
                            <button onClick={() => updateQuantity(item.sku, -1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#2B2B2B] hover:bg-white hover:shadow-sm transition-all">−</button>
                            <span className="w-8 text-center text-sm font-bold text-[#2B2B2B]">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.sku, 1)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#2B2B2B] hover:bg-white hover:shadow-sm transition-all">+</button>
                          </div>
                          <span className="font-bold text-[#3F4832]">{filsToDisplay(item.price * item.quantity, isAr ? 'ar' : 'en')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="rounded-2xl border border-[#E9DDCC] bg-white p-6 sm:p-8 shadow-[0_4px_16px_rgba(139,30,45,.03)] h-fit sticky top-28">
              <h2 className="text-xl font-bold text-[#2B2B2B] mb-6">{isAr ? 'ملخص الطلب' : 'Order Summary'}</h2>
              
              <div className="space-y-4 text-sm mb-6">
                <div className="flex justify-between text-[#746A64]">
                  <span>{isAr ? 'المجموع الفرعي' : 'Subtotal'}</span>
                  <span className="font-bold text-[#2B2B2B]">{filsToDisplay(subtotal, isAr ? 'ar' : 'en')}</span>
                </div>
                
                <div className="border-t border-[#E9DDCC] pt-4 mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A69A8C] mb-2">{isAr ? 'المحافظة' : 'Governorate'}</label>
                  <select 
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full appearance-none border-b-2 border-[#E9DDCC] bg-transparent py-2 pe-8 ps-1 text-sm font-semibold text-[#2B2B2B] transition-colors focus:border-[#B7935F] focus:outline-none cursor-pointer"
                  >
                    {zones.map((zone) => <option key={zone.id} value={zone.id}>{isAr ? zone.nameAr : zone.nameEn}</option>)}
                  </select>
                </div>

                <div className="flex justify-between text-[#746A64]">
                  <span>{isAr ? 'التوصيل' : 'Shipping'}</span>
                  <span className="font-bold text-[#2B2B2B]">
                    {shippingFee === 0 ? <span className="text-[#3F4832]">{isAr ? 'مجاني' : 'Free'}</span> : filsToDisplay(shippingFee, isAr ? 'ar' : 'en')}
                  </span>
                </div>

                <div className="flex justify-between font-bold text-lg border-t border-[#E9DDCC] pt-5 mt-5 text-[#2B2B2B]">
                  <span>{isAr ? 'الإجمالي' : 'Total'}</span>
                  <span className="text-[#3F4832]">{filsToDisplay(grandTotal, isAr ? 'ar' : 'en')}</span>
                </div>
              </div>

              <Link href={`/${locale}/checkout`} className="btn-rawaq-primary w-full justify-center text-center">
                {isAr ? 'إتمام الطلب بأمان' : 'Secure Checkout'}
              </Link>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
