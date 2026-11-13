import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface DeliveryReportFilter {
  courierCompany?: string;
  from?: Date;
  to?: Date;
  status?: string;
  batchReference?: string;
  isDetailed?: boolean;
  deliveryScope?: 'DELIVERED' | 'UNDELIVERED' | 'ALL';
}

export interface DeliveryBatchSettlementItem {
  batchId: string;
  batchReference: string;
  courierCompany: string;
  deliveredOrdersCount: number;
  shopsCount?: number;
  totalOrdersPriceFils: number;
  totalDeliveryCostFils: number;
  netRequiredFils: number; // المطلوب = سعر الطلبيات - سعر التوصيل
  settledAmountFils: number; // مبلغ التسوية
  remainingBalanceFils: number; // كم متبقي
  status: string; // مسددة بالكامل / مسددة جزئياً / بانتظار التسوية
  settlementDate?: string;
  hasSettlement: boolean;
}

export interface DeliveryReportSummary {
  totalBatches: number;
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  inProgressOrders: number;
  deliverySuccessRate: string;
  totalOrdersPriceFils: number;
  totalCarrierCostFils: number;
  totalNetRequiredFils: number; // المطلوب = سعر الطلبيات - سعر التوصيل
  totalSettledFils: number;
  totalRemainingFils: number;
}

export interface DeliveryReportBatchRow {
  batchId: string;
  batchReference: string;
  ordersCount: number;
  shopsCount: number;
  totalOrdersPriceFils: number;
  totalCarrierCostFils: number;
  netRequiredFils: number;
  status: string;
  destination: string;
  date: string;
}

export interface DeliveryReportResult {
  reportTitle: string;
  department: 'DELIVERY';
  deliveryScope: 'DELIVERED' | 'UNDELIVERED' | 'ALL';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: DeliveryReportSummary;
  columns: string[];
  rows: string[][];
  rawBatches?: DeliveryReportBatchRow[];
  settlements?: DeliveryBatchSettlementItem[];
}

const BATCH_STATUS_LABELS: Record<string, string> = {
  NOT_DELIVERED: 'بانتظار التحميل',
  IN_DELIVERY: 'قيد التوصيل الميداني',
  COMPLETED: 'مكتملة ومسلّمة',
  CANCELLED: 'ملغاة بالكامل',
  PARTIALLY_SETTLED: 'مسددة جزئياً',
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'مؤكد',
  PREPARED: 'جاهز للشحن',
  ASSIGNED: 'معين للناقل',
  SHIPPED: 'خرج للتوصيل',
  OUT_FOR_DELIVERY: 'في مسار التوصيل',
  DELIVERED: 'تم التسليم بنجاح',
  FAILED_DELIVERY: 'فشل التسليم / مرتجع',
  CANCELLED: 'ملغي / مرتجع',
  RETURNED: 'مرتجع لدى شركة التوصيل',
};

/**
 * تقرير وجرد التوصيل واللوجستيات المجمع بالطلبيات (Batches):
 * - كل طلبية كاملة batch في سطر مستقل
 * - حذف الأعمدة الفردية (سائق الشحنة، عهدة معلقة، أجرة التوصيل الفردية، صافي التوريد، طريقة الدفع، شركة التوصيل، ورقم الشحنة)
 * - إضافة معلومة عدد الطلبات ومجموع سعر التوصيل للطلبية كاملة
 * - دمج المتوقع والمحصل ليصبح المطلوب فقط (المطلوب = سعر الطلبيات - سعر التوصيل الإجمالي)
 * - المؤشرات التشغيلية والمالية المعتمدة لتكامل وسرعة العمل
 * - جدول التسويات ومبالغ السداد والمتبقي وإلغاء تسوية كل طلبية على حدة
 * - خيار لجرد الطلبيات المسلمة أو الطلبيات التي لم تسلم بعد (قيد التوصيل)
 */
