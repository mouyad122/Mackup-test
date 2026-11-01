import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface DeliveryReportFilter {
  courierCompany?: string;
  from?: Date;
  to?: Date;
  status?: string;
  batchReference?: string;
  isDetailed?: boolean;
}

export interface DeliveryReportSummary {
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  inProgressOrders: number;
  deliverySuccessRate: string;
  totalCarrierCostFils: number;
  totalCodExpectedFils: number;
  totalCodCollectedFils: number;
  totalCodSettledToRawaqFils: number;
  totalCodUnremittedFils: number;
  totalNetRemittanceFils: number;
}

export interface DeliveryReportRow {
  orderReference: string;
  courierCompany: string;
  courierName: string;
  batchReference: string;
  destination: string;
  deliveryStatus: string;
  paymentMethod: string;
  carrierCostFils: number;
  codExpectedFils: number;
  codCollectedFils: number;
  codUnremittedFils: number;
  netRemittanceFils: number;
  date: string;
}

export interface DeliveryReportResult {
  reportTitle: string;
  department: 'DELIVERY';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: DeliveryReportSummary;
  columns: string[];
  rows: string[][];
  rawRows?: DeliveryReportRow[];
}

const STATUS_LABELS: Record<string, string> = {
  PREPARED: 'جاهز للشحن',
  ASSIGNED: 'معين للناقل',
  SHIPPED: 'خرج للتوصيل',
  OUT_FOR_DELIVERY: 'في مسار التوصيل',
  DELIVERED: 'تم التسليم بنجاح',
  FAILED_DELIVERY: 'فشل التسليم / مرتجع',
  CANCELLED: 'ملغي / مرتجع',
  RETURNED: 'مرتجع للمحل / لدى شركة التوصيل',
};

/**
 * تقرير التوصيل واللوجستيات المنعزل والمفصل:
 * يحتوي على: الشحنات، شركات التوصيل، سائق الشحنة، الوجهات، الطرود، حالات التسليم،
 * رسوم التوصيل، مبالغ الـ COD (المتوقع والمحصل فعلياً)، العهد المحصلة، وصافي المقاصة الواجب توريده لرَواق.
 * محجوب برمجياً تماماً: أرباح وتكاليف شراء المنتجات، وحصص المحلات التجارية.
 */
