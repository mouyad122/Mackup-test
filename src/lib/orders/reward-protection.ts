import { filsToDisplay } from '@/lib/money';

export interface RewardRedemptionWithRule {
  id: string;
  rewardRuleId: string;
  amount: number;
  isVoided: boolean;
  rewardRule: {
    id: string;
    name: string;
    minimumAmount: number;
    rewardType: string;
    rewardValue: number;
    usageCount?: number;
  };
}

export interface CouponRedemptionWithCoupon {
  id: string;
  couponId: string;
  amount: number;
  isVoided: boolean;
  coupon: {
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    minimumOrderAmount: number;
    usageCount?: number;
  };
}

export interface OrderRewardProtectionInput {
  order: {
    id: string;
    reference: string;
    shippingCost: number;
    actualDeliveryCost?: number | null;
    discountAmount: number;
    rewardDiscount: number;
    couponDiscount: number;
    rewardNameSnapshot?: string | null;
    shippingZoneNameSnapshot?: string | null;
    rewardRedemptions?: RewardRedemptionWithRule[];
    couponRedemption?: CouponRedemptionWithCoupon | null;
  };
  newItemsTotal: number;
  shippingZone?: {
    id: string;
    nameAr: string;
    fee: number;
    freeShippingThreshold: number | null;
    actualDeliveryCost: number | null;
  } | null;
  activeRewardRules?: Array<{
    id: string;
    name: string;
    minimumAmount: number;
    rewardType: string;
    rewardValue: number;
  }>;
  allowRewardBelowThreshold?: boolean;
}

export interface OrderRewardProtectionResult {
  hasViolatedThreshold: boolean;
  violatedRewardType: 'FREE_DELIVERY' | 'REWARD_DISCOUNT' | 'COUPON' | null;
  thresholdAmount: number | null;
  ruleName: string | null;
  standardShippingFee: number;
  
  allowRewardBelowThreshold: boolean;
  rewardStatus: 'ELIGIBLE' | 'REVOKED_BELOW_THRESHOLD' | 'KEPT_BY_ADMIN_APPROVAL';
  
  newShippingCost: number;
  newRewardDiscount: number;
  newCouponDiscount: number;
  newDiscountAmount: number;
  newGrossTotal: number;
  
  voidRewardRedemptionIds: string[];
  decrementRewardRuleIds: string[];
  voidCouponRedemptionId: string | null;
  decrementCouponId: string | null;
  
  adjustmentNote: string;
  historyNote: string;
}

/**
 * تقييم استحقاق الطلب للمكافآت والتوصيل المجاني بعد حذف أو تعديل الأصناف،
 * وتطبيق حماية الأمان المالي لمنع ثغرة الحصول على توصيل مجاني أو خصم بعد خفض قيمة الفاتورة عن الحد الأدنى.
 */
