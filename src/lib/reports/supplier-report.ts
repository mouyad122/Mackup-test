import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface SupplierReportFilter {
  supplierId?: string;
  from?: Date;
  to?: Date;
  itemStatus?: string;
  isDetailed?: boolean;
}

export interface SupplierReportSummary {
  supplierName: string;
  totalProductsCount: number;
  totalQuantitySupplied: number;
  totalDeliveredQuantity: number;
  totalCancelledQuantity: number;
  totalSalesValueFils: number;
  totalProductCostFils: number;
  totalAccountingObligationFils: number;
  eligiblePayoutFils: number;
  totalPaidFils: number;
  remainingBalanceFils: number;
}

export interface SupplierReportRow {
  productName: string;
  sku: string;
  orderReference: string;
  quantity: number;
  unitCostFils: number;
  totalCostFils: number;
  fulfillmentStatus: string;
  deliveryStatus: string;
  eligibilityStatus: string;
  totalDueFils: number;
  date: string;
}

export interface SupplierReportResult {
  reportTitle: string;
  department: 'SUPPLIER';
  supplierName: string;
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: SupplierReportSummary;
  columns: string[];
  rows: string[][];
  rawRows?: SupplierReportRow[];
  payments?: { date: string; reference: string; amountFils: number; type: string }[];
}

/**
 * تقرير كشف حساب ومستحقات المحلات التجارية المنعزل:
 * يحتوي على: المحل التجاري، المنتجات المباعة، الكميات، تكلفة الشراء، المستحقات الإجمالية،
 * حالة التجهيز والتسليم، المبالغ القابلة للصرف، وسندات الدفعات المسددة للمحل.
 * محجوب برمجياً تماماً: بيانات العملاء الشخصية (الاسم، الهاتف، العنوان)، أجور التوصيل، وأرباح المحلات الأخرى.
 */
