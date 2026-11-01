import { prisma } from '@/lib/db';
import { recordOperationalEvent } from '@/lib/audit';

export interface ProfitsKPIs {
  platformGrossMarginFils: number;
  estimatedNetProfitFils: number;
  dueSalariesFils: number;
  proposedDistributionFils: number;
  totalPeriodPoolFils: number;
  distributableProfitFils: number;
  grossRevenueFils: number;
  supplierObligationsFils: number;
  courierCostsFils: number;
  operatingExpensesFils: number;
  accruedSalariesFils: number;
  paidSalariesFils: number;
  internalReserveFils: number;
  safeLiquidCashFils: number;
  partner1ShareFils: number;
  partner2ShareFils: number;
}

export interface EmployeePayrollCard {
  employeeId: string;
  name: string;
  email: string;
  roleName: string;
  agreementId: string;
  payCycle: string;
  baseRateFils: number;
  contractType: string;
  weeklyAgreedHours: number;
  partnerSharePercentage?: number | null;
  notes?: string | null;
  currentPeriod: {
    id: string;
    reference: string;
    periodFrom: Date;
    periodTo: Date;
    grossAmountFils: number;
    deductionsFils: number;
    allowancesFils: number;
    netPayableFils: number;
    status: string; // ACCRUED, PAID
    paidAt?: Date | null;
    paymentReference?: string | null;
  };
  totalAccruedFils: number;
  totalPaidFils: number;
  dueBalanceFils: number;
}

export interface PartnerSummaryCard {
  ruleId: string;
  partnerName: string;
  sharePercentage: number;
  bankDetails: string | null;
  partnerEmployeeId?: string | null;
  linkedEmployeeName?: string | null;
  notes?: string | null;
  currentPeriodShareFils: number;
  totalApprovedDistributionsFils: number;
  totalPaidDistributionsFils: number;
  totalDrawingsOnAccountFils: number;
  totalAdminWagesFils: number;
  remainingDueFils: number;
}