export function evaluateOrderRewardProtection(
  input: OrderRewardProtectionInput
): OrderRewardProtectionResult {
  const {
    order,
    newItemsTotal,
    shippingZone,
    activeRewardRules = [],
    allowRewardBelowThreshold = false,
  } = input;

  const standardShippingFee =
    shippingZone?.fee ??
    order.actualDeliveryCost ??
    (shippingZone?.actualDeliveryCost ? shippingZone.actualDeliveryCost : 2000);

  // 1. فحص التوصيل المجاني
  const hadFreeDelivery = order.shippingCost === 0;
  let freeDeliveryThreshold: number | null = null;
  let freeDeliveryRuleName: string | null = null;
  let freeDeliveryRedemption: RewardRedemptionWithRule | null = null;

  if (hadFreeDelivery) {
    // أ. فحص عبر RewardRedemption للطلب
    const fdRedemption = order.rewardRedemptions?.find(
      (r) => !r.isVoided && r.rewardRule.rewardType === 'FREE_DELIVERY'
    );
    if (fdRedemption) {
      freeDeliveryRedemption = fdRedemption;
      freeDeliveryThreshold = fdRedemption.rewardRule.minimumAmount;
      freeDeliveryRuleName = fdRedemption.rewardRule.name;
    }

    // ب. فحص عبر إعدادات منطقة التوصيل (ShippingZone)
    if (freeDeliveryThreshold === null && shippingZone?.freeShippingThreshold) {
      freeDeliveryThreshold = shippingZone.freeShippingThreshold;
      freeDeliveryRuleName = `توصيل مجاني لمنطقة ${shippingZone.nameAr}`;
    }

    // ج. فحص عبر كوبون التوصيل المجاني
    if (
      freeDeliveryThreshold === null &&
      order.couponRedemption &&
      !order.couponRedemption.isVoided &&
      order.couponRedemption.coupon.discountType === 'FREE_DELIVERY' &&
      order.couponRedemption.coupon.minimumOrderAmount > 0
    ) {
      freeDeliveryThreshold = order.couponRedemption.coupon.minimumOrderAmount;
      freeDeliveryRuleName = `كوبون توصيل مجاني (${order.couponRedemption.coupon.code})`;
    }

    // د. فحص عبر القواعد العامة الفعالة إذا وجد اسم المكافأة في الـ Snapshot
    if (freeDeliveryThreshold === null) {
      const activeFdRule = activeRewardRules.find((r) => r.rewardType === 'FREE_DELIVERY');
      if (activeFdRule) {
        freeDeliveryThreshold = activeFdRule.minimumAmount;
        freeDeliveryRuleName = activeFdRule.name;
      }
    }
  }

  // 2. فحص خصم المكافآت (نسبة أو مبلغ ثابت)
  const hadRewardDiscount = order.rewardDiscount > 0;
  let rewardDiscountThreshold: number | null = null;
  let rewardDiscountRuleName: string | null = null;
  let rewardDiscountRedemption: RewardRedemptionWithRule | null = null;

  if (hadRewardDiscount) {
    const rdRedemption = order.rewardRedemptions?.find(
      (r) => !r.isVoided && r.rewardRule.rewardType !== 'FREE_DELIVERY'
    );
    if (rdRedemption && rdRedemption.rewardRule.minimumAmount > 0) {
      rewardDiscountRedemption = rdRedemption;
      rewardDiscountThreshold = rdRedemption.rewardRule.minimumAmount;
      rewardDiscountRuleName = rdRedemption.rewardRule.name;
    }
  }

  // 3. فحص الكوبونات العادية التي لها حد أدنى
  const hadCouponDiscount = order.couponDiscount > 0;
  let couponThreshold: number | null = null;
  let couponRuleName: string | null = null;
  if (
    hadCouponDiscount &&
    order.couponRedemption &&
    !order.couponRedemption.isVoided &&
    order.couponRedemption.coupon.minimumOrderAmount > 0
  ) {
    couponThreshold = order.couponRedemption.coupon.minimumOrderAmount;
    couponRuleName = `كوبون (${order.couponRedemption.coupon.code})`;
  }

  // تقييم المخالفات المالية
  const isFreeDeliveryViolated =
    hadFreeDelivery &&
    freeDeliveryThreshold !== null &&
    newItemsTotal < freeDeliveryThreshold;

  const isRewardDiscountViolated =
    hadRewardDiscount &&
    rewardDiscountThreshold !== null &&
    newItemsTotal < rewardDiscountThreshold;

  const isCouponViolated =
    hadCouponDiscount &&
    couponThreshold !== null &&
    newItemsTotal < couponThreshold;

  const hasViolatedThreshold =
    isFreeDeliveryViolated || isRewardDiscountViolated || isCouponViolated;

  let violatedRewardType: 'FREE_DELIVERY' | 'REWARD_DISCOUNT' | 'COUPON' | null = null;
  let thresholdAmount: number | null = null;
  let ruleName: string | null = null;

  if (isFreeDeliveryViolated) {
    violatedRewardType = 'FREE_DELIVERY';
    thresholdAmount = freeDeliveryThreshold;
    ruleName = freeDeliveryRuleName;
  } else if (isRewardDiscountViolated) {
    violatedRewardType = 'REWARD_DISCOUNT';
    thresholdAmount = rewardDiscountThreshold;
    ruleName = rewardDiscountRuleName;
  } else if (isCouponViolated) {
    violatedRewardType = 'COUPON';
    thresholdAmount = couponThreshold;
    ruleName = couponRuleName;
  }

  // مخرجات الحسابات
  let newShippingCost = order.shippingCost;
  let newRewardDiscount = order.rewardDiscount;
  let newCouponDiscount = order.couponDiscount;
  const voidRewardRedemptionIds: string[] = [];
  const decrementRewardRuleIds: string[] = [];
  let voidCouponRedemptionId: string | null = null;
  let decrementCouponId: string | null = null;

  let rewardStatus: 'ELIGIBLE' | 'REVOKED_BELOW_THRESHOLD' | 'KEPT_BY_ADMIN_APPROVAL' = 'ELIGIBLE';
  let adjustmentNote = '';
  let historyNote = '';

  if (hasViolatedThreshold) {
    if (allowRewardBelowThreshold) {
      // موافقة الإدارة الصريحة على إبقاء المكافأة رغم مخالفة الحد الأدنى
      rewardStatus = 'KEPT_BY_ADMIN_APPROVAL';
      newShippingCost = order.shippingCost; // إبقاء 0
      newRewardDiscount = order.rewardDiscount;
      newCouponDiscount = order.couponDiscount;

      const thresholdStr = thresholdAmount ? filsToDisplay(thresholdAmount) : 'الحد الأدنى';
      adjustmentNote = `[موافقة الإدارة]: تم الإبقاء على المكافأة (${ruleName || 'التوصيل المجاني'}) استثناءً بموافقة الإدارة رغم انخفاض إجمالي المنتجات إلى ${filsToDisplay(newItemsTotal)} (أقل من ${thresholdStr}).`;
      historyNote = `موافقة إدارة: استمرار منح المكافأة استثناءً رغم انخفاض القيمة عن ${thresholdStr}.`;
    } else {
      // إلغاء المكافأة تلقائياً وفق سياسة الأمان المالي
      rewardStatus = 'REVOKED_BELOW_THRESHOLD';

      if (isFreeDeliveryViolated) {
        newShippingCost = standardShippingFee;
        if (freeDeliveryRedemption) {
          voidRewardRedemptionIds.push(freeDeliveryRedemption.id);
          decrementRewardRuleIds.push(freeDeliveryRedemption.rewardRuleId);
        }
      }

      if (isRewardDiscountViolated) {
        newRewardDiscount = 0;
        if (rewardDiscountRedemption) {
          voidRewardRedemptionIds.push(rewardDiscountRedemption.id);
          decrementRewardRuleIds.push(rewardDiscountRedemption.rewardRuleId);
        }
      }

      if (isCouponViolated && order.couponRedemption) {
        newCouponDiscount = 0;
        voidCouponRedemptionId = order.couponRedemption.id;
        decrementCouponId = order.couponRedemption.couponId;
      }

      const thresholdStr = thresholdAmount ? filsToDisplay(thresholdAmount) : 'الحد الأدنى';
      const shippingAddedStr =
        isFreeDeliveryViolated && standardShippingFee > 0
          ? ` وتطبيق رسوم التوصيل (${filsToDisplay(standardShippingFee)})`
          : '';

      adjustmentNote = `[أمان مالي]: تم إلغاء المكافأة (${ruleName || 'التوصيل المجاني'}) تلقائياً لانخفاض إجمالي المشتريات إلى ${filsToDisplay(newItemsTotal)} وهو أقل من ${thresholdStr}${shippingAddedStr}.`;
      historyNote = `إلغاء مكافأة تلقائي: انخفاض إجمالي الطلب عن ${thresholdStr}${shippingAddedStr}.`;
    }
  }

  const newDiscountAmount = newRewardDiscount + newCouponDiscount;
  const newGrossTotal = Math.max(0, newItemsTotal + newShippingCost - newDiscountAmount);

  return {
    hasViolatedThreshold,
    violatedRewardType,
    thresholdAmount,
    ruleName,
    standardShippingFee,
    allowRewardBelowThreshold,
    rewardStatus,
    newShippingCost,
    newRewardDiscount,
    newCouponDiscount,
    newDiscountAmount,
    newGrossTotal,
    voidRewardRedemptionIds,
    decrementRewardRuleIds,
    voidCouponRedemptionId,
    decrementCouponId,
    adjustmentNote,
    historyNote,
  };
}

