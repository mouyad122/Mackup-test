'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';

export function FloatingCart({ locale = 'ar', rewardRule }: { locale?: string, rewardRule?: any }) {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const pathname = usePathname();
  const isAr = locale === 'ar';
  const displayLocale = locale === 'en' ? 'en' : 'ar';
  
  let rewardNameAr = 'مكافأة';
  let rewardNameEn = 'Reward';
  if (rewardRule) {
    if (rewardRule.rewardType === 'FREE_DELIVERY') {
      rewardNameAr = 'توصيل مجاني';
      rewardNameEn = 'Free shipping';
    } else if (rewardRule.rewardType === 'PERCENT') {
      rewardNameAr = `خصم ${rewardRule.rewardValue}%`;
      rewardNameEn = `${rewardRule.rewardValue}% Discount`;
    } else if (rewardRule.rewardType === 'FIXED') {
      const fixedAmount = filsToDisplay(rewardRule.rewardValue, displayLocale);
      rewardNameAr = `خصم ${fixedAmount}`;
      rewardNameEn = `${fixedAmount} Discount`;
    }
  }

  const copy = isAr
    ? {
        rewardLabel: rewardNameAr, checkout: 'إتمام الطلب',
        unlockedMessage: `تهانينا! ${rewardNameAr}`,
        reachedMessage: `طلبك مؤهل للحصول على ${rewardNameAr}`,
        addForReward: 'أضيفي', remaining: 'فقط', forReward: `للحصول على ${rewardNameAr}`,
      }
    : {
        rewardLabel: rewardNameEn, checkout: 'Checkout',
        unlockedMessage: `You unlocked ${rewardNameEn}!`,
        reachedMessage: `Your order qualifies for ${rewardNameEn}.`,
        addForReward: 'Add', remaining: 'more', forReward: `for ${rewardNameEn}`,
      };

  // Hide floating cart on admin, pos, or if already in checkout
  const isHiddenRoute = pathname.includes('/admin') ||
                        pathname.includes('/pos') ||
                        pathname.includes('/checkout');

  useEffect(() => {
    const loadCart = () => {
      try {
        const current = localStorage.getItem('makeup_cart');
        setCartItems(current ? JSON.parse(current) : []);
      } catch (e) {
        setCartItems([]);
      }
    };

    loadCart();
    setMounted(true);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'makeup_cart') loadCart();
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('cart_updated', loadCart);

    const interval = setInterval(loadCart, 2000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('cart_updated', loadCart);
      clearInterval(interval);
    };
  }, []);

  if (!mounted) return null;
  if (isHiddenRoute || cartItems.length === 0) return null;

  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const targetThreshold = rewardRule?.minimumAmount;
  const isRewardActive = !!targetThreshold;
  const progressPercent = isRewardActive ? Math.min(100, Math.round((totalPrice / targetThreshold) * 100)) : 0;
  const isRewardUnlocked = isRewardActive && totalPrice >= targetThreshold;
  const remaining = isRewardActive ? targetThreshold - totalPrice : 0;

  return (
    <div className="fixed z-[100] animate-bounce-in w-full bottom-0 start-0 end-0 md:w-auto md:bottom-6 md:left-auto md:right-6" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Reward Tooltip */}
      {showTooltip && isRewardActive && (
        <div className="absolute bottom-full mb-3 right-4 left-4 md:right-0 md:left-auto md:w-80 bg-white rounded-2xl shadow-[0_12px_40px_rgba(139,30,45,.15)] border border-[#E9DDCC] p-5 animate-fade-in z-[101]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl">{isRewardUnlocked ? '✨' : '🎁'}</span>
            <span className="font-bold text-sm text-[#3F4832] tracking-wide uppercase">
              {isRewardUnlocked ? copy.unlockedMessage : copy.rewardLabel}
            </span>
          </div>
          
          {isRewardUnlocked ? (
            <p className="text-sm text-[#3F4832] font-semibold">{copy.reachedMessage}</p>
          ) : (
            <p className="text-sm text-[#746A64] leading-relaxed">
              {copy.addForReward} <span className="font-bold text-[#3F4832]">{filsToDisplay(remaining, displayLocale)}</span> {copy.remaining} {copy.forReward}.
            </p>
          )}
          
          <div className="mt-4 h-1.5 bg-[#F7F3EA] rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${isRewardUnlocked ? 'bg-[#3F4832]' : 'bg-[#B7935F]'}`} 
              style={{ width: `${progressPercent}%` }} 
            />
          </div>
          <div className="mt-2 text-start text-xs font-bold text-[#A69A8C]">
            {filsToDisplay(totalPrice, displayLocale)} / {filsToDisplay(targetThreshold, displayLocale)}
          </div>
          
          {/* Decorative bottom edge */}
          <div className="absolute bottom-0 inset-x-4 h-[2px] bg-gradient-to-r from-transparent via-[#B7935F]/40 to-transparent rounded-full translate-y-[1px]" />
        </div>
      )}
      
      <Link href={`/${locale}/checkout`} className="block w-full">
        <div className="bg-[#3F4832] hover:bg-[#2d3623] text-white p-3 sm:p-4 md:rounded-full shadow-[0_-8px_30px_rgba(63,75,50,.25)] md:shadow-[0_12px_40px_rgba(63,75,50,.3)] flex items-center justify-between md:justify-start gap-4 transition-all duration-300 md:hover:scale-105 border-t border-[#B7935F]/40 md:border md:border-[#B7935F]/50 relative overflow-hidden group">
          
          {/* Subtle background tatreez pattern */}
          <div 
            className="absolute inset-0 opacity-10 pointer-events-none transition-opacity group-hover:opacity-20"
            style={{ backgroundImage: "url('/brand/patterns/rawaq-tatreez-strip.svg')", backgroundSize: 'auto 60px', backgroundPosition: 'center' }} 
          />

          <div className="flex items-center gap-3 relative z-10 ps-2">
            <div className="relative">
              <ShoppingBag className="w-7 h-7 text-white" />
              <span className="absolute -top-1.5 -end-1.5 bg-[#B7935F] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {totalQuantity}
              </span>
            </div>
            
            {/* Reward Circular Progress */}
            {isRewardActive && (
              <div 
                className="relative flex items-center gap-2 flex-shrink-0 cursor-pointer bg-white/10 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/20 transition-colors hover:bg-white/20" 
                onMouseEnter={() => setShowTooltip(true)} 
                onMouseLeave={() => setShowTooltip(false)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowTooltip(prev => !prev); }}
              >
                <div className="relative w-7 h-7">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/20" strokeWidth="3.5"></circle>
                    <circle 
                      cx="18" cy="18" r="16" fill="none" 
                      className={`stroke-current ${isRewardUnlocked ? 'text-[#B7935F]' : 'text-white'} transition-all duration-700 ease-in-out`} 
                      strokeWidth="3.5" 
                      strokeDasharray="100" 
                      strokeDashoffset={Math.max(0, 100 - progressPercent)} 
                      strokeLinecap="round">
                    </circle>
                  </svg>
                  {isRewardUnlocked && (
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] pb-0.5">✨</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col border-s border-white/20 ps-3">
              {isRewardActive && (
                <span className="text-[10px] text-white/70 uppercase tracking-wider font-bold">
                  {isRewardUnlocked ? copy.rewardLabel : `${copy.remaining} ${filsToDisplay(remaining, displayLocale)}`}
                </span>
              )}
              <span className="font-bold text-base tracking-tight">{filsToDisplay(totalPrice, displayLocale)}</span>
            </div>
          </div>
          
          <div className="md:hidden relative z-10 pe-2">
            <span className="bg-white text-[#3F4832] px-6 py-2.5 rounded-full font-bold text-sm shadow-sm">{copy.checkout}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
