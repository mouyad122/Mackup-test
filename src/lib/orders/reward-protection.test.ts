import { describe, expect, it } from 'vitest';
import { evaluateOrderRewardProtection, checkOrderRewardThresholdDrop } from './reward-protection';

describe('Financial loophole prevention: Order Reward & Free Delivery Protection', () => {
  const baseOrder = {
    id: 'ord-123',
    reference: 'ORD-TEST1',
    shippingCost: 0, // Got free delivery
    actualDeliveryCost: 2000, // 2 JOD delivery cost
    discountAmount: 0,
    rewardDiscount: 0,
    couponDiscount: 0,
    rewardNameSnapshot: 'توصيل مجاني عند الشراء بـ 30 د.أ',
    shippingZoneNameSnapshot: 'عمان',
    rewardRedemptions: [
      {
        id: 'red-1',
        rewardRuleId: 'rule-fd-30',
        amount: 0,
        isVoided: false,
        rewardRule: {
          id: 'rule-fd-30',
          name: 'توصيل مجاني عند الشراء بـ 30 د.أ',
          minimumAmount: 30000, // 30 JOD
          rewardType: 'FREE_DELIVERY',
          rewardValue: 0,
          usageCount: 5,
        },
      },
    ],
  };

  const shippingZone = {
    id: 'zone-1',
    nameAr: 'عمان',
    fee: 2000,
    freeShippingThreshold: 30000,
    actualDeliveryCost: 2000,
  };

  it('revokes free delivery and restores shipping fee when order drops from 50 JD to 20 JD without admin approval', () => {
    // Customer originally bought 50 JOD, had free delivery. An item was removed, new items total is 20 JOD.
    const result = evaluateOrderRewardProtection({
      order: baseOrder,
      newItemsTotal: 20000, // 20 JOD (less than 30 JOD threshold)
      shippingZone,
      allowRewardBelowThreshold: false,
    });

    expect(result.hasViolatedThreshold).toBe(true);
    expect(result.violatedRewardType).toBe('FREE_DELIVERY');
    expect(result.rewardStatus).toBe('REVOKED_BELOW_THRESHOLD');
    expect(result.newShippingCost).toBe(2000); // 2 JOD shipping fee restored
    expect(result.newGrossTotal).toBe(22000); // 20 JOD + 2 JOD delivery = 22 JOD
    expect(result.voidRewardRedemptionIds).toContain('red-1');
    expect(result.decrementRewardRuleIds).toContain('rule-fd-30');
    expect(result.adjustmentNote).toContain('تم إلغاء المكافأة');
    expect(result.adjustmentNote).toContain('تطبيق رسوم التوصيل');
  });

  it('allows retaining free delivery ONLY when admin explicitly approves it as an exception', () => {
    const result = evaluateOrderRewardProtection({
      order: baseOrder,
      newItemsTotal: 20000, // 20 JOD
      shippingZone,
      allowRewardBelowThreshold: true, // Explicit Admin Approval
    });

    expect(result.hasViolatedThreshold).toBe(true);
    expect(result.rewardStatus).toBe('KEPT_BY_ADMIN_APPROVAL');
    expect(result.newShippingCost).toBe(0); // Free delivery kept
    expect(result.newGrossTotal).toBe(20000); // 20 JOD
    expect(result.voidRewardRedemptionIds).toHaveLength(0); // Not voided
    expect(result.adjustmentNote).toContain('[موافقة الإدارة]');
    expect(result.adjustmentNote).toContain('استثناءً بموافقة الإدارة');
  });

  it('preserves free delivery without violation when total remains at or above the threshold', () => {
    // Customer drops from 50 JOD to 35 JOD (still >= 30 JOD)
    const result = evaluateOrderRewardProtection({
      order: baseOrder,
      newItemsTotal: 35000,
      shippingZone,
      allowRewardBelowThreshold: false,
    });

    expect(result.hasViolatedThreshold).toBe(false);
    expect(result.rewardStatus).toBe('ELIGIBLE');
    expect(result.newShippingCost).toBe(0);
    expect(result.newGrossTotal).toBe(35000);
  });

  it('handles shipping zone free threshold when no reward rule redemption is present', () => {
    const orderWithoutRedemption = {
      ...baseOrder,
      rewardRedemptions: [],
    };

    const result = evaluateOrderRewardProtection({
      order: orderWithoutRedemption,
      newItemsTotal: 20000,
      shippingZone,
      allowRewardBelowThreshold: false,
    });

    expect(result.hasViolatedThreshold).toBe(true);
    expect(result.rewardStatus).toBe('REVOKED_BELOW_THRESHOLD');
    expect(result.newShippingCost).toBe(2000);
    expect(result.newGrossTotal).toBe(22000);
  });

  it('revokes reward discount when subtotal drops below minimum amount', () => {
    const orderWithDiscount = {
      id: 'ord-discount',
      reference: 'ORD-DISC1',
      shippingCost: 2000,
      discountAmount: 5000,
      rewardDiscount: 5000, // 5 JOD discount
      couponDiscount: 0,
      rewardRedemptions: [
        {
          id: 'red-disc-1',
          rewardRuleId: 'rule-disc-40',
          amount: 5000,
          isVoided: false,
          rewardRule: {
            id: 'rule-disc-40',
            name: 'خصم 5 دنانير عند الشراء بـ 40 د.أ',
            minimumAmount: 40000, // 40 JOD threshold
            rewardType: 'FIXED',
            rewardValue: 5000,
          },
        },
      ],
    };

    // Subtotal drops to 25 JOD (< 40 JOD)
    const result = evaluateOrderRewardProtection({
      order: orderWithDiscount,
      newItemsTotal: 25000,
      shippingZone,
      allowRewardBelowThreshold: false,
    });

    expect(result.hasViolatedThreshold).toBe(true);
    expect(result.violatedRewardType).toBe('REWARD_DISCOUNT');
    expect(result.newRewardDiscount).toBe(0); // Discount revoked!
    expect(result.newGrossTotal).toBe(27000); // 25 JOD + 2 JOD shipping - 0 discount = 27 JOD
    expect(result.voidRewardRedemptionIds).toContain('red-disc-1');
  });

  it('correctly checks future threshold drop before removing an item', () => {
    const order = {
      shippingCost: 0,
      actualDeliveryCost: 2000,
      rewardDiscount: 0,
      couponDiscount: 0,
      items: [
        { id: 'item-1', total: 30000, isRemoved: false },
        { id: 'item-2', total: 20000, isRemoved: false },
      ],
      rewardRedemptions: baseOrder.rewardRedemptions,
    };

    // Removing item-1 (30 JOD) leaves item-2 (20 JOD) which is < 30 JOD threshold
    const check1 = checkOrderRewardThresholdDrop(order, 'item-1', shippingZone);
    expect(check1.willViolateThreshold).toBe(true);
    expect(check1.currentSubtotal).toBe(50000);
    expect(check1.futureSubtotal).toBe(20000);
    expect(check1.threshold).toBe(30000);

    // Removing item-2 (20 JOD) leaves item-1 (30 JOD) which is == 30 JOD threshold
    const check2 = checkOrderRewardThresholdDrop(order, 'item-2', shippingZone);
    expect(check2.willViolateThreshold).toBe(false);
    expect(check2.futureSubtotal).toBe(30000);
  });
});
