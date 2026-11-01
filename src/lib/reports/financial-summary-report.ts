import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface FinancialSummaryReportFilter {
  from?: Date;
  to?: Date;
  isDetailed?: boolean;
}

export interface FinancialSummaryData {
  grossProductSalesFils: number;
  allDiscountsFils: number;
  netProductSalesFils: number;
  productCostsFils: number;
  grossProductProfitFils: number;
  shopObligationsFils: number;
  shopPaidFils: number;
  shopRemainingBalanceFils: number;
  deliveryRevenueFils: number;
  deliveryCarrierCostFils: number;
  deliveryNetProfitFils: number;
  operatingExpensesFils: number;
  grossCommercialProfitFils: number;
  netOperatingProfitFils: number;
  codCustodyWithCarriersFils: number;
}

export interface FinancialSummaryReportResult {
  reportTitle: string;
  department: 'FINANCIAL_SUMMARY';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  data: FinancialSummaryData;
  columns: string[];
  rows: string[][];
}

/**
 * التقرير المالي الشامل وقائمة الأرباح والخسائر (P&L + Working Capital):
 * يعرض ملخص العمليات، الإيرادات، التكاليف المباشرة، مستحقات المحلات، أرباح التوصيل،
 * والمصروفات التشغيلية، وصافي الربح التشغيلي، وموقف عهد النقد السائل.
 */