export async function generateDeliveryReport(filter: DeliveryReportFilter = {}): Promise<DeliveryReportResult> {
  const dateFilter = filter.from || filter.to ? {
    createdAt: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  const orders = await prisma.order.findMany({
    where: {
      ...dateFilter,
      ...(filter.status ? { status: filter.status } : { status: { notIn: ['AWAITING_WHATSAPP'] } }),
      ...(filter.courierCompany ? {
        OR: [
          { deliveryBatch: { courierCompany: { contains: filter.courierCompany, mode: 'insensitive' } } },
          { deliveryAssignment: { captain: { name: { contains: filter.courierCompany, mode: 'insensitive' } } } },
        ],
      } : {}),
      ...(filter.batchReference ? {
        deliveryBatch: { reference: filter.batchReference },
      } : {}),
    },
    select: {
      id: true,
      reference: true,
      status: true,
      paymentStatus: true,
      totalAmount: true,
      shippingCost: true,
      actualDeliveryCost: true,
      createdAt: true,
      deliveryBatch: {
        select: {
          reference: true,
          courierCompany: true,
          courierName: true,
        },
      },
      deliveryAssignment: {
        select: {
          actualCarrierCost: true,
          captainEarning: true,
          captain: { select: { name: true } },
        },
      },
      deliveryJob: {
        select: {
          city: true,
          area: true,
          codStatus: true,
          codAmountToCollect: true,
          isCodCollected: true,
          collectedByCourier: true,
          collectedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalOrders = 0;
  let deliveredOrders = 0;
  let failedOrders = 0;
  let inProgressOrders = 0;
  let totalCarrierCostFils = 0;
  let totalCodExpectedFils = 0;
  let totalCodCollectedFils = 0;
  let totalCodSettledToRawaqFils = 0;
  let totalCodUnremittedFils = 0;
  let totalNetRemittanceFils = 0;

  const rawRows: DeliveryReportRow[] = [];

  for (const order of orders) {
    totalOrders++;
    const isDelivered = order.status === 'DELIVERED';
    const isFailed = ['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY', 'RETURNED'].includes(order.status);

    if (isDelivered) deliveredOrders++;
    else if (isFailed) failedOrders++;
    else inProgressOrders++;

    const courierCompany =
      order.deliveryBatch?.courierCompany ||
      order.deliveryAssignment?.captain?.name ||
      'شركة التوصيل';

    const courierName =
      order.deliveryBatch?.courierName ||
      order.deliveryJob?.collectedByCourier ||
      '—';

    const city = order.deliveryJob?.city || '';
    const area = order.deliveryJob?.area || '';
    const destination = [city, area].filter(Boolean).join(' - ') || 'عمان وكافة المناطق';

    // تكلفة الشحن المستحقة للناقل
    const carrierCost = order.actualDeliveryCost ?? order.deliveryAssignment?.actualCarrierCost ?? order.deliveryAssignment?.captainEarning ?? order.shippingCost ?? 0;
    
    // مبالغ الـ COD الثلاثية وفق معايير رَواق المعتمدة:
    // 1. COD المطلوب تحصيله (مع استبعاد المدفوع مسبقاً)
    const isPrepaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'PREPAID';
    const codExpected = isPrepaid ? 0 : (order.deliveryJob?.codAmountToCollect ?? order.totalAmount ?? 0);
    
    // 2. COD المحصل فعلياً (يثبت بإشعار استلام أو حالة تحصيل مؤكدة، وليس بمجرد التسليم)
    const isCodVerifiedCollected = order.deliveryJob?.isCodCollected ||
      order.deliveryJob?.codStatus === 'COLLECTED_BY_COURIER' ||
      order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ';
    const codCollected = isCodVerifiedCollected
      ? (order.deliveryJob?.codAmountToCollect ?? codExpected)
      : (isDelivered && !order.deliveryJob ? codExpected : (order.deliveryJob?.isCodCollected ? codExpected : 0));
    
    // حالة التوريد
    const isSettled = order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ';
    const codUnremitted = isDelivered && !isSettled ? codCollected : 0;
    if (isSettled) {
      totalCodSettledToRawaqFils += codCollected;
    }

    // صافي التوريد (المقاصة للطلب): نقد محصل ناقص أجرة التوصيل
    const netRemittance = isDelivered ? (codCollected - carrierCost) : 0;

    totalCarrierCostFils += carrierCost;
    totalCodExpectedFils += codExpected;
    totalCodCollectedFils += codCollected;
    totalCodUnremittedFils += codUnremitted;
    totalNetRemittanceFils += netRemittance;

    rawRows.push({
      orderReference: order.reference,
      courierCompany,
      courierName,
      batchReference: order.deliveryBatch?.reference || '—',
      destination,
      deliveryStatus: STATUS_LABELS[order.status] || order.status,
      paymentMethod: order.paymentStatus === 'PAID' ? 'مدفوع مسبقاً' : 'دفع عند الاستلام (COD)',
      carrierCostFils: carrierCost,
      codExpectedFils: codExpected,
      codCollectedFils: codCollected,
      codUnremittedFils: codUnremitted,
      netRemittanceFils: netRemittance,
      date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(order.createdAt),
    });
  }

  const successRateNum = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const deliverySuccessRate = `${successRateNum}%`;

  const isDetailed = filter.isDetailed ?? true;

  const columns = isDetailed
    ? ['رقم الشحنة', 'شركة التوصيل', 'سائق الشحنة', 'طلبية التجميع (Batch)', 'الوجهة', 'الحالة', 'طريقة الدفع', 'أجرة التوصيل', 'COD المتوقع', 'COD المحصل', 'عهدة معلقة', 'صافي التوريد (المقاصة)', 'التاريخ']
    : ['المؤشر التشغيلي / المالي', 'القيمة الإجمالية'];

  const rows = isDetailed
    ? rawRows.map(r => [
        r.orderReference,
        r.courierCompany,
        r.courierName,
        r.batchReference,
        r.destination,
        r.deliveryStatus,
        r.paymentMethod,
        filsToDisplay(r.carrierCostFils),
        filsToDisplay(r.codExpectedFils),
        filsToDisplay(r.codCollectedFils),
        filsToDisplay(r.codUnremittedFils),
        filsToDisplay(r.netRemittanceFils),
        r.date,
      ])
    : [
        ['إجمالي الشحنات المسندة للناقل', totalOrders.toString()],
        ['شحنات تم تسليمها بنجاح للزبائن', deliveredOrders.toString()],
        ['نسبة نجاح التسليم الفعلية', deliverySuccessRate],
        ['شحنات متعذرة أو مرتجعة', failedOrders.toString()],
        ['شحنات قيد التوصيل الميداني', inProgressOrders.toString()],
        ['إجمالي رسوم التوصيل المستحقة للناقل', filsToDisplay(totalCarrierCostFils)],
        ['إجمالي نقد COD المتوقع تحصيله', filsToDisplay(totalCodExpectedFils)],
        ['إجمالي نقد COD المحصل فعلياً', filsToDisplay(totalCodCollectedFils)],
        ['نقد COD تم توريده وإيداعه لرَواق', filsToDisplay(totalCodSettledToRawaqFils)],
        ['نقد COD معلق كعهدة بذمة الناقل', filsToDisplay(totalCodUnremittedFils)],
        ['صافي النقد الواجب توريده لرَواق بعد المقاصة', filsToDisplay(totalNetRemittanceFils)],
      ];

  return {
    reportTitle: isDetailed ? 'تقرير التوصيل واللوجستيات المفصل · رَواق' : 'ملخص التوصيل والعهد اللوجستية · رَواق',
    department: 'DELIVERY',
    generatedAt: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(new Date()),
    filtersApplied: {
      ...(filter.courierCompany ? { 'شركة التوصيل': filter.courierCompany } : {}),
      ...(filter.batchReference ? { 'طلبية التجميع': filter.batchReference } : {}),
      ...(filter.status ? { 'حالة التسليم': STATUS_LABELS[filter.status] || filter.status } : {}),
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    summary: {
      totalOrders,
      deliveredOrders,
      failedOrders,
      inProgressOrders,
      deliverySuccessRate,
      totalCarrierCostFils,
      totalCodExpectedFils,
      totalCodCollectedFils,
      totalCodSettledToRawaqFils,
      totalCodUnremittedFils,
      totalNetRemittanceFils,
    },
    columns,
    rows,
    rawRows,
  };
}