/**
 * فحص سريع لمطابقة الحد الأدنى قبل التنفيذ لعرض التنبيه أو النافذة للآدمن في الواجهة
 */
export function checkOrderRewardThresholdDrop(
  order: {
    shippingCost: number;
    actualDeliveryCost?: number | null;
    rewardDiscount: number;
    couponDiscount: number;
    items: Array<{ id: string; total: number; isRemoved: boolean }>;
    rewardRedemptions?: RewardRedemptionWithRule[];
    couponRedemption?: CouponRedemptionWithCoupon | null;
  },
  itemToRemoveId: string,
  shippingZone?: { fee: number; freeShippingThreshold: number | null; actualDeliveryCost: number | null } | null
) {
  const activeItems = order.items.filter((it) => !it.isRemoved);
  const targetItem = activeItems.find((it) => it.id === itemToRemoveId);
  const currentSubtotal = activeItems.reduce((sum, it) => sum + it.total, 0);
  const futureSubtotal = Math.max(0, currentSubtotal - (targetItem?.total || 0));

  const standardFee =
    shippingZone?.fee ??
    order.actualDeliveryCost ??
    (shippingZone?.actualDeliveryCost ? shippingZone.actualDeliveryCost : 2000);

  // استخراج حد التوصيل المجاني إن وجد
  let threshold: number | null = null;
  let ruleName = 'توصيل مجاني';

  if (order.shippingCost === 0) {
    const fdRedemption = order.rewardRedemptions?.find(
      (r) => !r.isVoided && r.rewardRule.rewardType === 'FREE_DELIVERY'
    );
    if (fdRedemption) {
      threshold = fdRedemption.rewardRule.minimumAmount;
      ruleName = fdRedemption.rewardRule.name;
    } else if (shippingZone?.freeShippingThreshold) {
      threshold = shippingZone.freeShippingThreshold;
      ruleName = 'توصيل مجاني للمنطقة';
    } else if (order.couponRedemption?.coupon.discountType === 'FREE_DELIVERY') {
      threshold = order.couponRedemption.coupon.minimumOrderAmount;
      ruleName = `كوبون توصيل مجاني (${order.couponRedemption.coupon.code})`;
    }
  }

  const willViolateThreshold =
    threshold !== null && futureSubtotal < threshold && order.shippingCost === 0;

  return {
    willViolateThreshold,
    currentSubtotal,
    futureSubtotal,
    threshold,
    standardFee,
    ruleName,
    itemPrice: targetItem?.total || 0,
  };
}
