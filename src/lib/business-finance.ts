export function calculateSupplierSplit(productRevenue: number, acquisitionCost: number, supplierProfitShareBps: number) {
  const profitBeforeShare = productRevenue - acquisitionCost;
  const supplierProfitShare = Math.floor(Math.max(0, profitBeforeShare) * supplierProfitShareBps / 10_000);
  return {
    profitBeforeShare,
    supplierProfitShare,
    supplierObligation: acquisitionCost + supplierProfitShare,
    platformProductProfit: profitBeforeShare - supplierProfitShare,
  };
}

export function refundableCollectedAmount(collected: number, previouslyRefunded: number) {
  return Math.max(0, collected - previouslyRefunded);
}

export function capPromotionDiscounts(rewardDiscount: number, couponDiscount: number, marginBudget: number) {
  const reward = Math.min(Math.max(0, rewardDiscount), Math.max(0, marginBudget));
  return { reward, coupon: Math.min(Math.max(0, couponDiscount), Math.max(0, marginBudget - reward)) };
}

export function classifyRefund(amount: number, productBase: number, deliveryBase: number) {
  const safeProduct = Math.max(0, productBase);
  const safeDelivery = Math.max(0, deliveryBase);
  const revenueBase = safeProduct + safeDelivery;
  const revenueRefund = Math.min(Math.max(0, amount), revenueBase);
  const delivery = revenueBase > 0 ? Math.min(safeDelivery, Math.floor(revenueRefund * safeDelivery / revenueBase)) : 0;
  const product = Math.min(safeProduct, revenueRefund - delivery);
  return { product, delivery: delivery + Math.min(safeDelivery - delivery, revenueRefund - delivery - product), tax: Math.max(0, amount - revenueRefund) };
}

export function calculateDeliveryProfit(revenue: number, carrierCost: number, captainEarning: number) {
  return revenue - carrierCost - captainEarning;
}

export function selectSupplierOffer<T extends { isActive: boolean; supplier: { isActive: boolean }; stock: number }>(offers: T[], quantity: number) {
  return offers.find(offer => offer.isActive && offer.supplier.isActive && offer.stock >= quantity) ?? null;
}

export function isTerminalDeliveryOrderStatus(status: string) {
  return status === 'CANCELLED' || status === 'REFUNDED' || status === 'DELIVERED';
}
