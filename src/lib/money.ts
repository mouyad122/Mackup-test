/**
 * MONEY MODULE FOR JORDANIAN FILS (1 JOD = 1000 fils)
 *
 * ROUNDING RULE DOCUMENTATION:
 * The system implements Half-Up Rounding (standard arithmetic rounding: Math.round for positive values).
 * Any fractional value >= 0.5 fils is rounded up to the nearest integer fils.
 * Any fractional value < 0.5 fils is rounded down.
 */

/**
 * Converts a JOD decimal value (e.g. 10.500) to integer Fils (e.g. 10500).
 */
export function jodToFils(jod: number): number {
  return Math.round(jod * 1000);
}

/**
 * Formats integer Fils to user-friendly Arabic/English JOD decimal strings.
 * e.g. 10500 fils -> "10.500 د.أ" or "10.500 JOD"
 */
export function filsToDisplay(fils: number, locale: 'ar' | 'en' = 'ar'): string {
  const jod = fils / 1000;
  const formatted = jod.toFixed(3);
  return locale === 'ar' ? `${formatted} د.أ` : `${formatted} JOD`;
}

/**
 * Calculates a percentage value with explicit Half-Up rounding.
 */
export function calculatePercentage(amount: number, percentage: number): number {
  return Math.round(amount * (percentage / 100));
}

/**
 * Extracts inclusive tax from a gross total.
 * taxAmount = grossTotal - (grossTotal / (1 + rate / 100))
 */
export function calculateInclusiveTax(grossTotal: number, rate: number): number {
  if (rate <= 0) return 0;
  return Math.round(grossTotal - grossTotal / (1 + rate / 100));
}

/**
 * Calculates exclusive tax from a net subtotal.
 * taxAmount = netSubtotal * (rate / 100)
 */
export function calculateExclusiveTax(netSubtotal: number, rate: number): number {
  if (rate <= 0) return 0;
  return Math.round(netSubtotal * (rate / 100));
}

/**
 * Calculates discount amount based on percentage or absolute fils values.
 */
export function calculateDiscount(
  subtotal: number,
  discountValue: number,
  isPercentage: boolean
): number {
  if (isPercentage) {
    return calculatePercentage(subtotal, discountValue);
  }
  return Math.min(subtotal, discountValue);
}

/**
 * Validates payment allocation constraints:
 * 1. cashApplied + cardApplied = invoiceTotal
 * 2. cashTendered >= cashApplied
 * 3. changeDue = cashTendered - cashApplied
 */
export function validatePaymentAllocation(
  invoiceTotal: number,
  payments: { method: 'CASH' | 'CARD'; amount: number; amountTendered?: number }[]
): {
  cashApplied: number;
  cardApplied: number;
  cashTendered: number;
  changeDue: number;
} {
  let cashApplied = 0;
  let cashTendered = 0;
  let cardApplied = 0;

  const totalPaymentsApplied = payments.reduce((sum, p) => sum + p.amount, 0);
  if (totalPaymentsApplied !== invoiceTotal) {
    throw new Error('مجموع المبالغ المدفوعة لا يساوي إجمالي الفاتورة');
  }

  for (const p of payments) {
    if (p.method === 'CASH') {
      const applied = p.amount;
      const tendered = p.amountTendered !== undefined && p.amountTendered !== null ? p.amountTendered : applied;
      if (tendered < applied) {
        throw new Error('المبلغ النقدي المستلم أقل من قيمة الدفعة المطلوبة');
      }
      cashApplied += applied;
      cashTendered += tendered;
    } else if (p.method === 'CARD') {
      cardApplied += p.amount;
    }
  }

  const changeDue = cashTendered - cashApplied;

  return {
    cashApplied,
    cardApplied,
    cashTendered,
    changeDue
  };
}
