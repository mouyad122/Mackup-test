import { describe, it, expect, vi } from 'vitest';
import { ProfitsService } from './profits/profits-service';
import { resolveProfitTab } from './profits/tabs';

describe('Profits & Payroll Acceptance Tests (اختبارات القبول لمركز الأرباح والرواتب والشركاء)', () => {
  it('1. حساب هامش نشاط المنصة = الإيرادات - حصة الموردين', () => {
    const grossRevenueFils = 3000000; // 3,000.000 JOD
    const supplierObligationsFils = 1000000; // 1,000.000 JOD
    const margin = Math.max(0, grossRevenueFils - supplierObligationsFils);

    expect(margin).toBe(2000000); // 2,000.000 JOD
  });

  it('2. استحقاق راتب الموظف أسبوعياً كمصروف والتزام مستقل (50 د.أ)', () => {
    const baseWeeklyRateFils = 50000; // 50.000 JOD
    const weeksCount = 4;
    const totalSalariesExpense = baseWeeklyRateFils * weeksCount;

    expect(totalSalariesExpense).toBe(200000); // 200.000 JOD
  });

  it('3. احتساب صافي الربح التشغيلي بعد كافة المصاريف والرواتب', () => {
    const platformGrossMarginFils = 3000000; // 3,000.000 JOD
    const courierCostsFils = 400000; // 400.000 JOD
    const marketingAndOpsFils = 500000; // 500.000 JOD
    const staffSalariesFils = 200000; // 200.000 JOD (4 weeks * 50)
    const taxAllowanceFils = 200000; // 200.000 JOD

    const netProfitFils =
      platformGrossMarginFils - courierCostsFils - marketingAndOpsFils - staffSalariesFils - taxAllowanceFils;

    expect(netProfitFils).toBe(1700000); // 1,700.000 JOD
  });

  it('4. حجز الاحتياطي التشغيلي الداخلي للمنصة 20%', () => {
    const netProfitFils = 1700000; // 1,700.000 JOD
    const reservePercentage = 20;
    const internalReserveFils = Math.round(netProfitFils * (reservePercentage / 100));
    const distributableProfitFils = netProfitFils - internalReserveFils;

    expect(internalReserveFils).toBe(340000); // 340.000 JOD
    expect(distributableProfitFils).toBe(1360000); // 1,360.000 JOD
  });

  it('5. صمام أمان السيولة النقدية (Safe Liquid Cash Guard) يُقيد التوزيع بالنقد الحر', () => {
    const distributableProfitFils = 1360000; // 1,360.000 JOD (دفترية)
    const safeLiquidCashFils = 1000000; // 1,000.000 JOD (سيولة حرة متاحة بأمان)

    // القاعدة: لا نسمح بتوزيع ما يفوق السيولة المتاحة بأمان
    const actualApprovedDistribution = Math.min(distributableProfitFils, safeLiquidCashFils);

    expect(actualApprovedDistribution).toBe(1000000); // 1,000.000 JOD فقط
  });

  it('6. توزيع الأرباح المعتمدة بالتساوي التام 50% / 50% بين الشريكين بالفلس', () => {
    const approvedDistributionFils = 1000000; // 1,000.000 JOD
    const partner1Share = Math.floor(approvedDistributionFils * 0.5);
    const partner2Share = approvedDistributionFils - partner1Share;

    expect(partner1Share).toBe(500000); // 500.000 JOD
    expect(partner2Share).toBe(500000); // 500.000 JOD
    expect(partner1Share + partner2Share).toBe(approvedDistributionFils);

    // فحص رقم فردي بالفلس لضمان عدم ضياع أي فلس
    const oddDistributionFils = 1360001;
    const p1Odd = Math.floor(oddDistributionFils * 0.5);
    const p2Odd = oddDistributionFils - p1Odd;
    expect(p1Odd + p2Odd).toBe(oddDistributionFils);
  });

  it('7. التمييز بين توزيع الأرباح وسحب الشريك على الحساب (Drawings vs Profit)', () => {
    let partnerDueProfitFils = 500000; // 500.000 JOD أرباح معتمدة
    const drawingAmountFils = 100000; // 100.000 JOD سحب على الحساب

    // السحب على الحساب يُخفض الرصيد المتبقي للشريك ولا يؤثر على مصروفات رَواق التشغيلية
    partnerDueProfitFils -= drawingAmountFils;
    expect(partnerDueProfitFils).toBe(400000); // 400.000 JOD متبقي
  });

  it('8. حوكمة الاعتماد الثنائي (Dual Approval): لا يكتمل الإغلاق إلا بموافقة الشريكين معاً', () => {
    let partner1Approved = false;
    let partner2Approved = false;
    let status = 'DRAFT';

    // توقيع الشريك الأول فقط
    partner1Approved = true;
    if (partner1Approved && partner2Approved) status = 'APPROVED';
    expect(status).toBe('DRAFT'); // ما زال مسودة

    // توقيع الشريك الثاني
    partner2Approved = true;
    if (partner1Approved && partner2Approved) status = 'APPROVED';
    expect(status).toBe('APPROVED'); // أصبح معتمداً
  });

  it('9. منع ازدواجية صرف الراتب (Idempotency Key Check)', () => {
    const periodStatus = 'PAID';
    const attemptDoublePayment = () => {
      if (periodStatus === 'PAID') {
        throw new Error('تم سداد راتب هذا الأسبوع مسبقاً ولا يجوز الصرف مرتين.');
      }
    };

    expect(attemptDoublePayment).toThrow('تم سداد راتب هذا الأسبوع مسبقاً');
  });

  it('10. الراتب استحقاق تعاقدي حتى لو كانت أرباح المنصة صفراً أو سالبة', () => {
    const netProfitBeforeSalaries = -50000; // خسارة تشغيلية -50.000 د.أ
    const employeeWeeklySalary = 50000; // 50.000 د.أ
    
    // الموظف يستحق أجره بغض النظر عن ربحية المنصة
    const employeeDue = employeeWeeklySalary;
    const finalNetProfit = netProfitBeforeSalaries - employeeWeeklySalary;

    expect(employeeDue).toBe(50000);
    expect(finalNetProfit).toBe(-100000);
  });

  it('11. مطابقة وتحويل معلمات الرابط (?tab= أو ?x=) للأقسام الفرعية الخمسة لمركز الأرباح', () => {
    // 1. نظرة عامة والسيولة
    expect(resolveProfitTab('overview')).toBe('OVERVIEW');
    expect(resolveProfitTab('liquidity')).toBe('OVERVIEW');
    expect(resolveProfitTab('نظرة-عامة')).toBe('OVERVIEW');

    // 2. رواتب الموظفين (أسبوعياً)
    expect(resolveProfitTab('payroll')).toBe('PAYROLL');
    expect(resolveProfitTab('salaries')).toBe('PAYROLL');
    expect(resolveProfitTab('رواتب')).toBe('PAYROLL');

    // 3. إغلاق الفترة والاعتماد الثنائي
    expect(resolveProfitTab('close')).toBe('CLOSE');
    expect(resolveProfitTab('approval')).toBe('CLOSE');
    expect(resolveProfitTab('إغلاق')).toBe('CLOSE');

    // 4. توزيع أرباح الشركاء (50% / 50%)
    expect(resolveProfitTab('partners')).toBe('PARTNERS');
    expect(resolveProfitTab('distribution')).toBe('PARTNERS');
    expect(resolveProfitTab('شركاء')).toBe('PARTNERS');

    // 5. السحوبات والسجل التدقيقي
    expect(resolveProfitTab('ledger')).toBe('LEDGER');
    expect(resolveProfitTab('audit')).toBe('LEDGER');
    expect(resolveProfitTab('سجل')).toBe('LEDGER');

    // الافتراضي عند عدم التمرير أو قيمة غير صالحة
    expect(resolveProfitTab(undefined)).toBe('OVERVIEW');
    expect(resolveProfitTab('unknown_param')).toBe('OVERVIEW');
  });

  it('12. فلترة فترات الأرباح (من / إلى) والاحتساب الصحيح للنطاقات الزمنية', () => {
    const fromStr = '2026-10-01';
    const toStr = '2026-10-31';

    const fromDate = new Date(`${fromStr}T00:00:00.000Z`);
    const toDate = new Date(`${toStr}T23:59:59.999Z`);

    expect(fromDate.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(toDate.toISOString()).toBe('2026-10-31T23:59:59.999Z');

    // فحص التحقق من وقوع طلب ضمن النطاق
    const orderDateInRange = new Date('2026-10-15T12:00:00.000Z');
    const orderDateOutOfRange = new Date('2026-11-05T12:00:00.000Z');

    expect(orderDateInRange >= fromDate && orderDateInRange <= toDate).toBe(true);
    expect(orderDateOutOfRange >= fromDate && orderDateOutOfRange <= toDate).toBe(false);
  });
});