export class ProfitsService {
  /**
   * 1. احتساب المؤشرات المالية الرئيسية (KPIs)
   */
  static async getProfitsKPIs(fromDate?: Date, toDate?: Date): Promise<ProfitsKPIs> {
    const periodFilter = fromDate && toDate ? {
      createdAt: { gte: fromDate, lte: toDate },
    } : {};

    // 1. إيرادات الطلبات المسلمة فعلياً
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        ...periodFilter,
      },
      select: {
        totalAmount: true,
        actualDeliveryCost: true,
        shippingCost: true,
      },
    });

    const grossRevenueFils = deliveredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    // 2. التزامات الموردين للأصناف المسلمة
    const deliveredItems = await prisma.orderItem.findMany({
      where: {
        order: { status: 'DELIVERED', ...periodFilter },
        supplierIdSnapshot: { not: null },
      },
      select: {
        unitCostSnapshot: true,
        quantity: true,
        supplierAmountSnapshot: true,
      },
    });

    const supplierObligationsFils = deliveredItems.reduce((acc, item) => {
      const cost = (item.unitCostSnapshot ?? 0) * item.quantity;
      const profit = item.supplierAmountSnapshot ?? 0;
      return acc + cost + profit;
    }, 0);

    // هامش نشاط رَواق (Platform Gross Margin)
    const platformGrossMarginFils = Math.max(0, grossRevenueFils - supplierObligationsFils);

    // 3. تكاليف التوصيل
    const courierCostsFils = deliveredOrders.reduce(
      (sum, o) => sum + (o.actualDeliveryCost ?? o.shippingCost ?? 0),
      0
    );

    // 4. المصاريف التشغيلية (تسويق، برمجيات، ضيافة...)
    const expenseDateFilter = fromDate && toDate ? {
      expenseDate: { gte: fromDate, lte: toDate },
    } : {};

    const expensesAgg = await prisma.expense.aggregate({
      where: expenseDateFilter,
      _sum: { amount: true },
    });
    const operatingExpensesFils = expensesAgg._sum.amount || 0;

    // 5. رواتب الموظفين (المستحقة والمدفوعة)
    const payrollFilter = fromDate && toDate ? {
      periodFrom: { gte: fromDate },
      periodTo: { lte: toDate },
    } : {};

    const [accruedSalariesAgg, paidSalariesAgg] = await Promise.all([
      prisma.payrollPeriod.aggregate({
        where: { status: { in: ['ACCRUED', 'PAID'] }, ...payrollFilter },
        _sum: { netPayableFils: true },
      }),
      prisma.payrollPayment.aggregate({
        where: fromDate && toDate ? { paidAt: { gte: fromDate, lte: toDate } } : {},
        _sum: { amountFils: true },
      }),
    ]);

    const accruedSalariesFils = accruedSalariesAgg._sum.netPayableFils || 0;
    const paidSalariesFils = paidSalariesAgg._sum.amountFils || 0;
    const dueSalariesFils = Math.max(0, accruedSalariesFils - paidSalariesFils);

    // 6. صافي الربح المحاسبي
    const estimatedNetProfitFils =
      platformGrossMarginFils - courierCostsFils - operatingExpensesFils - accruedSalariesFils;

    // 7. الاحتياطي التشغيلي الداخلي (20%)
    const internalReserveFils =
      estimatedNetProfitFils > 0 ? Math.round(estimatedNetProfitFils * 0.2) : 0;

    // 8. الربح القابل للتوزيع دفترياً
    const distributableProfitFils = Math.max(0, estimatedNetProfitFils - internalReserveFils);

    // 9. فحص السيولة النقدية الحرة الآمنة وسحوبات الشركاء
    // النقد المحصل فعلياً لخزينة رَواق مطروحاً منه استحقاقات الموردين ومصاريف التشغيل والرواتب
    const payoutFilter = fromDate && toDate ? {
      paidAt: { gte: fromDate, lte: toDate },
    } : {};

    const [totalCodSettledAgg, totalSupplierPaidAgg, totalPartnerPayoutsAgg, partnerRules] = await Promise.all([
      prisma.financialTransaction.aggregate({
        where: { type: 'COD_SETTLEMENT' },
        _sum: { amount: true },
      }),
      prisma.financialTransaction.aggregate({
        where: { type: 'SUPPLIER_PAYMENT' },
        _sum: { amount: true },
      }),
      prisma.partnerPayout.aggregate({
        where: payoutFilter,
        _sum: { amountFils: true },
      }),
      prisma.partnerShareRule.findMany({
        where: { isActive: true },
        include: {
          payouts: {
            where: payoutFilter,
          },
        },
      }),
    ]);

    const totalCashIn = totalCodSettledAgg._sum.amount || 0;
    const operationalCashOut =
      (totalSupplierPaidAgg._sum.amount || 0) +
      operatingExpensesFils +
      paidSalariesFils;

    // السيولة النقدية التشغيلية المتاحة لتوزيعات الفترة (قبل خصم سحوبات الشركاء كحقوق ملكية):
    const operationalLiquidCashBeforePartnerDraws = Math.max(
      0,
      totalCashIn - operationalCashOut - dueSalariesFils
    );

    // إجمالي وعاء أرباح الفترة المتاح للتوزيع بين الشركاء (مقيداً بالسيولة التشغيلية الكلية للمنصة):
    const totalPeriodPoolFils = Math.min(
      distributableProfitFils,
      operationalLiquidCashBeforePartnerDraws
    );

    // النقد الفعلي المتبقي في الخزينة بعد خصم المسحوبات المصروفة فعلياً للشركاء:
    const totalPartnerPayoutsFils = totalPartnerPayoutsAgg._sum.amountFils || 0;
    const safeLiquidCashFils = Math.max(
      0,
      operationalLiquidCashBeforePartnerDraws - totalPartnerPayoutsFils
    );

    // حساب استحقاقات كل شريك من وعاء أرباح الفترة مطروحاً منها مسحوباته الفردية:
    let partner1ShareFils = 0;
    let partner2ShareFils = 0;
    let totalUnpaidPartnerSharesFils = 0;

    const p1Rule = partnerRules[0];
    const p2Rule = partnerRules[1];

    if (p1Rule) {
      const p1GrossShare = Math.floor(totalPeriodPoolFils * (p1Rule.sharePercentage / 100));
      const p1Paid = p1Rule.payouts.reduce((sum, p) => sum + p.amountFils, 0);
      partner1ShareFils = Math.max(0, p1GrossShare - p1Paid);
      totalUnpaidPartnerSharesFils += partner1ShareFils;
    }

    if (p2Rule) {
      const p2GrossShare = Math.floor(totalPeriodPoolFils * (p2Rule.sharePercentage / 100));
      const p2Paid = p2Rule.payouts.reduce((sum, p) => sum + p.amountFils, 0);
      partner2ShareFils = Math.max(0, p2GrossShare - p2Paid);
      totalUnpaidPartnerSharesFils += partner2ShareFils;
    }

    // الأرباح المقترحة للتوزيع: صافي المستحقات المتبقية غير المصروفة للشركاء ومقيدة بالسيولة الفعلية بالخزينة
    const proposedDistributionFils = Math.min(safeLiquidCashFils, totalUnpaidPartnerSharesFils);

    return {
      platformGrossMarginFils,
      estimatedNetProfitFils,
      dueSalariesFils,
      proposedDistributionFils,
      totalPeriodPoolFils,
      distributableProfitFils,
      grossRevenueFils,
      supplierObligationsFils,
      courierCostsFils,
      operatingExpensesFils,
      accruedSalariesFils,
      paidSalariesFils,
      internalReserveFils,
      safeLiquidCashFils,
      partner1ShareFils,
      partner2ShareFils,
    };
  }

  /**
   * 2. إدارة رواتب الموظفين مع اتفاقيات العمل والأسبوع الجاري
   */
  static async getEmployeePayrollList(): Promise<EmployeePayrollCard[]> {
    const [employees, partnerRules] = await Promise.all([
      prisma.employee.findMany({
        where: { isActive: true },
        include: {
          role: true,
          payAgreements: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          payrollPeriods: {
            orderBy: { periodFrom: 'desc' },
            include: { payment: true },
          },
        },
      }),
      prisma.partnerShareRule.findMany({
        where: { isActive: true },
      }),
    ]);

    const now = new Date();
    // حساب بداية ونهاية الأسبوع الحالي (الإثنين إلى الأحد)
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - distanceToMonday);
    currentWeekStart.setHours(0, 0, 0, 0);

    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
    currentWeekEnd.setHours(23, 59, 59, 999);

    const cards: EmployeePayrollCard[] = [];

    for (const emp of employees) {
      // إذا لم يكن لدى الموظف اتفاقية راتب سابقة، ننشئ اتفاقية افتراضية بـ 50 د.أ أسبوعياً
      let agreement = emp.payAgreements[0];
      if (!agreement) {
        agreement = await prisma.employeePayAgreement.create({
          data: {
            employeeId: emp.id,
            payCycle: 'WEEKLY',
            baseRateFils: 50000, // 50.000 JOD
            currency: 'JOD',
            contractType: 'PART_TIME',
            weeklyAgreedHours: 20,
            notes: 'الاتفاقية الافتراضية المعتمدة لرَواق (50 د.أ أسبوعياً)',
          },
        });
      }

      // فحص إذا كان الموظف شريكاً أيضاً في المنصة
      const linkedPartner = partnerRules.find((r) => r.partnerEmployeeId === emp.id);

      // البحث عن فترة الأسبوع الحالي أو إنشاؤها تلقائياً كاستحقاق (Accrual)
      let currentPeriod = emp.payrollPeriods.find(
        (p) =>
          new Date(p.periodFrom).getTime() <= now.getTime() &&
          new Date(p.periodTo).getTime() >= now.getTime()
      );

      if (!currentPeriod) {
        const weekNum = Math.ceil((now.getDate() + 6 - now.getDay()) / 7);
        const ref = `PAYROLL-${now.getFullYear()}-W${weekNum}-${emp.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        currentPeriod = await prisma.payrollPeriod.create({
          data: {
            reference: ref,
            employeeId: emp.id,
            agreementId: agreement.id,
            periodFrom: currentWeekStart,
            periodTo: currentWeekEnd,
            grossAmountFils: agreement.baseRateFils,
            deductionsFils: 0,
            allowancesFils: 0,
            netPayableFils: agreement.baseRateFils,
            status: 'ACCRUED',
            notes: `استحقاق أسبوعي للأسبوع الحالي`,
          },
          include: { payment: true },
        });
      }

      const totalAccruedFils = emp.payrollPeriods.reduce(
        (sum, p) => sum + (p.status !== 'CANCELLED' ? p.netPayableFils : 0),
        0
      );
      const totalPaidFils = emp.payrollPeriods.reduce(
        (sum, p) => sum + (p.status === 'PAID' && p.payment ? p.payment.amountFils : 0),
        0
      );
      const dueBalanceFils = Math.max(0, totalAccruedFils - totalPaidFils);

      cards.push({
        employeeId: emp.id,
        name: emp.name,
        email: emp.email,
        roleName: emp.role?.name || 'موظف',
        agreementId: agreement.id,
        payCycle: agreement.payCycle,
        baseRateFils: agreement.baseRateFils,
        contractType: agreement.contractType,
        weeklyAgreedHours: agreement.weeklyAgreedHours || 20,
        partnerSharePercentage: linkedPartner ? linkedPartner.sharePercentage : null,
        notes: agreement.notes,
        currentPeriod: {
          id: currentPeriod.id,
          reference: currentPeriod.reference,
          periodFrom: currentPeriod.periodFrom,
          periodTo: currentPeriod.periodTo,
          grossAmountFils: currentPeriod.grossAmountFils,
          deductionsFils: currentPeriod.deductionsFils,
          allowancesFils: currentPeriod.allowancesFils,
          netPayableFils: currentPeriod.netPayableFils,
          status: currentPeriod.status,
          paidAt: currentPeriod.payment?.paidAt || null,
          paymentReference: currentPeriod.payment?.paymentReference || null,
        },
        totalAccruedFils,
        totalPaidFils,
        dueBalanceFils,
      });
    }

    return cards;
  }

  /**
   * تعديل أو تحديث اتفاقية راتب الموظف (الأجر وساعات العمل والنوع)
   */
  static async updateEmployeePayAgreement(
    employeeId: string,
    input: {
      baseRateFils: number;
      contractType: string;
      weeklyAgreedHours: number;
      notes?: string;
    },
    adminEmployeeId: string,
    adminName: string
  ) {
    if (input.baseRateFils <= 0) {
      throw new Error('قيمة الراتب يجب أن تكون أكبر من صفر.');
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        payAgreements: { where: { isActive: true }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!employee) throw new Error('الموظف غير موجود.');

    return await prisma.$transaction(async (tx) => {
      const currentAgreement = employee.payAgreements[0];
      let agreement;
      if (currentAgreement) {
        agreement = await tx.employeePayAgreement.update({
          where: { id: currentAgreement.id },
          data: {
            baseRateFils: input.baseRateFils,
            contractType: input.contractType,
            weeklyAgreedHours: input.weeklyAgreedHours,
            notes: input.notes || null,
          },
        });
      } else {
        agreement = await tx.employeePayAgreement.create({
          data: {
            employeeId,
            payCycle: 'WEEKLY',
            baseRateFils: input.baseRateFils,
            contractType: input.contractType,
            weeklyAgreedHours: input.weeklyAgreedHours,
            notes: input.notes || null,
            createdByEmployeeId: adminEmployeeId,
          },
        });
      }

      // تحديث قيمة فترة الاستحقاق الحالية غير المسددة لتعكس الراتب الجديد فوراً
      const pendingPeriods = await tx.payrollPeriod.findMany({
        where: {
          employeeId,
          status: 'ACCRUED',
        },
      });

      for (const p of pendingPeriods) {
        const net = Math.max(0, input.baseRateFils - p.deductionsFils + p.allowancesFils);
        await tx.payrollPeriod.update({
          where: { id: p.id },
          data: {
            grossAmountFils: input.baseRateFils,
            netPayableFils: net,
            notes: `تم تحديث قيمة الاستحقاق بناءً على تعديل الراتب التعاقدي إلى ${(input.baseRateFils / 1000).toFixed(3)} د.أ`,
          },
        });
      }

      await recordOperationalEvent({
        employeeId: adminEmployeeId,
        action: 'UPDATE_EMPLOYEE_PAY_AGREEMENT',
        entityType: 'EMPLOYEE_PAY_AGREEMENT',
        entityId: agreement.id,
        category: 'ACCOUNTING',
        outcome: 'SUCCESS',
        details: {
          employeeName: employee.name,
          baseRateFils: input.baseRateFils,
          contractType: input.contractType,
          weeklyAgreedHours: input.weeklyAgreedHours,
          updatedBy: adminName,
        },
      });

      return agreement;
    });
  }

  /**
   * 3. صرف وسداد راتب الموظف مع منع التكرار (Idempotent Disbursement)
   */
  static async disburseSalaryPayment(
    payrollPeriodId: string,
    input: {
      amountFils?: number;
      paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CLIK';
      paymentReference?: string;
      notes?: string;
    },
    adminEmployeeId: string,
    adminEmployeeName: string
  ) {
    const period = await prisma.payrollPeriod.findUnique({
      where: { id: payrollPeriodId },
      include: { employee: true, payment: true },
    });

    if (!period) throw new Error('فترة الراتب غير موجودة.');
    if (period.status === 'PAID' || period.payment) {
      throw new Error('تم سداد راتب هذا الأسبوع مسبقاً ولا يجوز الصرف مرتين.');
    }

    const payAmount = input.amountFils ?? period.netPayableFils;
    const idempotencyKey = `payroll-payout:${period.id}`;
    const paymentRef = `PAY-${period.reference}-${Date.now().toString().slice(-4)}`;

    return await prisma.$transaction(async (tx) => {
      // 1. تسجيل قيد مالي في الدفتر المركزي
      const finTx = await tx.financialTransaction.create({
        data: {
          type: 'SALARY_PAYMENT',
          direction: 'OUT',
          amount: payAmount,
          businessEventKey: idempotencyKey,
          description: `سداد راتب الموظف ${period.employee.name} للفترة ${period.reference}`,
          createdByEmployeeId: adminEmployeeId,
        },
      });

      // 2. تسجيل دفعة الرواتب
      const payment = await tx.payrollPayment.create({
        data: {
          reference: paymentRef,
          payrollPeriodId: period.id,
          amountFils: payAmount,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference || null,
          paidByEmployeeId: adminEmployeeId,
          idempotencyKey,
          notes: input.notes || null,
          financialTxId: finTx.id,
        },
      });

      // 3. تحديث حالة فترة الراتب إلى PAID
      await tx.payrollPeriod.update({
        where: { id: period.id },
        data: { status: 'PAID' },
      });

      // 4. توثيق سجل التدقيق
      await recordOperationalEvent({
        employeeId: adminEmployeeId,
        action: 'DISBURSE_PAYROLL',
        entityType: 'PAYROLL_PAYMENT',
        entityId: payment.id,
        category: 'ACCOUNTING',
        outcome: 'SUCCESS',
        details: {
          employeeName: period.employee.name,
          periodReference: period.reference,
          amountFils: payAmount,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference,
        },
      });

      return payment;
    });
  }

  /**
   * 4. إدارة الشركاء ونسب الملكية
   */
  static async getPartnersSummary(fromDate?: Date, toDate?: Date): Promise<PartnerSummaryCard[]> {
    const payoutFilter = fromDate && toDate ? {
      paidAt: { gte: fromDate, lte: toDate },
    } : {};

    const [rulesFound, employees, kpis] = await Promise.all([
      prisma.partnerShareRule.findMany({
        where: { isActive: true },
        include: {
          payouts: {
            where: payoutFilter,
            orderBy: { paidAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true },
      }),
      this.getProfitsKPIs(fromDate, toDate),
    ]);

    let rules = rulesFound;

    // إذا لم تكن قواعد الشركاء معرفة، ننشئ الشريك الأول والشريك الثاني تلقائياً (50/50)
    if (rules.length === 0) {
      const p1 = await prisma.partnerShareRule.create({
        data: {
          partnerName: 'الشريك الأول',
          sharePercentage: 50,
          notes: 'حصة ملكية 50% من أرباح رَواق المعتمدة',
        },
        include: { payouts: true },
      });
      const p2 = await prisma.partnerShareRule.create({
        data: {
          partnerName: 'الشريك الثاني',
          sharePercentage: 50,
          notes: 'حصة ملكية 50% من أرباح رَواق المعتمدة',
        },
        include: { payouts: true },
      });
      rules = [p1, p2];
    }

    // استخراج إجمالي التوزيعات المعتمدة من الفترات المالية المغلقة
    const approvedDistributions = await prisma.profitDistribution.findMany({
      where: {
        profitClose: {
          status: { in: ['APPROVED', 'CLOSED'] },
          ...(fromDate && toDate
            ? {
                OR: [
                  { closedAt: { gte: fromDate, lte: toDate } },
                  { closedAt: null, createdAt: { gte: fromDate, lte: toDate } },
                ],
              }
            : {}),
        },
      },
    });

    const totalApprovedDistributions = approvedDistributions.reduce(
      (sum, d) => sum + d.totalDistributedFils,
      0
    );

    return rules.map((r) => {
      // 1. حصة الشريك من وعاء أرباح الفترة الجارية (وفق نسبة ملكيته قبل سحوباته الفردية)
      const currentPeriodShareFils = Math.floor(
        kpis.totalPeriodPoolFils * (r.sharePercentage / 100)
      );

      // 2. حصة الشريك المعتمدة من الإغلاقات السابقة
      const totalApprovedDistributionsFils = Math.floor(
        totalApprovedDistributions * (r.sharePercentage / 100)
      );

      // 3. إجمالي الاستحقاق المالي المخصص للشريك (الفترة الجارية المتاحة + المعتمد من الفترات السابقة)
      const totalEligibleFils = totalApprovedDistributionsFils + currentPeriodShareFils;

      // 4. المسحوبات الفعلية المصروفة للشريك
      const totalPaidDistributionsFils = r.payouts
        .filter((p) => p.payoutType === 'PROFIT_DISTRIBUTION')
        .reduce((sum, p) => sum + p.amountFils, 0);

      const totalDrawingsOnAccountFils = r.payouts
        .filter((p) => p.payoutType === 'DRAWING_ON_ACCOUNT')
        .reduce((sum, p) => sum + p.amountFils, 0);

      const totalAdminWagesFils = r.payouts
        .filter((p) => p.payoutType === 'ADMINISTRATIVE_WAGE')
        .reduce((sum, p) => sum + p.amountFils, 0);

      const totalDrawnFils = totalPaidDistributionsFils + totalDrawingsOnAccountFils;

      // 5. الرصيد الصافي المتبقي المستحق للصرف للشريك (مقيداً بسقف السيولة المتاحة فعلياً في الخزينة)
      const bookRemainingFils = Math.max(0, totalEligibleFils - totalDrawnFils);
      const remainingDueFils = Math.min(kpis.safeLiquidCashFils, bookRemainingFils);

      const linkedEmp = r.partnerEmployeeId
        ? employees.find((e) => e.id === r.partnerEmployeeId)
        : null;

      return {
        ruleId: r.id,
        partnerName: r.partnerName,
        sharePercentage: r.sharePercentage,
        bankDetails: r.bankDetails,
        partnerEmployeeId: r.partnerEmployeeId,
        linkedEmployeeName: linkedEmp?.name || null,
        notes: r.notes,
        currentPeriodShareFils,
        totalApprovedDistributionsFils,
        totalPaidDistributionsFils,
        totalDrawingsOnAccountFils,
        totalAdminWagesFils,
        remainingDueFils,
      };
    });
  }

  /**
   * تعديل وحفظ نسب الشركاء وربطهم بالموظفين (مع فحص مجموع النسب = 100%)
   */
  static async updatePartnerShareRules(
    rules: Array<{
      id?: string;
      partnerName: string;
      sharePercentage: number;
      partnerEmployeeId?: string | null;
      bankDetails?: string | null;
      notes?: string | null;
      isActive?: boolean;
    }>,
    adminEmployeeId: string,
    adminName: string
  ) {
    const activeRules = rules.filter((r) => r.isActive !== false);
    const totalPercentage = activeRules.reduce((sum, r) => sum + r.sharePercentage, 0);

    if (totalPercentage !== 100) {
      throw new Error(`مجموع نسب الشركاء يجب أن يساوي 100% تماماً. المجموع الحالي: ${totalPercentage}%`);
    }

    return await prisma.$transaction(async (tx) => {
      const results = [];

      for (const r of rules) {
        if (r.id) {
          const updated = await tx.partnerShareRule.update({
            where: { id: r.id },
            data: {
              partnerName: r.partnerName,
              sharePercentage: r.sharePercentage,
              partnerEmployeeId: r.partnerEmployeeId || null,
              bankDetails: r.bankDetails || null,
              notes: r.notes || null,
              isActive: r.isActive !== false,
            },
          });
          results.push(updated);
        } else {
          const created = await tx.partnerShareRule.create({
            data: {
              partnerName: r.partnerName,
              sharePercentage: r.sharePercentage,
              partnerEmployeeId: r.partnerEmployeeId || null,
              bankDetails: r.bankDetails || null,
              notes: r.notes || null,
              isActive: r.isActive !== false,
            },
          });
          results.push(created);
        }
      }

      await recordOperationalEvent({
        employeeId: adminEmployeeId,
        action: 'UPDATE_PARTNER_SHARE_RULES',
        entityType: 'PARTNER_SHARE_RULE',
        entityId: 'ALL_RULES',
        category: 'ACCOUNTING',
        outcome: 'SUCCESS',
        details: {
          partnersCount: rules.length,
          rulesSummary: rules.map((r) => ({
            name: r.partnerName,
            share: `${r.sharePercentage}%`,
            linkedEmployeeId: r.partnerEmployeeId,
          })),
          updatedBy: adminName,
        },
      });

      return results;
    });
  }

  /**
   * 5. صرف دفعة لأحد الشركاء (توزيع أرباح أو سحب على الحساب أو أجر إداري)
   */
  static async disbursePartnerPayout(
    partnerRuleId: string,
    input: {
      amountFils: number;
      payoutType: 'PROFIT_DISTRIBUTION' | 'DRAWING_ON_ACCOUNT' | 'ADMINISTRATIVE_WAGE';
      paymentMethod: string;
      paymentReference?: string;
      notes?: string;
    },
    adminEmployeeId: string,
    adminEmployeeName: string
  ) {
    const partner = await prisma.partnerShareRule.findUnique({
      where: { id: partnerRuleId },
    });

    if (!partner) throw new Error('الشريك غير مسجل.');
    if (input.amountFils <= 0) throw new Error('مبلغ الصرف يجب أن يكون أكبر من صفر.');

    // التحقق الصارم من الرصيد المستحق للشريك (منع السحب الزائد عن الاستحقاق نهائياً)
    const partnersSummary = await this.getPartnersSummary();
    const partnerCard = partnersSummary.find((p) => p.ruleId === partnerRuleId);

    if (!partnerCard) throw new Error('بيانات الحساب المالي للشريك غير متوفرة.');

    if (input.amountFils > partnerCard.remainingDueFils) {
      throw new Error(
        `المبلغ المطلوب (${(input.amountFils / 1000).toFixed(3)} د.أ) يتجاوز الرصيد المستحق للشريك (${(partnerCard.remainingDueFils / 1000).toFixed(3)} د.أ). يمنع النظام صرف مبالغ تتجاوز حصة الشريك المقررة لمنع أي ذمم أو تناقضات مالية.`
      );
    }

    const idempotencyKey = `partner-payout:${partner.id}:${Date.now()}`;
    const ref = `POUT-${partner.partnerName === 'الشريك الأول' ? 'P1' : 'P2'}-${Date.now().toString().slice(-5)}`;

    return await prisma.$transaction(async (tx) => {
      // 1. تسجيل قيد مالي في الدفتر المركزي
      const finTx = await tx.financialTransaction.create({
        data: {
          type:
            input.payoutType === 'PROFIT_DISTRIBUTION'
              ? 'PARTNER_DISTRIBUTION_PAYOUT'
              : input.payoutType === 'DRAWING_ON_ACCOUNT'
              ? 'PARTNER_DRAWING'
              : 'ADMINISTRATIVE_EXPENSE',
          direction: 'OUT',
          amount: input.amountFils,
          businessEventKey: idempotencyKey,
          description: `صرف ${
            input.payoutType === 'PROFIT_DISTRIBUTION'
              ? 'توزيع أرباح'
              : input.payoutType === 'DRAWING_ON_ACCOUNT'
              ? 'سحب على الحساب'
              : 'أجر إداري'
          } لصالح ${partner.partnerName}`,
          createdByEmployeeId: adminEmployeeId,
        },
      });

      // 2. تسجيل دفعة الشريك
      const payout = await tx.partnerPayout.create({
        data: {
          reference: ref,
          partnerRuleId: partner.id,
          payoutType: input.payoutType,
          amountFils: input.amountFils,
          paymentMethod: input.paymentMethod || 'BANK_TRANSFER',
          paymentReference: input.paymentReference || null,
          authorizedByAdmin: adminEmployeeName,
          idempotencyKey,
          notes: input.notes || null,
          financialTxId: finTx.id,
        },
      });

      // 3. توثيق سجل التدقيق
      await recordOperationalEvent({
        employeeId: adminEmployeeId,
        action: 'DISBURSE_PARTNER_PAYOUT',
        entityType: 'PARTNER_PAYOUT',
        entityId: payout.id,
        category: 'ACCOUNTING',
        outcome: 'SUCCESS',
        details: {
          partnerName: partner.partnerName,
          payoutType: input.payoutType,
          amountFils: input.amountFils,
          paymentReference: input.paymentReference,
        },
      });

      return payout;
    });
  }

  /**
   * 6. معالج إغلاق الفترة المالية واعتماد توزيع الأرباح (Dual Approval)
   */
  static async createPeriodCloseDraft(
    periodFrom: Date,
    periodTo: Date,
    adminEmployeeId: string,
    notes?: string
  ) {
    const kpis = await this.getProfitsKPIs(periodFrom, periodTo);
    const ref = `PCLOSE-${periodFrom.getFullYear()}-${(periodFrom.getMonth() + 1).toString().padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

    return await prisma.profitClose.create({
      data: {
        reference: ref,
        periodFrom,
        periodTo,
        grossRevenueFils: kpis.grossRevenueFils,
        supplierObligationsFils: kpis.supplierObligationsFils,
        platformGrossMarginFils: kpis.platformGrossMarginFils,
        courierCostsFils: kpis.courierCostsFils,
        operatingExpensesFils: kpis.operatingExpensesFils,
        staffSalariesFils: kpis.accruedSalariesFils,
        netProfitFils: kpis.estimatedNetProfitFils,
        reservePercentage: 20,
        internalReserveFils: kpis.internalReserveFils,
        distributableProfitFils: kpis.distributableProfitFils,
        safeLiquidCashFils: kpis.safeLiquidCashFils,
        actualApprovedDistributionFils: kpis.proposedDistributionFils,
        status: 'DRAFT',
        notes: notes || 'مسودة إغلاق الفترة المالية لمراجعة واعتماد الشريكين',
        closedByEmployeeId: adminEmployeeId,
      },
    });
  }

  /**
   * اعتماد الإغلاق من أحد الشريكين (Dual Approval Guard)
   */
  static async approvePeriodCloseByPartner(
    closeId: string,
    partnerNumber: 1 | 2,
    adminEmployeeId: string,
    adminName: string
  ) {
    const close = await prisma.profitClose.findUnique({
      where: { id: closeId },
    });
    if (!close) throw new Error('سجل الإغلاق المالي غير موجود.');

    const updateData: any = {};
    if (partnerNumber === 1) {
      updateData.partner1Approved = true;
      updateData.partner1ApprovedAt = new Date();
      updateData.partner1EmployeeId = adminEmployeeId;
    } else {
      updateData.partner2Approved = true;
      updateData.partner2ApprovedAt = new Date();
      updateData.partner2EmployeeId = adminEmployeeId;
    }

    const isFullyApproved =
      (partnerNumber === 1 ? true : close.partner1Approved) &&
      (partnerNumber === 2 ? true : close.partner2Approved);

    if (isFullyApproved) {
      updateData.status = 'APPROVED';
      updateData.closedAt = new Date();
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.profitClose.update({
        where: { id: closeId },
        data: updateData,
      });

      // إذا اكتملت موافقة الشريكين معاً، يتم إنشاء قيد توزيع الأرباح 50/50
      if (isFullyApproved && close.actualApprovedDistributionFils > 0) {
        const p1Amount = Math.floor(close.actualApprovedDistributionFils * 0.5);
        const p2Amount = close.actualApprovedDistributionFils - p1Amount;

        await tx.profitDistribution.create({
          data: {
            reference: `DISTRIB-${close.reference}`,
            profitCloseId: close.id,
            totalDistributedFils: close.actualApprovedDistributionFils,
            partner1AmountFils: p1Amount,
            partner2AmountFils: p2Amount,
            status: 'PENDING_PAYOUT',
          },
        });
      }

      await recordOperationalEvent({
        employeeId: adminEmployeeId,
        action: 'APPROVE_PROFIT_CLOSE',
        entityType: 'PROFIT_CLOSE',
        entityId: close.id,
        category: 'ACCOUNTING',
        outcome: 'SUCCESS',
        details: {
          partnerNumber,
          approvedBy: adminName,
          isFullyApproved,
          reference: close.reference,
        },
      });

      return updated;
    });
  }

  /**
   * 7. سجل القيود التاريخي المتكامل (Full Ledger)
   */
  static async getProfitsFullLedger(limit = 50, fromDate?: Date, toDate?: Date) {
    const dateFilter = fromDate && toDate ? { gte: fromDate, lte: toDate } : undefined;

    const [payments, payouts, closes] = await Promise.all([
      prisma.payrollPayment.findMany({
        where: dateFilter ? { paidAt: dateFilter } : {},
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: { payrollPeriod: { include: { employee: true } } },
      }),
      prisma.partnerPayout.findMany({
        where: dateFilter ? { paidAt: dateFilter } : {},
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: { partnerRule: true },
      }),
      prisma.profitClose.findMany({
        where: dateFilter ? { createdAt: dateFilter } : {},
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const events: any[] = [];

    for (const p of payments) {
      events.push({
        id: p.id,
        reference: p.reference,
        category: 'PAYROLL',
        title: `سداد راتب: ${p.payrollPeriod.employee.name}`,
        subtitle: `الفترة: ${p.payrollPeriod.reference} • ${p.paymentMethod}`,
        amountFils: p.amountFils,
        direction: 'OUT',
        date: p.paidAt,
        status: 'PAID',
        admin: p.paidByEmployeeId,
      });
    }

    for (const p of payouts) {
      events.push({
        id: p.id,
        reference: p.reference,
        category: 'PARTNER',
        title: `دفعة شريك: ${p.partnerRule.partnerName}`,
        subtitle: `${p.payoutType === 'PROFIT_DISTRIBUTION' ? 'توزيع أرباح معتمدة' : p.payoutType === 'DRAWING_ON_ACCOUNT' ? 'سحب على الحساب' : 'أجر إداري'} • ${p.paymentMethod}`,
        amountFils: p.amountFils,
        direction: 'OUT',
        date: p.paidAt,
        status: 'PAID',
        admin: p.authorizedByAdmin,
      });
    }

    for (const c of closes) {
      events.push({
        id: c.id,
        reference: c.reference,
        category: 'PERIOD_CLOSE',
        title: `إغلاق مالي: ${c.reference}`,
        subtitle: `صافي الربح: ${(c.netProfitFils / 1000).toFixed(3)} د.أ • المعتمد: ${(c.actualApprovedDistributionFils / 1000).toFixed(3)} د.أ`,
        amountFils: c.actualApprovedDistributionFils,
        direction: 'HOLD',
        date: c.closedAt || c.createdAt,
        status: c.status,
        admin: c.closedByEmployeeId || 'النظام',
      });
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