export async function generateFinancialSummaryReport(
  filter: FinancialSummaryReportFilter = {}
): Promise<FinancialSummaryReportResult> {
  const dateFilter = filter.from || filter.to ? {
    createdAt: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  const expenseDateFilter = filter.from || filter.to ? {
    expenseDate: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  const [txSums, expenseSum, undeliveredJobs] = await Promise.all([
    prisma.financialTransaction.groupBy({
      by: ['type'],
      where: dateFilter,
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: expenseDateFilter,
      _sum: { amount: true },
    }),
    prisma.deliveryJob.findMany({
      where: {
        codStatus: 'COLLECTED_BY_COURIER',
        ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
      },
      select: { codAmountToCollect: true },
    }),
  ]);

  const sumMap = new Map<string, number>(txSums.map(t => [t.type, t._sum.amount ?? 0]));
  const sum = (type: string) => sumMap.get(type) ?? 0;

  // 1. مبيعات المنتجات والخصومات
  const grossSales = sum('SALE') - sum('SALE_REVERSAL');
  const allDiscounts =
    sum('DISCOUNT') +
    sum('COUPON') +
    sum('REWARD_DISCOUNT') -
    sum('DISCOUNT_REVERSAL') -
    sum('COUPON_REVERSAL');
  const netProductSalesFils = Math.max(0, grossSales - allDiscounts);

  // 2. تكاليف المنتجات والتزامات المحلات
  const productCostsFils = sum('PRODUCT_COST') - sum('PRODUCT_COST_REVERSAL');
  const grossProductProfitFils = netProductSalesFils - productCostsFils;

  const shopObligationsFils = sum('SUPPLIER_OBLIGATION') - sum('SUPPLIER_OBLIGATION_REVERSAL');
  const shopPaidFils = sum('SUPPLIER_PAYMENT') - sum('SUPPLIER_PAYMENT_REVERSAL');
  const shopRemainingBalanceFils = Math.max(0, shopObligationsFils - shopPaidFils);

  // 3. إيرادات وتكاليف التوصيل والشحن
  const deliveryRevenueFils = sum('DELIVERY_REVENUE') - sum('DELIVERY_REVENUE_REVERSAL');
  const deliveryCarrierCostFils =
    sum('DELIVERY_COST') -
    sum('DELIVERY_COST_REVERSAL') +
    (sum('CAPTAIN_EARNING') - sum('CAPTAIN_EARNING_REVERSAL'));
  const deliveryNetProfitFils = deliveryRevenueFils - deliveryCarrierCostFils;

  // 4. المصروفات التشغيلية
  const operatingExpensesFils = expenseSum._sum.amount ?? 0;

  // 5. الأرباح الكلية والصافية
  const grossCommercialProfitFils = grossProductProfitFils + deliveryNetProfitFils;
  const netOperatingProfitFils = grossCommercialProfitFils - operatingExpensesFils;

  // 6. نقد الـ COD المعلق بذمة الناقلين
  const codCustodyWithCarriersFils = undeliveredJobs.reduce((acc, j) => acc + (j.codAmountToCollect || 0), 0);

  const isDetailed = filter.isDetailed ?? true;

  const columns = isDetailed
    ? ['المحور المالي / البند المحاسبي', 'القيمة بالدينار (د.أ)', 'الملاحظات والبيان']
    : ['المؤشر المالي التنفيذي', 'المبلغ المعتمد'];

  const summaryRows = [
    ['صافي مبيعات المنتجات المحققة', filsToDisplay(netProductSalesFils)],
    ['تكلفة شراء البضاعة (حقوق المحلات)', filsToDisplay(productCostsFils)],
    ['مجمل ربح مبيعات المنتجات', filsToDisplay(grossProductProfitFils)],
    ['صافي ربح / (دعم) خدمة التوصيل', filsToDisplay(deliveryNetProfitFils)],
    ['إجمالي الربح التجاري العام للمنصة', filsToDisplay(grossCommercialProfitFils)],
    ['المصروفات التشغيلية والتسويقية والإدارية', filsToDisplay(operatingExpensesFils)],
    ['صافي الربح التشغيلي النهائي (Net Operating Profit)', filsToDisplay(netOperatingProfitFils)],
  ];

  const detailedRows = [
    // قسم المنتجات
    ['إجمالي مبيعات المنتجات الإسمية (Gross Sales)', filsToDisplay(grossSales), 'قيمة سلة المنتجات قبل تطبيق أي تخفيضات'],
    ['إجمالي الخصومات والكوبونات ونقاط المكافأة', filsToDisplay(allDiscounts), 'تخفيضات العروض الممنوحة للعملاء'],
    ['صافي مبيعات المنتجات المحققة (Net Sales)', filsToDisplay(netProductSalesFils), 'صافي دخل المنتجات الفعلي'],
    ['تكلفة شراء البضاعة المباعة (COGS)', filsToDisplay(productCostsFils), 'أسعار الشراء المتفق عليها مع المحلات الشريكة'],
    ['مجمل ربح المنتجات (Gross Product Profit)', filsToDisplay(grossProductProfitFils), 'الفارق بين سعر البيع وتكلفة البضاعة'],

    // قسم المحلات
    ['إجمالي التزامات المحلات المحاسبية', filsToDisplay(shopObligationsFils), 'إجمالي الاستحقاقات التراكمية للمحلات'],
    ['الدفعات المسددة للمحلات التجارية', filsToDisplay(shopPaidFils), 'حوالات وسندات الصرف النقدية المسددة'],
    ['الرصيد المتبقي للمحلات بذمة رَواق', filsToDisplay(shopRemainingBalanceFils), 'التزامات قائمة واجبة السداد للمحلات'],

    // قسم التوصيل
    ['إيرادات رسوم التوصيل من الزبائن', filsToDisplay(deliveryRevenueFils), 'رسوم الشحن المحصلة من المشترين'],
    ['أجور وتكاليف شركات التوصيل المدفوعة', filsToDisplay(deliveryCarrierCostFils), 'أجور الشحن الفعلية المستحقة للناقلين'],
    ['صافي هامش خدمة التوصيل والشحن', filsToDisplay(deliveryNetProfitFils), 'فارق رسوم التوصيل عن تكلفتها الفعلية'],

    // قسم المصروفات
    ['المصروفات التشغيلية المعتمدة', filsToDisplay(operatingExpensesFils), 'إعلانات، تغليف، رواتب، برمجيات، نثريات'],

    // الحصيلة
    ['إجمالي الربح التجاري العام', filsToDisplay(grossCommercialProfitFils), 'مجمل ربح المنتجات + هامش التوصيل'],
    ['صافي الربح التشغيلي النهائي', filsToDisplay(netOperatingProfitFils), 'صافي الأرباح بعد خصم كافة النفقات التشغيلية'],

    // السيولة النقدية
    ['نقد الـ COD المحصل في عهدة شركات الشحن', filsToDisplay(codCustodyWithCarriersFils), 'سيولة نقدية استلمها الناقلون بانتظار التوريد'],
  ];

  return {
    reportTitle: isDetailed ? 'التقرير المالي الشامل وقائمة الأرباح والخسائر · رَواق' : 'الملخص المالي التنفيذي · رَواق',
    department: 'FINANCIAL_SUMMARY',
    generatedAt: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(new Date()),
    filtersApplied: {
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    data: {
      grossProductSalesFils: grossSales,
      allDiscountsFils: allDiscounts,
      netProductSalesFils,
      productCostsFils,
      grossProductProfitFils,
      shopObligationsFils,
      shopPaidFils,
      shopRemainingBalanceFils,
      deliveryRevenueFils,
      deliveryCarrierCostFils,
      deliveryNetProfitFils,
      operatingExpensesFils,
      grossCommercialProfitFils,
      netOperatingProfitFils,
      codCustodyWithCarriersFils,
    },
    columns,
    rows: isDetailed ? detailedRows : summaryRows,
  };
}
