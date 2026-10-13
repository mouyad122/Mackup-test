export class Money {
  private readonly amountInFils: number;

  constructor(amountInFils: number) {
    if (!Number.isInteger(amountInFils)) {
      // Force integer if somehow a float slipped in
      this.amountInFils = Math.round(amountInFils);
    } else {
      this.amountInFils = amountInFils;
    }
  }

  static zero() {
    return new Money(0);
  }

  static fromJOD(jod: number) {
    return new Money(Math.round(jod * 1000));
  }

  static fromFils(fils: number) {
    return new Money(fils);
  }

  getAmount(): number {
    return this.amountInFils;
  }

  add(other: Money): Money {
    return new Money(this.amountInFils + other.amountInFils);
  }

  subtract(other: Money): Money {
    return new Money(this.amountInFils - other.amountInFils);
  }

  multiply(multiplier: number): Money {
    return new Money(Math.round(this.amountInFils * multiplier));
  }

  // Divides and allocates remainder to avoid lost pennies
  allocate(ratios: number[]): Money[] {
    const totalRatio = ratios.reduce((a, b) => a + b, 0);
    if (totalRatio === 0) return ratios.map(() => Money.zero());

    let remainder = this.amountInFils;
    const results = ratios.map((ratio) => {
      const share = Math.floor((this.amountInFils * ratio) / totalRatio);
      remainder -= share;
      return share;
    });

    // Distribute remainder 1 fil at a time
    for (let i = 0; i < remainder; i++) {
      results[i % results.length] += 1;
    }

    return results.map(r => new Money(r));
  }

  calculatePercentage(percentage: number): Money {
    return new Money(Math.round(this.amountInFils * (percentage / 100)));
  }

  greaterThan(other: Money): boolean {
    return this.amountInFils > other.amountInFils;
  }

  greaterThanOrEqual(other: Money): boolean {
    return this.amountInFils >= other.amountInFils;
  }

  lessThan(other: Money): boolean {
    return this.amountInFils < other.amountInFils;
  }

  equals(other: Money): boolean {
    return this.amountInFils === other.amountInFils;
  }

  isZero(): boolean {
    return this.amountInFils === 0;
  }
  
  isPositive(): boolean {
    return this.amountInFils > 0;
  }

  isNegative(): boolean {
    return this.amountInFils < 0;
  }

  format(locale: 'ar' | 'en' = 'ar'): string {
    const jod = this.amountInFils / 1000;
    const formatted = jod.toFixed(3);
    return locale === 'ar' ? `${formatted} د.أ` : `${formatted} JOD`;
  }
}

// ---------------------------------------------------------
// LEGACY HELPERS (Refactored to use Money internally)
// ---------------------------------------------------------

export function jodToFils(jod: number): number {
  return Money.fromJOD(jod).getAmount();
}

export function filsToDisplay(fils: number, locale: 'ar' | 'en' = 'ar'): string {
  return Money.fromFils(fils).format(locale);
}

export function calculatePercentage(amount: number, percentage: number): number {
  return Money.fromFils(amount).calculatePercentage(percentage).getAmount();
}

export function calculateInclusiveTax(grossTotal: number, rate: number): number {
  if (rate <= 0) return 0;
  // taxAmount = grossTotal - (grossTotal / (1 + rate / 100))
  const tax = Math.round(grossTotal - grossTotal / (1 + rate / 100));
  return Money.fromFils(tax).getAmount();
}

export function calculateExclusiveTax(netSubtotal: number, rate: number): number {
  if (rate <= 0) return 0;
  return Money.fromFils(netSubtotal).calculatePercentage(rate).getAmount();
}

export function calculateDiscount(
  subtotal: number,
  discountValue: number,
  isPercentage: boolean
): number {
  const sub = Money.fromFils(subtotal);
  if (isPercentage) {
    return sub.calculatePercentage(discountValue).getAmount();
  }
  const disc = Money.fromFils(discountValue);
  return sub.lessThan(disc) ? sub.getAmount() : disc.getAmount();
}

export function validatePaymentAllocation(
  invoiceTotal: number,
  payments: { method: 'CASH' | 'CARD'; amount: number; amountTendered?: number }[]
) {
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

  return {
    cashApplied,
    cardApplied,
    cashTendered,
    changeDue: Math.max(0, cashTendered - cashApplied)
  };
}
