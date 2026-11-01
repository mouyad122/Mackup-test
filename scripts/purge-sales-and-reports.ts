import { prisma } from '../src/lib/db';

async function main() {
  console.log('--- بدء عملية تفريغ بيانات المبيعات والتقارير والتسويات في رَواق ---');

  const result = await prisma.$transaction(async (tx) => {
    // 1. مسارات ومهام التوصيل اللوجستية
    const stops = await tx.deliveryStop.deleteMany({});
    const jobs = await tx.deliveryJob.deleteMany({});
    const assignments = await tx.deliveryAssignment.deleteMany({});

    // 2. الفولفيلمنت والطرود
    const packageItems = await tx.packageItem.deleteMany({});
    const packages = await tx.package.deleteMany({});
    const fulfillmentItems = await tx.fulfillmentItem.deleteMany({});
    const fulfillmentOrders = await tx.fulfillmentOrder.deleteMany({});
    const fulfillmentOutboxes = await tx.fulfillmentOutbox.deleteMany({});

    // 3. قسائم الخصم والمكافآت المرتبطة بالطلبات
    const couponRedemptions = await tx.couponRedemption.deleteMany({});
    const rewardRedemptions = await tx.rewardRedemption.deleteMany({});

    // 4. المرتجعات والدفعات والفواتير
    const returnItems = await tx.returnItem.deleteMany({});
    const returns = await tx.return.deleteMany({});
    const payments = await tx.payment.deleteMany({});
    const invoices = await tx.invoice.deleteMany({});

    // 5. التسويات والدفتر المالي والفروقات والتقارير
    const differences = await tx.reconciliationDifference.deleteMany({});
    const supplierSettlements = await tx.supplierSettlement.deleteMany({});
    const captainSettlements = await tx.captainSettlement.deleteMany({});
    const finTxs = await tx.financialTransaction.deleteMany({});
    const reports = await tx.officialReport.deleteMany({});
    const expenses = await tx.expense.deleteMany({});

    // 6. بنود الطلبات وسجل الحالات والطلبات نفسها
    const orderItems = await tx.orderItem.deleteMany({});
    const orderHistories = await tx.orderStatusHistory.deleteMany({});
    const orders = await tx.order.deleteMany({});
    const batches = await tx.deliveryBatch.deleteMany({});

    // 7. مبيعات الكاشير ونقاط البيع (POS)
    const saleItems = await tx.saleItem.deleteMany({});
    const heldSales = await tx.heldSale.deleteMany({});
    const sales = await tx.sale.deleteMany({});

    // 8. تنظيف سجلات التدقيق المرتبطة بعمليات البيع والتوصيل والتقارير المحذوفة
    const auditPurged = await tx.auditLog.deleteMany({
      where: {
        entityType: {
          in: [
            'Order',
            'OrderItem',
            'Sale',
            'SaleItem',
            'DeliveryBatch',
            'DeliveryJob',
            'DeliveryStop',
            'OfficialReport',
            'FinancialTransaction',
            'ReconciliationDifference',
            'SupplierSettlement',
            'CaptainSettlement',
            'Payment',
            'Invoice',
            'Return',
          ],
        },
      },
    });

    return {
      orders: orders.count,
      orderItems: orderItems.count,
      batches: batches.count,
      jobs: jobs.count,
      stops: stops.count,
      sales: sales.count,
      saleItems: saleItems.count,
      invoices: invoices.count,
      payments: payments.count,
      financialTransactions: finTxs.count,
      officialReports: reports.count,
      differences: differences.count,
      expenses: expenses.count,
      auditPurged: auditPurged.count,
    };
  });

  console.log('✅ تم الانتهاء بنجاح من تفريغ كافة البيانات التشغيلية والتجريبية:');
  console.log(JSON.stringify(result, null, 2));

  // التحقق من الحفاظ الكامل على البيانات الحيوية
  const preserved = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    categories: await prisma.category.count(),
    employees: await prisma.employee.count(),
    roles: await prisma.role.count(),
    suppliers: await prisma.supplier.count(),
    settings: await prisma.siteSettings.count(),
    shippingZones: await prisma.shippingZone.count(),
  };

  console.log('🔒 تأكيد سلامة البيانات الأساسية المحفوظة:');
  console.log(JSON.stringify(preserved, null, 2));
}

main()
  .catch((e) => {
    console.error('❌ حدث خطأ أثناء التفريغ:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
