import { prisma } from '@/lib/db';

export interface ReconciliationKPIs {
  supplierAccountingObligationFils: number;
  supplierEligiblePayoutFils: number;
  deliveryCodCustodyFils: number;
  deliveryDueFeesFils: number;
  unresolvedDifferencesFils: number;
  unresolvedDifferencesCount: number;
  completedSettlementsCount: number;
  completedSettlementsAmountFils: number;
}

export interface ActionItem {
  id: string;
  type: 'BATCH_REMITTANCE' | 'SUPPLIER_PAYOUT' | 'CAPTAIN_CUSTODY' | 'OPEN_DIFFERENCE';
  title: string;
  subtitle: string;
  entityName: string;
  expectedAmountFils: number;
  secondaryAmountFils?: number;
  badge: string;
  actionText: string;
  linkParam?: string;
}

export interface SupplierReconciliationSummary {
  supplierId: string;
  supplierName: string;
  phone?: string | null;
  totalSalesFils: number;
  totalCostFils: number;
  totalSupplierProfitFils: number;
  totalAccountingObligationFils: number;
  eligiblePayoutFils: number;
  totalPaidFils: number;
  remainingBalanceFils: number;
  deliveredOrdersCount: number;
  pendingOrdersCount: number;
  totalSuppliedUnits: number;
  deliveredUnits: number;
  pendingUnits: number;
}

export interface DeliveryBatchReconciliationItem {
  batchId: string;
  reference: string;
  courierCompany: string;
  courierName: string;
  courierPhone: string;
  status: string;
  createdAt: Date;
  ordersCount: number;
  deliveredCount: number;
  failedCount: number;
  inProgressCount: number;
  totalItemsCount: number;
  deliveredItemsCount: number;
  expectedCodFils: number;
  collectedCodFils: number;
  totalCarrierCostFils: number;
  netExpectedRemittanceFils: number;
  previouslyRemittedFils: number;
  remainingBalanceFils: number;
  isSettled: boolean;
  isPartiallySettled: boolean;
  settledAt?: Date | null;
}

export interface CaptainReconciliationSummary {
  captainId: string;
  captainName: string;
  phone: string;
  isActive: boolean;
  earnedFeesFils: number;
  paidFeesFils: number;
  remainingEarningsFils: number;
  cashCustodyHeldFils: number;
  cashCustodyRemittedFils: number;
  netCashCustodyFils: number;
  netPositionFils: number; // cash custody - remaining earnings
}