export async function generateDeliveryReport(filter: DeliveryReportFilter = {}): Promise<DeliveryReportResult> {
  const scope: 'DELIVERED' | 'UNDELIVERED' | 'ALL' = filter.deliveryScope || 'DELIVERED';

  const dateFilter = filter.from || filter.to ? {
    createdAt: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  // بناء محدد حالة الطلبات حسب النطاق المختار
  let orderStatusWhere: any = {};
  if (filter.status) {
    orderStatusWhere = { status: filter.status };
  } else if (scope === 'DELIVERED') {
    orderStatusWhere = { status: 'DELIVERED' };
  } else if (scope === 'UNDELIVERED') {
    orderStatusWhere = { status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED', 'AWAITING_WHATSAPP'] } };
  } else {
    orderStatusWhere = { status: { notIn: ['AWAITING_WHATSAPP'] } };
  }

  // 1. استعلام طلبيات التجميع (Batches)
  const batches = await prisma.deliveryBatch.findMany({
    where: {
      ...dateFilter,
      ...(filter.batchReference ? { reference: filter.batchReference } : {}),
      ...(filter.courierCompany ? { courierCompany: { contains: filter.courierCompany, mode: 'insensitive' } } : {}),
    },
    include: {
      orders: {
        where: orderStatusWhere,
        select: {
          id: true,
          reference: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          shippingCost: true,
          actualDeliveryCost: true,
          createdAt: true,
          deliveryAssignment: {
            select: {
              actualCarrierCost: true,
              captainEarning: true,
            },
          },
          deliveryJob: {
            select: {
              id: true,
              city: true,
              area: true,
              codStatus: true,
              codAmountToCollect: true,
              isCodCollected: true,
              collectedAmount: true,
            },
          },
          items: {
            select: {
              supplierIdSnapshot: true,
            },
          },
          fulfillmentOrders: {
            select: {
              supplierId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 2. استعلام الطلبات المستقلة غير المضافة إلى batch (إن وجدت) لضمان دقة الجرد وعدم إسقاط أي طلب
  const unbatchedOrders = await prisma.order.findMany({
    where: {
      ...dateFilter,
      deliveryBatchId: null,
      ...orderStatusWhere,
      ...(filter.courierCompany ? {
        deliveryAssignment: { captain: { name: { contains: filter.courierCompany, mode: 'insensitive' } } },
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
      deliveryAssignment: {
        select: {
          actualCarrierCost: true,
          captainEarning: true,
          captain: { select: { name: true } },
        },
      },
      deliveryJob: {
        select: {
          id: true,
          city: true,
          area: true,
          codStatus: true,
          codAmountToCollect: true,
          isCodCollected: true,
          collectedAmount: true,
        },
      },
      items: {
        select: {
          supplierIdSnapshot: true,
        },
      },
      fulfillmentOrders: {
        select: {
          supplierId: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // 3. استعلام الحركات المالية المسجلة للطلبيات لمعرفة مبالغ التسوية والمسدد
  const allBatchIds = batches.map(b => b.id);
  const financialTransactions = allBatchIds.length > 0
    ? await prisma.financialTransaction.findMany({
        where: {
          OR: allBatchIds.flatMap(id => [
            { businessEventKey: `batch-settlement:${id}` },
            { businessEventKey: { startsWith: `batch-remittance:${id}` } },
            { businessEventKey: { startsWith: `reverse-batch-settlement:${id}` } },
          ]),
        },
        select: {
          businessEventKey: true,
          amount: true,
          type: true,
          direction: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const rawBatches: DeliveryReportBatchRow[] = [];
  const settlements: DeliveryBatchSettlementItem[] = [];

  let totalBatches = 0;
  let totalOrders = 0;
  let deliveredOrders = 0;
  let failedOrders = 0;
  let inProgressOrders = 0;
  let totalOrdersPriceFils = 0;
  let totalCarrierCostFils = 0;
  let totalNetRequiredFils = 0;
  let totalSettledFils = 0;
  let totalRemainingFils = 0;

  for (const batch of batches) {
    const matchingOrders = batch.orders;
    // إذا كان النطاق محدداً ولم يكن في الطلبية أي طلب يطابق النطاق، نتجاوزها في كشف الجرد
    if (matchingOrders.length === 0 && (scope === 'DELIVERED' || scope === 'UNDELIVERED')) {
      continue;
    }

    totalBatches++;
    const ordersCount = matchingOrders.length;
    totalOrders += ordersCount;

    let batchOrdersPriceFils = 0;
    let batchCarrierCostFils = 0;
    const citiesSet = new Set<string>();
    const batchShopsSet = new Set<string>();

    for (const order of matchingOrders) {
      if (order.status === 'DELIVERED') deliveredOrders++;
      else if (['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY', 'RETURNED'].includes(order.status)) failedOrders++;
      else inProgressOrders++;

      for (const it of (order.items || [])) {
        if (it.supplierIdSnapshot) batchShopsSet.add(it.supplierIdSnapshot);
      }
      for (const fo of (order.fulfillmentOrders || [])) {
        if (fo.supplierId) batchShopsSet.add(fo.supplierId);
      }

      const carrierCost = order.actualDeliveryCost ??
        order.deliveryAssignment?.actualCarrierCost ??
        order.deliveryAssignment?.captainEarning ??
        (order.shippingCost ? Math.min(order.shippingCost, 2000) : 2000);

      const orderPrice = order.totalAmount ?? 0;

      batchOrdersPriceFils += orderPrice;
      batchCarrierCostFils += carrierCost;

      if (order.deliveryJob?.city) citiesSet.add(order.deliveryJob.city);
      else if (order.deliveryJob?.area) citiesSet.add(order.deliveryJob.area);
    }

    const shopsCount = batchShopsSet.size > 0 ? batchShopsSet.size : 1;

    // المطلوب = سعر الطلبيات - سعر التوصيل الإجمالي من كل طلبية
    const netRequiredFils = Math.max(0, batchOrdersPriceFils - batchCarrierCostFils);

    totalOrdersPriceFils += batchOrdersPriceFils;
    totalCarrierCostFils += batchCarrierCostFils;
    totalNetRequiredFils += netRequiredFils;

    const destination = citiesSet.size > 0
      ? Array.from(citiesSet).slice(0, 3).join('، ') + (citiesSet.size > 3 ? '...' : '')
      : 'عمان والمحافظات';

    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Amman',
    }).format(batch.createdAt);

    const statusLabel = BATCH_STATUS_LABELS[batch.status] || batch.status;

    rawBatches.push({
      batchId: batch.id,
      batchReference: batch.reference,
      ordersCount,
      shopsCount,
      totalOrdersPriceFils: batchOrdersPriceFils,
      totalCarrierCostFils: batchCarrierCostFils,
      netRequiredFils,
      status: statusLabel,
      destination,
      date: formattedDate,
    });

    // احتساب التسوية الخاصة بهذه الطلبية
    const batchTx = financialTransactions.filter(tx =>
      tx.businessEventKey?.startsWith(`batch-settlement:${batch.id}`) ||
      tx.businessEventKey?.startsWith(`batch-remittance:${batch.id}`) ||
      tx.businessEventKey?.startsWith(`reverse-batch-settlement:${batch.id}`)
    );

    let batchSettledFils = 0;
    let latestSettlementDate: string | undefined;

    for (const tx of batchTx) {
      if (tx.type === 'COD_SETTLEMENT' && tx.direction === 'IN') {
        batchSettledFils += tx.amount;
        if (!latestSettlementDate) {
          latestSettlementDate = new Intl.DateTimeFormat('en-GB', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'Asia/Amman',
          }).format(tx.createdAt);
        }
      } else if (tx.type === 'COD_SETTLEMENT_REVERSAL' || tx.direction === 'OUT') {
        batchSettledFils -= tx.amount;
      }
    }

    batchSettledFils = Math.max(0, batchSettledFils);
    const remainingBalanceFils = Math.max(0, netRequiredFils - batchSettledFils);

    totalSettledFils += batchSettledFils;
    totalRemainingFils += remainingBalanceFils;

    const hasSettlement = batchSettledFils > 0;
    let settlementStatus = 'بانتظار التسوية';
    if (remainingBalanceFils === 0 && hasSettlement) {
      settlementStatus = 'مسددة بالكامل';
    } else if (hasSettlement && remainingBalanceFils > 0) {
      settlementStatus = 'مسددة جزئياً';
    }

    // إضافة الطلبيات المسلمة أو التي لها استحقاق إلى جدول التسويات
    if (ordersCount > 0 || hasSettlement) {
      settlements.push({
        batchId: batch.id,
        batchReference: batch.reference,
        courierCompany: batch.courierCompany || 'شركة التوصيل',
        deliveredOrdersCount: matchingOrders.filter(o => o.status === 'DELIVERED').length,
        shopsCount,
        totalOrdersPriceFils: batchOrdersPriceFils,
        totalDeliveryCostFils: batchCarrierCostFils,
        netRequiredFils,
        settledAmountFils: batchSettledFils,
        remainingBalanceFils,
        status: settlementStatus,
        settlementDate: latestSettlementDate,
        hasSettlement,
      });
    }
  }

  // إضافة الطلبات غير المجمعة إن وجدت كطلبيات مفردة لضمان اكتمال الجرد
  for (const order of unbatchedOrders) {
    totalBatches++;
    totalOrders++;
    if (order.status === 'DELIVERED') deliveredOrders++;
    else if (['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY', 'RETURNED'].includes(order.status)) failedOrders++;
    else inProgressOrders++;

    const orderShopsSet = new Set<string>();
    for (const it of (order.items || [])) {
      if (it.supplierIdSnapshot) orderShopsSet.add(it.supplierIdSnapshot);
    }
    for (const fo of (order.fulfillmentOrders || [])) {
      if (fo.supplierId) orderShopsSet.add(fo.supplierId);
    }
    const shopsCount = orderShopsSet.size > 0 ? orderShopsSet.size : 1;

    const carrierCost = order.actualDeliveryCost ??
      order.deliveryAssignment?.actualCarrierCost ??
      order.deliveryAssignment?.captainEarning ??
      (order.shippingCost ? Math.min(order.shippingCost, 2000) : 2000);
    const orderPrice = order.totalAmount ?? 0;
    const netRequiredFils = Math.max(0, orderPrice - carrierCost);

    totalOrdersPriceFils += orderPrice;
    totalCarrierCostFils += carrierCost;
    totalNetRequiredFils += netRequiredFils;

    const destination = [order.deliveryJob?.city, order.deliveryJob?.area].filter(Boolean).join(' - ') || 'عمان والمحافظات';
    const formattedDate = new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'Asia/Amman',
    }).format(order.createdAt);

    const isSettled = order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ';
    const settledAmount = isSettled ? netRequiredFils : 0;
    const remaining = isSettled ? 0 : netRequiredFils;

    totalSettledFils += settledAmount;
    totalRemainingFils += remaining;

    rawBatches.push({
      batchId: order.id,
      batchReference: `طلب فردي: ${order.reference}`,
      ordersCount: 1,
      shopsCount,
      totalOrdersPriceFils: orderPrice,
      totalCarrierCostFils: carrierCost,
      netRequiredFils,
      status: ORDER_STATUS_LABELS[order.status] || order.status,
      destination,
      date: formattedDate,
    });
  }

  const successRateNum = totalOrders > 0 ? Math.round((deliveredOrders / totalOrders) * 100) : 0;
  const deliverySuccessRate = `${successRateNum}%`;

  const isDetailed = filter.isDetailed ?? true;

  // الأعمدة المعتمدة الجديدة للطلبيات (Batches):
  // تم حذف: سائق الشحنة، عهدة معلقة، أجرة التوصيل الفردية، صافي التوريد، طريقة الدفع، شركة التوصيل، ورقم الشحنة.
  // تم دمج المتوقع والمحصل في عامود واحد هو "المطلوب" = سعر الطلبيات - سعر التوصيل الإجمالي.
  // تم إضافة عامود "عدد المحلات التي استلم منها" بجانب عامود "عدد الطلبات".
  const columns = isDetailed
    ? [
        'طلبية التجميع (Batch)',
        'عدد الطلبات',
        'عدد المحلات التي استلم منها',
        'مجموع أسعار الطلبيات',
        'مجموع سعر التوصيل',
        'المطلوب (الصافي)',
        'الحالة',
        'الوجهة',
        'التاريخ',
      ]
    : ['المؤشر التشغيلي / المالي', 'القيمة الإجمالية'];

  const rows = isDetailed
    ? rawBatches.map(b => [
        b.batchReference,
        b.ordersCount.toString(),
        b.shopsCount.toString(),
        filsToDisplay(b.totalOrdersPriceFils),
        filsToDisplay(b.totalCarrierCostFils),
        filsToDisplay(b.netRequiredFils),
        b.status,
        b.destination,
        b.date,
      ])
    : [
        ['إجمالي طلبيات التجميع (Batches)', totalBatches.toString()],
        ['إجمالي عدد الطلبات', totalOrders.toString()],
        ['شحنات تم تسليمها بنجاح', deliveredOrders.toString()],
        ['نسبة نجاح التسليم الفعلية', deliverySuccessRate],
        ['شحنات قيد التوصيل الميداني', inProgressOrders.toString()],
        ['شحنات متعذرة أو مرتجعة', failedOrders.toString()],
        ['مجموع أسعار الطلبيات الإجمالي', filsToDisplay(totalOrdersPriceFils)],
        ['مجموع سعر التوصيل الإجمالي', filsToDisplay(totalCarrierCostFils)],
        ['صافي المبلغ المطلوب (سعر الطلبيات - سعر التوصيل)', filsToDisplay(totalNetRequiredFils)],
        ['إجمالي المسدد بالتسويات المعتمدة', filsToDisplay(totalSettledFils)],
        ['صافي المتبقي بذمة شركة التوصيل', filsToDisplay(totalRemainingFils)],
      ];

  let reportTitle = 'تقرير جرد طلبيات التوصيل والتسويات المعتمدة · رَواق';
  if (scope === 'UNDELIVERED') {
    reportTitle = 'تقرير جرد ومتابعة الطلبيات غير المسلمة (قيد التوصيل) · رَواق';
  } else if (scope === 'ALL') {
    reportTitle = 'كشف جرد ومطابقة طلبيات التوصيل الشامل · رَواق';
  }

  return {
    reportTitle,
    department: 'DELIVERY',
    deliveryScope: scope,
    generatedAt: new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Amman',
    }).format(new Date()),
    filtersApplied: {
      ...(filter.courierCompany ? { 'شركة التوصيل': filter.courierCompany } : {}),
      ...(filter.batchReference ? { 'طلبية التجميع': filter.batchReference } : {}),
      'نطاق الجرد': scope === 'DELIVERED' ? 'الطلبيات المسلمة (للجرد والتسوية)' : scope === 'UNDELIVERED' ? 'الطلبيات غير المسلمة (قيد التوصيل)' : 'كافة الطلبيات (شامل)',
      ...(filter.status ? { 'الحالة': filter.status } : {}),
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    summary: {
      totalBatches,
      totalOrders,
      deliveredOrders,
      failedOrders,
      inProgressOrders,
      deliverySuccessRate,
      totalOrdersPriceFils,
      totalCarrierCostFils,
      totalNetRequiredFils,
      totalSettledFils,
      totalRemainingFils,
    },
    columns,
    rows,
    rawBatches,
    settlements,
  };
}
