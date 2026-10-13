import { Money } from './money';

export function calculateSupplierSplit(productRevenue: number, acquisitionCost: number, supplierProfitShareBps: number) {
  const rev = Money.fromFils(productRevenue);
  const cost = Money.fromFils(acquisitionCost);
  const profitBeforeShare = rev.subtract(cost);
  
  let supplierProfitShare = Money.zero();
  if (profitBeforeShare.isPositive()) {
    supplierProfitShare = profitBeforeShare.calculatePercentage(supplierProfitShareBps / 100);
  }

  return {
    profitBeforeShare: profitBeforeShare.getAmount(),
    supplierProfitShare: supplierProfitShare.getAmount(),
    supplierObligation: cost.add(supplierProfitShare).getAmount(),
    platformProductProfit: profitBeforeShare.subtract(supplierProfitShare).getAmount(),
  };
}

export function refundableCollectedAmount(collected: number, previouslyRefunded: number) {
  const col = Money.fromFils(collected);
  const ref = Money.fromFils(previouslyRefunded);
  const amount = col.subtract(ref);
  return amount.isPositive() ? amount.getAmount() : 0;
}

export function capPromotionDiscounts(rewardDiscount: number, couponDiscount: number, marginBudget: number) {
  const reqReward = Money.fromFils(rewardDiscount);
  const reqCoupon = Money.fromFils(couponDiscount);
  const budget = Money.fromFils(marginBudget);

  const safeReward = reqReward.isPositive() ? reqReward : Money.zero();
  const safeCoupon = reqCoupon.isPositive() ? reqCoupon : Money.zero();
  const safeBudget = budget.isPositive() ? budget : Money.zero();

  const reward = safeReward.lessThan(safeBudget) ? safeReward : safeBudget;
  const remainingBudget = safeBudget.subtract(reward);
  const coupon = safeCoupon.lessThan(remainingBudget) ? safeCoupon : remainingBudget;

  return { reward: reward.getAmount(), coupon: coupon.getAmount() };
}

export function classifyRefund(amount: number, productBase: number, deliveryBase: number) {
  const amt = Money.fromFils(amount);
  const prod = Money.fromFils(Math.max(0, productBase));
  const deliv = Money.fromFils(Math.max(0, deliveryBase));
  const revBase = prod.add(deliv);
  
  const revRefund = amt.lessThan(revBase) ? amt : revBase;
  
  let deliveryRefund = Money.zero();
  if (revBase.isPositive()) {
    // Allocate refund proportionally
    const allocated = revRefund.allocate([prod.getAmount(), deliv.getAmount()]);
    deliveryRefund = allocated[1]!.lessThan(deliv) ? allocated[1]! : deliv;
  }
  
  let productRefund = revRefund.subtract(deliveryRefund);
  if (productRefund.greaterThan(prod)) {
     productRefund = prod;
  }
  
  const taxRefund = amt.subtract(revRefund);
  
  return { 
    product: productRefund.getAmount(), 
    delivery: deliveryRefund.getAmount(), 
    tax: taxRefund.isPositive() ? taxRefund.getAmount() : 0 
  };
}

export function calculateDeliveryProfit(revenue: number, carrierCost: number, captainEarning: number) {
  return Money.fromFils(revenue).subtract(Money.fromFils(carrierCost)).subtract(Money.fromFils(captainEarning)).getAmount();
}

export function selectSupplierOffer<T extends { isActive: boolean; supplier: { isActive: boolean }; stock: number }>(offers: T[], quantity: number) {
  return offers.find(offer => offer.isActive && offer.supplier.isActive && offer.stock >= quantity) ?? null;
}

export function isTerminalDeliveryOrderStatus(status: string) {
  return status === 'CANCELLED' || status === 'REFUNDED' || status === 'DELIVERED';
}