export class ReconciliationService {
  /**
   * حساب المؤشرات المالية العامة الأربعة بدقة ومن دون تقطيع السجلات
   */
  static async getKPIs(): Promise<ReconciliationKPIs> {
    const [txSums, openDifferences] = await Promise.all([
      prisma.financialTransaction.groupBy({
        by: ['type'],
        _sum: { amount: true },
      }),
      prisma.reconciliationDifference.aggregate({
        where: { status: 'OPEN' },
        _sum: { differenceAmount: true },
        _count: true,
      }),
    ]);

    const sumMap = new Map<string, number>(txSums.map(t => [t.type, t._sum.amount ?? 0]));
    const sum = (type: string) => sumMap.get(type) ?? 0;

    // 1. المستحق المحاسبي للمحلات
    const supplierObligations = sum('SUPPLIER_OBLIGATION') - sum('SUPPLIER_OBLIGATION_REVERSAL');
    const supplierPaid = sum('SUPPLIER_PAYMENT') - sum('SUPPLIER_PAYMENT_REVERSAL');
    const supplierAccountingObligationFils = Math.max(0, supplierObligations - supplierPaid);

    // 2. المبلغ القابل للصرف للمحلات (الطلبات المسلمة والمحصل نقدها وفق السياسة المحافظة)
    const eligibleDeliveredItems = await prisma.orderItem.findMany({
      where: {
        order: { status: 'DELIVERED' },
        supplierIdSnapshot: { not: null },
      },
      select: {
        unitCostSnapshot: true,
        quantity: true,
        supplierAmountSnapshot: true,
        order: {
          select: {
            paymentStatus: true,
            deliveryJob: {
              select: {
                isCodCollected: true,
                codStatus: true,
              },
            },
          },
        },
      },
    });

    const supplierEligibleTotal = eligibleDeliveredItems.reduce((acc, item) => {
      const isPrepaid = item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'PREPAID';
      const isCollectionVerified = isPrepaid ||
        !item.order.deliveryJob ||
        item.order.deliveryJob.isCodCollected ||
        item.order.deliveryJob.codStatus === 'COLLECTED_BY_COURIER' ||
        item.order.deliveryJob.codStatus === 'SETTLED_TO_RAWAQ';

      if (!isCollectionVerified) return acc;
      const cost = (item.unitCostSnapshot ?? 0) * item.quantity;
      const profit = item.supplierAmountSnapshot ?? 0;
      return acc + cost + profit;
    }, 0);
    const supplierEligiblePayoutFils = Math.max(0, Math.min(supplierEligibleTotal - supplierPaid, supplierAccountingObligationFils));

    // 3. نقد عهدة لدى شركات التوصيل (COD محصّل فعلياً لم يُورَّد بعد)
    const [deliveredCodOrders, totalCodSettled] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: 'DELIVERED',
          paymentStatus: { notIn: ['PAID', 'PREPAID'] },
        },
        select: {
          totalAmount: true,
          deliveryJob: {
            select: {
              codAmountToCollect: true,
              isCodCollected: true,
              codStatus: true,
            },
          },
        },
      }),
      Promise.resolve(sum('COD_SETTLEMENT')),
    ]);

    const totalCollectedCod = deliveredCodOrders.reduce((acc, o) => {
      const isVerified = Boolean(
        o.deliveryJob?.isCodCollected ||
        o.deliveryJob?.codStatus === 'COLLECTED_BY_COURIER' ||
        o.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ'
      );
      const codDue = o.deliveryJob?.codAmountToCollect ?? o.totalAmount ?? 0;
      const actual = isVerified
        ? ((o.deliveryJob as any)?.collectedAmount ?? o.deliveryJob?.codAmountToCollect ?? codDue)
        : (!o.deliveryJob ? codDue : (o.deliveryJob?.isCodCollected ? codDue : 0));
      return acc + actual;
    }, 0);
    const deliveryCodCustodyFils = Math.max(0, totalCollectedCod - totalCodSettled);

    // 4. رسوم التوصيل المستحقة لشركات التوصيل الخارجية
    // تُحسب من تكاليف التوصيل الفعلية للطلبات المسلّمة ناقص ما دُفع
    const [deliveredDeliveryCost, deliveryCostPaid] = await Promise.all([
      prisma.order.aggregate({
        where: { status: 'DELIVERED' },
        _sum: { actualDeliveryCost: true },
      }),
      Promise.resolve(sum('DELIVERY_COST') - sum('DELIVERY_COST_REVERSAL')),
    ]);
    const totalDeliveryCostDue = deliveredDeliveryCost._sum.actualDeliveryCost ?? 0;
    // نستخدم بيانات CAPTAIN_EARNING للتوافق مع النظام الحالي
    const captainEarned = sum('CAPTAIN_EARNING') - sum('CAPTAIN_EARNING_REVERSAL');
    const captainPaid = sum('CAPTAIN_PAYMENT') - sum('CAPTAIN_PAYMENT_REVERSAL');
    const deliveryDueFeesFils = Math.max(0, captainEarned - captainPaid);

    // 5. الفروقات غير المحلولة
    const unresolvedDifferencesFils = openDifferences._sum.differenceAmount ?? 0;
    const unresolvedDifferencesCount = openDifferences._count;

    // 6. التسويات المكتملة
    const [completedBatches, supplierPaymentCount] = await Promise.all([
      prisma.deliveryBatch.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.financialTransaction.count({
        where: { type: 'SUPPLIER_PAYMENT' },
      }),
    ]);
    const completedSettlementsCount = completedBatches + supplierPaymentCount;
    const completedSettlementsAmountFils = sum('COD_SETTLEMENT') + sum('SUPPLIER_PAYMENT');

    return {
      supplierAccountingObligationFils,
      supplierEligiblePayoutFils,
      deliveryCodCustodyFils,
      deliveryDueFeesFils,
      unresolvedDifferencesFils,
      unresolvedDifferencesCount,
      completedSettlementsCount,
      completedSettlementsAmountFils,
    };
  }

  /**
   * قائمة ما يحتاج تسوية اليوم (عناصر قابلة للإجراء الفوري)
   */
  static async getActionItems(): Promise<ActionItem[]> {
    const items: ActionItem[] = [];

    // أ. طلبيات توصيل مكتملة تحتوي نقداً محصلاً بانتظار التوريد
    const pendingBatches = await prisma.deliveryBatch.findMany({
      where: {
        status: { in: ['COMPLETED', 'IN_DELIVERY'] },
      },
      include: {
        orders: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            actualDeliveryCost: true,
            shippingCost: true,
            deliveryJob: { select: { codStatus: true, codAmountToCollect: true } },
          },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    for (const batch of pendingBatches) {
      const deliveredOrders = batch.orders.filter(o => o.status === 'DELIVERED');
      if (deliveredOrders.length === 0) continue;

      const collectedCod = deliveredOrders.reduce((acc, o) => {
        return acc + (o.deliveryJob?.codAmountToCollect || o.totalAmount || 0);
      }, 0);

      const fees = deliveredOrders.reduce((acc, o) => {
        return acc + (o.actualDeliveryCost ?? o.shippingCost ?? 0);
      }, 0);

      const expectedRemittance = Math.max(0, collectedCod - fees);

      // فحص هل سُجلت تسوية لهذه الطلبية
      const settlementTx = await prisma.financialTransaction.findFirst({
        where: { businessEventKey: `batch-settlement:${batch.id}` },
      });

      if (!settlementTx && collectedCod > 0) {
        items.push({
          id: `batch-${batch.id}`,
          type: 'BATCH_REMITTANCE',
          title: `كشف طلبية ${batch.reference}`,
          subtitle: `${deliveredOrders.length} طلبات تم تسليمها · تحصيل نقدي`,
          entityName: batch.courierCompany || batch.courierName || 'شركة التوصيل',
          expectedAmountFils: expectedRemittance,
          secondaryAmountFils: collectedCod,
          badge: 'بحاجة لمطابقة وتوريد',
          actionText: 'مطابقة التوريد',
          linkParam: `v=batches&batchId=${batch.id}`,
        });
      }
    }

    // ب. محلات بانتظار الصرف (طلبات مسلمة تتجاوز 0 فلس)
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      take: 20,
    });

    for (const sup of suppliers) {
      const summary = await this.getSupplierSummary(sup.id);
      if (summary.eligiblePayoutFils > 0) {
        items.push({
          id: `supplier-${sup.id}`,
          type: 'SUPPLIER_PAYOUT',
          title: `مستحقات المحل: ${sup.name}`,
          subtitle: `${summary.deliveredOrdersCount} طلبات مسلمة استوفت شروط الصرف`,
          entityName: sup.name,
          expectedAmountFils: summary.eligiblePayoutFils,
          secondaryAmountFils: summary.remainingBalanceFils,
          badge: 'جاهز للصرف',
          actionText: 'تسجيل دفعة للمحل',
          linkParam: `v=shops&supplierId=${sup.id}`,
        });
      }
    }

    // ج. شركات توصيل بذمتها عهدة COD معلقة (من DeliveryJob)
    const pendingCodJobs = await prisma.deliveryJob.findMany({
      where: { codStatus: 'COLLECTED_BY_COURIER' },
      include: {
        order: {
          select: {
            reference: true,
            deliveryBatch: { select: { courierCompany: true, reference: true } },
          },
        },
      },
      take: 10,
    });

    // تجميع حسب شركة التوصيل
    const companyCodMap = new Map<string, number>();
    for (const job of pendingCodJobs) {
      const company = job.order.deliveryBatch?.courierCompany || 'شركة التوصيل';
      companyCodMap.set(company, (companyCodMap.get(company) ?? 0) + (job.codAmountToCollect ?? 0));
    }
    for (const [company, amount] of companyCodMap.entries()) {
      if (amount > 0) {
        items.push({
          id: `cod-company-${company}`,
          type: 'CAPTAIN_CUSTODY',
          title: `عهدة COD بذمة: ${company}`,
          subtitle: `نقد محصّل من العملاء لم يُورَّد إلى خزينة رَواق بعد`,
          entityName: company,
          expectedAmountFils: amount,
          badge: 'عهدة COD معلقة',
          actionText: 'توريد العهدة وتسوية الطلبية',
          linkParam: `v=batches`,
        });
      }
    }

    // د. فروقات غير محلولة
    const openDiffs = await prisma.reconciliationDifference.findMany({
      where: { status: 'OPEN' },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    for (const diff of openDiffs) {
      items.push({
        id: `diff-${diff.id}`,
        type: 'OPEN_DIFFERENCE',
        title: `فرق تسوية غير محلول (${diff.reference})`,
        subtitle: diff.notes || `فارق بقيمة المبالغ المصرح بها`,
        entityName: diff.entityName || diff.entityType,
        expectedAmountFils: Math.abs(diff.differenceAmount),
        badge: 'مراجعة الفرق مطلوبة',
        actionText: 'معالجة الفرق',
        linkParam: `v=differences&diffId=${diff.id}`,
      });
    }

    return items;
  }

  /**
   * تفاصيل مورد كاملة مع الفصل الدقيق بين المستحق المحاسبي والقابل للصرف
   */
  static async getSupplierSummary(supplierId: string): Promise<SupplierReconciliationSummary> {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true, name: true, phone: true },
    });

    if (!supplier) {
      throw new Error('المورد غير موجود.');
    }

    const [txSums, orderItems] = await Promise.all([
      prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { supplierId },
        _sum: { amount: true },
      }),
      prisma.orderItem.findMany({
        where: {
          supplierIdSnapshot: supplierId,
          isRemoved: false,
          order: {
            status: { notIn: ['CANCELLED', 'REFUNDED', 'AWAITING_WHATSAPP'] },
          },
        },
        select: {
          quantity: true,
          total: true,
          unitCostSnapshot: true,
          supplierAmountSnapshot: true,
          platformProductProfitSnapshot: true,
          order: {
            select: {
              id: true,
              reference: true,
              status: true,
              paymentStatus: true,
              createdAt: true,
              deliveryJob: {
                select: {
                  isCodCollected: true,
                  codStatus: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const sumMap = new Map<string, number>(txSums.map(t => [t.type, t._sum.amount ?? 0]));
    const sum = (type: string) => sumMap.get(type) ?? 0;

    let totalSalesFils = 0;
    let totalCostFils = 0;
    let totalSupplierProfitFils = 0;
    let deliveredObligationFils = 0;
    let deliveredOrdersCount = 0;
    let pendingOrdersCount = 0;
    let totalSuppliedUnits = 0;
    let deliveredUnits = 0;
    let pendingUnits = 0;

    const seenDeliveredOrders = new Set<string>();
    const seenPendingOrders = new Set<string>();

    for (const item of orderItems) {
      const itemCost = (item.unitCostSnapshot ?? 0) * item.quantity;
      const itemProfit = item.supplierAmountSnapshot ?? 0;
      totalSalesFils += item.total;
      totalCostFils += itemCost;
      totalSupplierProfitFils += itemProfit;
      totalSuppliedUnits += item.quantity;

      const isDelivered = item.order.status === 'DELIVERED';
      const isPrepaid = item.order.paymentStatus === 'PAID' || item.order.paymentStatus === 'PREPAID';
      // سياسة الصرف المحافظة المعتمدة لرَواق:
      // 1. تسليم الطلب للزبونة (DELIVERED)
      // 2. التحصيل مؤكد لطلبات COD أو مدفوع مسبقاً
      const isCollectionVerified = isPrepaid ||
        !item.order.deliveryJob ||
        item.order.deliveryJob.isCodCollected ||
        item.order.deliveryJob.codStatus === 'COLLECTED_BY_COURIER' ||
        item.order.deliveryJob.codStatus === 'SETTLED_TO_RAWAQ';

      if (isDelivered && isCollectionVerified) {
        deliveredObligationFils += itemCost + itemProfit;
        seenDeliveredOrders.add(item.order.id);
        deliveredUnits += item.quantity;
      } else {
        seenPendingOrders.add(item.order.id);
        pendingUnits += item.quantity;
      }
    }

    deliveredOrdersCount = seenDeliveredOrders.size;
    pendingOrdersCount = seenPendingOrders.size;

    // الحركات المالية من الدفتر المالي
    const obligations = sum('SUPPLIER_OBLIGATION') - sum('SUPPLIER_OBLIGATION_REVERSAL');
    const totalPaidFils = sum('SUPPLIER_PAYMENT') - sum('SUPPLIER_PAYMENT_REVERSAL');
    const totalAccountingObligationFils = Math.max(0, obligations);
    const remainingBalanceFils = Math.max(0, totalAccountingObligationFils - totalPaidFils);

    // القابل للصرف: المستحقات المسلّمة ناقص المدفوع
    const eligiblePayoutFils = Math.max(0, Math.min(deliveredObligationFils - totalPaidFils, remainingBalanceFils));

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      phone: supplier.phone,
      totalSalesFils,
      totalCostFils,
      totalSupplierProfitFils,
      totalAccountingObligationFils,
      eligiblePayoutFils,
      totalPaidFils,
      remainingBalanceFils,
      deliveredOrdersCount,
      pendingOrdersCount,
      totalSuppliedUnits,
      deliveredUnits,
      pendingUnits,
    };
  }

  /**
   * كشف حساب شركة توصيل / طلبية مجمعة (BATCH)
   */
  static async getDeliveryBatches(): Promise<DeliveryBatchReconciliationItem[]> {
    const batches = await prisma.deliveryBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        orders: {
          select: {
            id: true,
            reference: true,
            customerName: true,
            status: true,
            paymentStatus: true,
            totalAmount: true,
            shippingCost: true,
            actualDeliveryCost: true,
            items: {
              select: {
                quantity: true,
              },
            },
            deliveryJob: {
              select: {
                id: true,
                codStatus: true,
                codAmountToCollect: true,
                isCodCollected: true,
              },
            },
          },
        },
      },
    });

    const items: DeliveryBatchReconciliationItem[] = [];

    for (const b of batches) {
      let expectedCodFils = 0;
      let collectedCodFils = 0;
      let totalCarrierCostFils = 0;
      let deliveredCount = 0;
      let failedCount = 0;
      let inProgressCount = 0;
      let totalItemsCount = 0;
      let deliveredItemsCount = 0;

      for (const o of b.orders) {
        const orderCarrierCost = o.actualDeliveryCost ?? o.shippingCost ?? 0;
        const isPrepaid = o.paymentStatus === 'PAID' || o.paymentStatus === 'PREPAID';
        const codAmount = isPrepaid ? 0 : (o.deliveryJob?.codAmountToCollect || o.totalAmount || 0);
        expectedCodFils += codAmount;

        const orderItemsQty = o.items?.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0) || 0;
        totalItemsCount += orderItemsQty;

        if (o.status === 'DELIVERED') {
          deliveredCount++;
          deliveredItemsCount += orderItemsQty;
          const isCollected = o.deliveryJob?.isCodCollected ||
            o.deliveryJob?.codStatus === 'COLLECTED_BY_COURIER' ||
            o.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ';
          const actualCollected = isCollected
            ? (o.deliveryJob?.codAmountToCollect ?? codAmount)
            : (!o.deliveryJob ? codAmount : (o.deliveryJob?.isCodCollected ? codAmount : 0));
          collectedCodFils += actualCollected;
          totalCarrierCostFils += orderCarrierCost;
        } else if (['CANCELLED', 'REFUNDED', 'FAILED_DELIVERY'].includes(o.status)) {
          failedCount++;
        } else {
          inProgressCount++;
        }
      }

      const netExpectedRemittanceFils = Math.max(0, collectedCodFils - totalCarrierCostFils);

      // جلب كافة التوريدات السابقة (لدعم التسويات الجزئية)
      const remittances = await prisma.financialTransaction.findMany({
        where: {
          OR: [
            { businessEventKey: `batch-settlement:${b.id}` },
            { businessEventKey: { startsWith: `batch-remittance:${b.id}:` } },
          ],
          type: 'COD_SETTLEMENT',
        },
        orderBy: { createdAt: 'desc' },
      });

      const previouslyRemittedFils = remittances.reduce((sum, r) => sum + r.amount, 0);
      const remainingBalanceFils = Math.max(0, netExpectedRemittanceFils - previouslyRemittedFils);
      const isSettled = remainingBalanceFils === 0 && previouslyRemittedFils > 0;
      const isPartiallySettled = previouslyRemittedFils > 0 && remainingBalanceFils > 0;

      items.push({
        batchId: b.id,
        reference: b.reference,
        courierCompany: b.courierCompany || 'شركة توصيل محلية',
        courierName: b.courierName || '—',
        courierPhone: b.courierPhone || '—',
        status: b.status,
        createdAt: b.createdAt,
        ordersCount: b.orders.length,
        deliveredCount,
        failedCount,
        inProgressCount,
        totalItemsCount,
        deliveredItemsCount,
        expectedCodFils,
        collectedCodFils,
        totalCarrierCostFils,
        netExpectedRemittanceFils,
        previouslyRemittedFils,
        remainingBalanceFils,
        isSettled,
        isPartiallySettled,
        settledAt: remittances[0]?.createdAt || null,
      });
    }

    return items;
  }

  /**
   * حسابات الكابتن: فصل الأجر المستحق عن العهدة النقدية
   */
  static async getCaptainSummary(captainId: string): Promise<CaptainReconciliationSummary> {
    const captain = await prisma.captain.findUnique({
      where: { id: captainId },
      select: { id: true, name: true, phone: true, isActive: true },
    });

    if (!captain) throw new Error('الكابتن غير موجود.');

    const [txSums, collectedJobs, settledRemittances] = await Promise.all([
      prisma.financialTransaction.groupBy({
        by: ['type'],
        where: { captainId },
        _sum: { amount: true },
      }),
      // النقد المحصل من الزبائن بواسطة هذا الكابتن
      prisma.deliveryAssignment.findMany({
        where: {
          captainId,
          order: {
            status: 'DELIVERED',
          },
        },
        include: {
          order: {
            select: {
              totalAmount: true,
              paymentStatus: true,
              deliveryJob: { select: { codAmountToCollect: true, codStatus: true } },
            },
          },
        },
      }),
      // التوريدات النقدية التي سلمها الكابتن بالفعل للمتجر
      prisma.financialTransaction.aggregate({
        where: {
          captainId,
          type: { in: ['COD_SETTLEMENT', 'RECONCILIATION_CLEARING'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const sumMap = new Map<string, number>(txSums.map(t => [t.type, t._sum.amount ?? 0]));
    const sum = (type: string) => sumMap.get(type) ?? 0;

    const earnedFeesFils = sum('CAPTAIN_EARNING') - sum('CAPTAIN_EARNING_REVERSAL');
    const paidFeesFils = sum('CAPTAIN_PAYMENT') - sum('CAPTAIN_PAYMENT_REVERSAL');
    const remainingEarningsFils = Math.max(0, earnedFeesFils - paidFeesFils);

    // النقد المحصل كعهدة
    let cashCustodyHeldFils = 0;
    for (const asg of collectedJobs) {
      if (asg.order.paymentStatus !== 'PAID') {
        const codVal = asg.order.deliveryJob?.codAmountToCollect || asg.order.totalAmount || 0;
        cashCustodyHeldFils += codVal;
      }
    }

    const cashCustodyRemittedFils = settledRemittances._sum.amount ?? 0;
    const netCashCustodyFils = Math.max(0, cashCustodyHeldFils - cashCustodyRemittedFils);
    const netPositionFils = netCashCustodyFils - remainingEarningsFils;

    return {
      captainId: captain.id,
      captainName: captain.name,
      phone: captain.phone,
      isActive: captain.isActive,
      earnedFeesFils,
      paidFeesFils,
      remainingEarningsFils,
      cashCustodyHeldFils,
      cashCustodyRemittedFils,
      netCashCustodyFils,
      netPositionFils,
    };
  }
}
