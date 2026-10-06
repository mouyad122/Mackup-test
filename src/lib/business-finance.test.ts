import { describe, expect, it } from 'vitest';
import { calculateDeliveryProfit, calculateSupplierSplit, capPromotionDiscounts, classifyRefund, isTerminalDeliveryOrderStatus, refundableCollectedAmount, selectSupplierOffer } from './business-finance';

describe('critical money rules', () => {
  it('preserves supplier cost plus 40 percent of profit as the supplier obligation', () => {
    expect(calculateSupplierSplit(7000, 5000, 4000)).toEqual({ profitBeforeShare: 2000, supplierProfitShare: 800, supplierObligation: 5800, platformProductProfit: 1200 });
  });

  it('keeps free delivery costs separate from product profit', () => {
    const product = calculateSupplierSplit(7000, 5000, 4000);
    const delivery = calculateDeliveryProfit(0, 1000, 700);
    expect(product.platformProductProfit).toBe(1200);
    expect(delivery).toBe(-1700);
    expect(product.platformProductProfit + delivery).toBe(-500);
  });

  it('calculates supplier share on the discounted selling amount', () => {
    expect(calculateSupplierSplit(8000, 5000, 4000)).toEqual({ profitBeforeShare: 3000, supplierProfitShare: 1200, supplierObligation: 6200, platformProductProfit: 1800 });
  });

  it('rejects refunds above money collected, including unpaid COD orders', () => {
    expect(refundableCollectedAmount(0, 0)).toBe(0);
    expect(refundableCollectedAmount(5000, 2000)).toBe(3000);
  });

  it('caps stacked reward and coupon discounts at product margin by default', () => {
    expect(capPromotionDiscounts(5000, 5000, 5000)).toEqual({ reward: 5000, coupon: 0 });
  });

  it('classifies a full product and delivery refund separately', () => {
    expect(classifyRefund(9000, 7000, 2000)).toEqual({ product: 7000, delivery: 2000, tax: 0 });
  });

  it('selects only active, sufficiently stocked offers in the existing cost order', () => {
    const offers = [
      { id: 'cheapest-short', isActive: true, supplier: { isActive: true }, stock: 1 },
      { id: 'next-valid', isActive: true, supplier: { isActive: true }, stock: 4 },
      { id: 'inactive-valid', isActive: false, supplier: { isActive: true }, stock: 9 },
    ];
    expect(selectSupplierOffer(offers, 2)?.id).toBe('next-valid');
    expect(selectSupplierOffer(offers, 10)).toBeNull();
  });

  it('makes cancelled and refunded orders terminal for delivery', () => {
    expect(isTerminalDeliveryOrderStatus('REFUNDED')).toBe(true);
    expect(isTerminalDeliveryOrderStatus('CANCELLED')).toBe(true);
    expect(isTerminalDeliveryOrderStatus('CONFIRMED')).toBe(false);
  });
});