export async function generateSupplierReport(filter: SupplierReportFilter = {}): Promise<SupplierReportResult> {
  const dateFilter = filter.from || filter.to ? {
    createdAt: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  let targetSupplierName = 'كافة المحلات التجارية';
  if (filter.supplierId) {
    const s = await prisma.supplier.findUnique({
      where: { id: filter.supplierId },
      select: { name: true },
    });
    if (s) targetSupplierName = s.name;
  }

  // جلب كافة طلبات القطع التابعة للمحل مع حالة الطلب
  const [orderItems, paymentTransactions] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        ...(filter.supplierId ? { supplierIdSnapshot: filter.supplierId } : { supplierIdSnapshot: { not: null } }),
        order: {
          ...dateFilter,
          status: { notIn: ['AWAITING_WHATSAPP'] },
        },
      },
      select: {
        name: true,
        sku: true,
        quantity: true,
        total: true,
        unitCostSnapshot: true,
        supplierAmountSnapshot: true,
        supplierIdSnapshot: true,
        supplierNameSnapshot: true,
        isRemoved: true,
        removalReason: true,
        order: {
          select: {
            reference: true,
            status: true,
            createdAt: true,
            fulfillmentOrders: {
              select: {
                status: true,
                supplierId: true,
              },
            },
          },
        },
      },
      orderBy: { order: { createdAt: 'desc' } },
    }),

    prisma.financialTransaction.findMany({
      where: {
        ...(filter.supplierId ? { supplierId: filter.supplierId } : { supplierId: { not: null } }),
        type: { in: ['SUPPLIER_PAYMENT', 'SUPPLIER_PAYMENT_REVERSAL'] },
        ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}),
      },
      select: {
        amount: true,
        type: true,
        description: true,
        businessEventKey: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  let totalProductsCount = 0;
  let totalQuantitySupplied = 0;
  let totalDeliveredQuantity = 0;
  let totalCancelledQuantity = 0;
  let totalSalesValueFils = 0;
  let totalProductCostFils = 0;
  let totalAccountingObligationFils = 0;
  let deliveredDueFils = 0;

  const rawRows: SupplierReportRow[] = [];

  for (const item of orderItems) {
    totalProductsCount++;
    const isCancelled = item.isRemoved || ['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY'].includes(item.order.status);
    const isDelivered = !item.isRemoved && item.order.status === 'DELIVERED';

    const unitCost = item.unitCostSnapshot || 0;
    const totalCost = unitCost * item.quantity;
    const profitShare = item.supplierAmountSnapshot || 0;
    const totalDue = totalCost + profitShare;

    totalSalesValueFils += item.total;
    totalQuantitySupplied += item.quantity;

    if (isDelivered) {
      totalDeliveredQuantity += item.quantity;
      totalProductCostFils += totalCost;
      totalAccountingObligationFils += totalDue;
      deliveredDueFils += totalDue;
    } else if (isCancelled) {
      totalCancelledQuantity += item.quantity;
    } else {
      // قيد التجهيز أو الشحن
      totalProductCostFils += totalCost;
      totalAccountingObligationFils += totalDue;
    }

    const orderFulfillment = item.order.fulfillmentOrders?.find(f => f.supplierId === item.supplierIdSnapshot) || item.order.fulfillmentOrders?.[0];
    const fulfillmentStatus = orderFulfillment?.status || 'مجدول';

    const deliveryStatusLabel = isDelivered
      ? 'تم التسليم بنجاح'
      : isCancelled
      ? 'مرتجع / ملغي'
      : 'قيد التجهيز والتوصيل';

    const eligibilityStatus = isDelivered
      ? 'جاهز للصرف فوراً'
      : isCancelled
      ? 'غير مستحق (ملغي)'
      : 'مستحق مؤجل حتى التسليم';

    rawRows.push({
      productName: item.name,
      sku: item.sku || '—',
      orderReference: item.order.reference,
      quantity: item.quantity,
      unitCostFils: unitCost,
      totalCostFils: totalCost,
      fulfillmentStatus,
      deliveryStatus: deliveryStatusLabel,
      eligibilityStatus,
      totalDueFils: isCancelled ? 0 : totalDue,
      date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(item.order.createdAt),
    });
  }

  // حساب الدفعات المسددة الفعلية مع خصم العكس المالي إن وجد
  let totalPaidFils = 0;
  const formattedPayments = paymentTransactions.map(tx => {
    if (tx.type === 'SUPPLIER_PAYMENT') {
      totalPaidFils += tx.amount;
    } else if (tx.type === 'SUPPLIER_PAYMENT_REVERSAL') {
      totalPaidFils -= tx.amount;
    }
    return {
      date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(tx.createdAt),
      reference: tx.description || tx.businessEventKey || 'سند دفع',
      amountFils: tx.amount,
      type: tx.type === 'SUPPLIER_PAYMENT' ? 'سداد مستحقات' : 'عكس تسوية موثق',
    };
  });

  const remainingBalanceFils = Math.max(0, totalAccountingObligationFils - totalPaidFils);
  const eligiblePayoutFils = Math.max(0, Math.min(deliveredDueFils - totalPaidFils, remainingBalanceFils));

  const isDetailed = filter.isDetailed ?? true;

  const columns = isDetailed
    ? ['اسم المنتج', 'SKU', 'رقم الطلب', 'الكمية', 'سعر الشراء (للقطعة)', 'إجمالي التكلفة', 'حالة الطلب والتجهيز', 'حالة الاستحقاق والصرف', 'المستحق النهائي', 'التاريخ']
    : ['المؤشر المالي للمحل', 'القيمة المعتمدة'];

  const rows = isDetailed
    ? rawRows.map(r => [
        r.productName,
        r.sku,
        r.orderReference,
        r.quantity.toString(),
        filsToDisplay(r.unitCostFils),
        filsToDisplay(r.totalCostFils),
        r.deliveryStatus,
        r.eligibilityStatus,
        filsToDisplay(r.totalDueFils),
        r.date,
      ])
    : [
        ['المحل التجاري المعني', targetSupplierName],
        ['إجمالي القطع الموردة', totalQuantitySupplied.toString()],
        ['قطع تم تسليمها بنجاح للزبائن', totalDeliveredQuantity.toString()],
        ['قطع مرتجعة أو ملغاة', totalCancelledQuantity.toString()],
        ['إجمالي المستحق المحاسبي العام للمحل', filsToDisplay(totalAccountingObligationFils)],
        ['المبلغ القابل للصرف حالياً (للطلبات المسلمة)', filsToDisplay(eligiblePayoutFils)],
        ['إجمالي الدفعات المسددة للمحل', filsToDisplay(totalPaidFils)],
        ['صافي الرصيد المتبقي بذمة رَواق للمحل', filsToDisplay(remainingBalanceFils)],
      ];

  return {
    reportTitle: isDetailed ? `كشف حساب ومستحقات المحل المفصل · ${targetSupplierName}` : `ملخص مستحقات المحل · ${targetSupplierName}`,
    department: 'SUPPLIER',
    supplierName: targetSupplierName,
    generatedAt: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(new Date()),
    filtersApplied: {
      'المحل التجاري': targetSupplierName,
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    summary: {
      supplierName: targetSupplierName,
      totalProductsCount,
      totalQuantitySupplied,
      totalDeliveredQuantity,
      totalCancelledQuantity,
      totalSalesValueFils,
      totalProductCostFils,
      totalAccountingObligationFils,
      eligiblePayoutFils,
      totalPaidFils,
      remainingBalanceFils,
    },
    columns,
    rows,
    rawRows,
    payments: formattedPayments,
  };
}
