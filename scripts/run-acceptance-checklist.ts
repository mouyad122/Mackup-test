import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { executeOrderFulfillmentSplit, enqueueOrderFulfillmentSplit } from '../src/lib/fulfillment/order-splitter';
import { processPendingFulfillmentOutbox } from '../src/lib/fulfillment/outbox-worker';
import {
  createSupplierAccessSession,
  getSupplierPortalData,
  updateSupplierFulfillmentStatus,
  verifyCourierPackagePickup,
  dispatchOrderForFinalDelivery,
  validateSupplierSession,
} from '../src/lib/fulfillment/supplier-session';
import { generateDeliveryManifest } from '../src/lib/fulfillment/delivery-manifest';

interface TestResult {
  title: string;
  passed: boolean;
  notes: string;
}

const results: TestResult[] = [];

async function recordTest(title: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ title, passed: true, notes: 'ناجح ✅' });
    console.log(`[PASS] ${title}`);
  } catch (err: any) {
    results.push({ title, passed: false, notes: err?.message || String(err) });
    console.error(`[FAIL] ${title}:`, err);
  }
}

async function runAcceptanceSuite() {
  console.log('\n======================================================');
  console.log('🧪 بدء تشغيل قائمة اختبار القبول التشغيلي لرَواق (10/10)');
  console.log('======================================================\n');

  // جلب صنف تجريبي للاستخدام
  const sampleVariant = await prisma.productVariant.findFirst({
    where: { isActive: true },
    include: { product: true },
  });

  if (!sampleVariant) {
    throw new Error('لا توجد منتجات مسجلة في قاعدة البيانات.');
  }

  // مصفوفة بمعرفات الطلبات التجريبية لتنظيفها فور الانتهاء
  const createdTestOrderIds: string[] = [];
  const createdTestSupplierIds: string[] = [];

  try {
    // تجهيز موردين للاختبار
    const sup1 = await prisma.supplier.create({
      data: { name: 'مورد أ (عمان)', phone: '0791111111', isActive: true },
    });
    createdTestSupplierIds.push(sup1.id);

    const sup2 = await prisma.supplier.create({
      data: { name: 'مورد ب (إربد)', phone: '0792222222', isActive: true },
    });
    createdTestSupplierIds.push(sup2.id);

    const sup3 = await prisma.supplier.create({
      data: { name: 'مورد ج (الزرقاء)', phone: '0793333333', isActive: true },
    });
    createdTestSupplierIds.push(sup3.id);

    // 1. طلب من مورد واحد مع توصيل مباشر
    await recordTest('طلب من مورد واحد مع توصيل مباشر (DIRECT_PICKUP)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-1-${Date.now()}`,
          customerName: 'رانيا خليل',
          customerPhone: '0791000001',
          status: 'CONFIRMED',
          totalAmount: 25000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-1-${Date.now()}`,
                name: 'منتج تجريبي 1',
                size: 'M',
                quantity: 1,
                unitPrice: 22000,
                total: 22000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      const split = await executeOrderFulfillmentSplit(order.id);
      if (split.fulfillmentOrdersCount !== 1) throw new Error('يجب إنشاء أمر تجهيز واحد');
      if (split.strategy !== 'DIRECT_PICKUP') throw new Error('الاستراتيجية يجب أن تكون DIRECT_PICKUP');
    });

    // 2. طلب من ثلاثة موردين ومواقع استلام مختلفة
    let multiOrderId = '';
    await recordTest('طلب من ثلاثة موردين ومواقع استلام مختلفة (DIRECT_MULTI_PICKUP)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-2-${Date.now()}`,
          customerName: 'فرح ناصر',
          customerPhone: '0791000002',
          status: 'CONFIRMED',
          totalAmount: 65000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-2A-${Date.now()}`,
                name: 'صنف مورد 1',
                size: 'S',
                quantity: 1,
                unitPrice: 20000,
                total: 20000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-2B-${Date.now()}`,
                name: 'صنف مورد 2',
                size: 'M',
                quantity: 1,
                unitPrice: 20000,
                total: 20000,
                supplierIdSnapshot: sup2.id,
                supplierNameSnapshot: sup2.name,
              },
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-2C-${Date.now()}`,
                name: 'صنف مورد 3',
                size: 'L',
                quantity: 1,
                unitPrice: 22000,
                total: 22000,
                supplierIdSnapshot: sup3.id,
                supplierNameSnapshot: sup3.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);
      multiOrderId = order.id;

      const split = await executeOrderFulfillmentSplit(order.id);
      if (split.fulfillmentOrdersCount !== 3) throw new Error(`المتوقع 3 أوامر تجهيز لكن وُجد ${split.fulfillmentOrdersCount}`);
    });

    // 3. مورد يجهز الطلب وآخر يبلغ عن نقص
    await recordTest('مورد يجهز الطلب وآخر يبلغ عن نقص (ISSUE_REPORTED)', async () => {
      const fulfillments = await prisma.fulfillmentOrder.findMany({
        where: { orderId: multiOrderId },
      });

      const fulfillment1 = fulfillments.find((f) => f.supplierId === sup1.id)!;
      const fulfillment2 = fulfillments.find((f) => f.supplierId === sup2.id)!;

      const sessionA = await createSupplierAccessSession(sup1.id);
      await updateSupplierFulfillmentStatus(sessionA.rawToken, fulfillment1.id, 'READY', {
        packagesCount: 1,
      });

      const sessionB = await createSupplierAccessSession(sup2.id);
      await updateSupplierFulfillmentStatus(sessionB.rawToken, fulfillment2.id, 'REPORT_ISSUE', {
        issueReason: 'المقاس المطلوب M غير متوفر في المستودع',
      });

      const updatedFulfillment2 = await prisma.fulfillmentOrder.findUnique({
        where: { id: fulfillment2.id },
      });

      if (updatedFulfillment2?.status !== 'ISSUE_REPORTED') {
        throw new Error('فشل تسجيل حالة ISSUE_REPORTED للمورد');
      }
    });

    // 4. إنشاء الطرود وتوثيق استلام المندوب
    await recordTest('إنشاء الطرود وتوثيق استلام المندوب', async () => {
      const fulfillments = await prisma.fulfillmentOrder.findMany({
        where: { orderId: multiOrderId },
        include: { packages: true },
      });

      const fulfillment1 = fulfillments.find((f) => f.supplierId === sup1.id)!;
      const pkg = fulfillment1.packages[0];
      if (!pkg) throw new Error('لا يوجد طرد للمورد الأول');

      const pickupRes = await verifyCourierPackagePickup(pkg.packageCode, 'كابتن رَواق علي', {
        role: 'COURIER',
      });

      if (!pickupRes.success) throw new Error('فشل توثيق استلام المندوب');

      const updatedPkg = await prisma.package.findUnique({ where: { id: pkg.id } });
      if (updatedPkg?.status !== 'PICKED_UP') throw new Error('حالة الطرد لم تتحول إلى PICKED_UP');
    });

    // 5. التجميع المركزي قبل الخروج للتوصيل (CROSS_DOCK)
    await recordTest('التجميع المركزي قبل الخروج للتوصيل (CROSS_DOCK)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-CROSS-${Date.now()}`,
          customerName: 'منى عبد الله',
          customerPhone: '0791000005',
          status: 'CONFIRMED',
          totalAmount: 30000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          fulfillmentStrategy: 'CROSS_DOCK',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-CD-${Date.now()}`,
                name: 'صنف للتجميع',
                size: 'OneSize',
                quantity: 1,
                unitPrice: 27000,
                total: 27000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      await executeOrderFulfillmentSplit(order.id);
      const fulfillment = await prisma.fulfillmentOrder.findFirst({ where: { orderId: order.id } });

      const session = await createSupplierAccessSession(sup1.id);
      await updateSupplierFulfillmentStatus(session.rawToken, fulfillment!.id, 'READY', { packagesCount: 1 });

      const pkg = await prisma.package.findFirst({ where: { fulfillmentOrderId: fulfillment!.id } });
      await verifyCourierPackagePickup(pkg!.packageCode, 'المندوب', { role: 'COURIER' });

      // في Cross-Dock: يجب أن تكون الحالة RECEIVED_AT_HUB وليس OUT_FOR_DELIVERY
      const intermediateOrder = await prisma.order.findUnique({ where: { id: order.id } });
      if (intermediateOrder?.fulfillmentStatus !== 'RECEIVED_AT_HUB') {
        throw new Error(`حالة الطلب يجب أن تكون RECEIVED_AT_HUB ولكن وجدنا ${intermediateOrder?.fulfillmentStatus}`);
      }

      // الخروج للتوصيل يحتاج أمر صريح dispatchOrderForFinalDelivery
      await dispatchOrderForFinalDelivery(order.id, 'كابتن رَواق أحمد');
      const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
      if (finalOrder?.fulfillmentStatus !== 'OUT_FOR_DELIVERY') {
        throw new Error(`حالة الطلب النهائية يجب أن تكون OUT_FOR_DELIVERY ولكن وجدنا ${finalOrder?.fulfillmentStatus}`);
      }
    });

    // 6. تعطل العامل أثناء تقسيم الطلب وإعادة المحاولة
    await recordTest('تعطل العامل أثناء تقسيم الطلب وإعادة المحاولة (Outbox Retry)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-RETRY-${Date.now()}`,
          customerName: 'هدى حسام',
          customerPhone: '0791000006',
          status: 'CONFIRMED',
          totalAmount: 18000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-RET-${Date.now()}`,
                name: 'صنف تجربة التعطل',
                size: 'L',
                quantity: 1,
                unitPrice: 15000,
                total: 15000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      await enqueueOrderFulfillmentSplit(order.id);

      // محاكاة تعطل يدوي أولاً بتسجيل خطأ وزيادة العداد
      const outboxTask = await prisma.fulfillmentOutbox.findFirst({ where: { orderId: order.id } });
      await prisma.fulfillmentOutbox.update({
        where: { id: outboxTask!.id },
        data: { attempts: 1, lastError: 'Simulated Network Crash', nextRunAt: new Date(Date.now() - 1000) },
      });

      // تشغيل العامل لمعالجة المهام المجدولة
      const workerRes = await processPendingFulfillmentOutbox(5);
      if (workerRes.succeeded === 0) throw new Error('فشل العامل في معالجة وإعادة المحاولة');

      const completedTask = await prisma.fulfillmentOutbox.findUnique({ where: { id: outboxTask!.id } });
      if (completedTask?.status !== 'COMPLETED') throw new Error('حالة مهمة Outbox لم تصبح COMPLETED');
    });

    // 7. تشغيل مهمتي تقسيم بالتزامن دون تكرار (Concurrency Test)
    await recordTest('تشغيل مهمتي تقسيم بالتزامن دون تكرار (Row-Level Locking Concurrency)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-CONC-${Date.now()}`,
          customerName: 'ليلى عماد',
          customerPhone: '0791000007',
          status: 'CONFIRMED',
          totalAmount: 22000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-CONC-${Date.now()}`,
                name: 'صنف اختبار التزامن',
                size: 'XL',
                quantity: 1,
                unitPrice: 19000,
                total: 19000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      // إطلاق عاملين في نفس الميلي ثانية بالتوازي التام عبر Promise.all
      const [res1, res2] = await Promise.all([
        executeOrderFulfillmentSplit(order.id),
        executeOrderFulfillmentSplit(order.id),
      ]);

      // يجب أن يقوم أحدهما بالتقسيم والآخر بالتخطي بأمان دون تكرار
      const oneSkipped = res1.isIdempotentSkip || res2.isIdempotentSkip;
      if (!oneSkipped) throw new Error('فشل التزامن: كلا العاملين قاما بإعادة الإنشاء!');

      const actualOrdersCount = await prisma.fulfillmentOrder.count({ where: { orderId: order.id } });
      if (actualOrdersCount !== 1) throw new Error(`تكرار سجلات! وُجد ${actualOrdersCount} أمر تجهيز.`);
    });

    // 8. إلغاء طلب أثناء التجهيز
    await recordTest('إلغاء طلب أثناء التجهيز (Cancellation Handling)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-CANCEL-${Date.now()}`,
          customerName: 'ريم خالد',
          customerPhone: '0791000008',
          status: 'CONFIRMED',
          totalAmount: 35000,
          shippingCost: 3000,
          paymentStatus: 'COD_PENDING',
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-CANC-${Date.now()}`,
                name: 'صنف للإلغاء',
                size: 'M',
                quantity: 1,
                unitPrice: 32000,
                total: 32000,
                supplierIdSnapshot: sup1.id,
                supplierNameSnapshot: sup1.name,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      await executeOrderFulfillmentSplit(order.id);

      // محاكاة إلغاء الطلب
      await prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED', fulfillmentStatus: 'RETURNED_TO_ORIGIN' },
        });
        await tx.fulfillmentOrder.updateMany({
          where: { orderId: order.id },
          data: { status: 'CANCELLED' },
        });
      });

      const fOrder = await prisma.fulfillmentOrder.findFirst({ where: { orderId: order.id } });
      if (fOrder?.status !== 'CANCELLED') throw new Error('فشل إلغاء أمر تجهيز المورد عند إلغاء الطلب');
    });

    // 9. اختبار المورد من الهاتف وانتهاء الرابط
    await recordTest('اختبار المورد من الهاتف وانتهاء الرابط (Session Expiration)', async () => {
      // إنشاء جلسة منتهية الصلاحية
      const session = await createSupplierAccessSession(sup1.id, { expiresInHours: -1 });

      const validation = await validateSupplierSession(session.rawToken);
      if (validation !== null) {
        throw new Error('الرابط المنتهي الصلاحية يجب ألا يُقبل!');
      }

      // تجديد الرابط بسهولة
      const refreshedSession = await createSupplierAccessSession(sup1.id, { expiresInHours: 72 });
      const refreshedValidation = await validateSupplierSession(refreshedSession.rawToken);
      if (!refreshedValidation) {
        throw new Error('فشل التحقق من الرابط المجدد!');
      }
    });

    // 10. اختبار Checkout و POS تحت ضغط التجهيز
    await recordTest('اختبار Checkout و POS تحت ضغط التجهيز (Zero Latency Enqueue)', async () => {
      const order = await prisma.order.create({
        data: {
          reference: `ACC-PERF-${Date.now()}`,
          customerName: 'أداء المنصة',
          customerPhone: '0791000010',
          status: 'PENDING',
          totalAmount: 15000,
          shippingCost: 3000,
          items: {
            create: [
              {
                productId: sampleVariant.productId,
                variantId: sampleVariant.id,
                sku: `SKU-PERF-${Date.now()}`,
                name: 'صنف فحص الأداء',
                size: 'OneSize',
                quantity: 1,
                unitPrice: 12000,
                total: 12000,
              },
            ],
          },
        },
      });
      createdTestOrderIds.push(order.id);

      // قياس زمن عملية الـ Outbox Enqueue داخل المعاملة
      const start = performance.now();
      await enqueueOrderFulfillmentSplit(order.id);
      const elapsed = performance.now() - start;

      console.log(`⏱️ زمن تسجيل Outbox في Checkout عبر السحابة: ${elapsed.toFixed(2)}ms`);
      if (elapsed > 400) {
        throw new Error(`استغرقت عملية الإدراج ${elapsed}ms وهو أعلى من الحد المسموح`);
      }
    });
  } finally {
    // تنظيف شامل لكافة سجلات الاختبار التجريبية لحماية قاعدة البيانات 100%
    console.log('\n🧹 جاري تنظيف كافة السجلات التجريبية...');
    if (createdTestOrderIds.length > 0) {
      await prisma.packageItem.deleteMany({
        where: { package: { fulfillmentOrder: { orderId: { in: createdTestOrderIds } } } },
      });
      await prisma.package.deleteMany({
        where: { fulfillmentOrder: { orderId: { in: createdTestOrderIds } } },
      });
      await prisma.fulfillmentItem.deleteMany({
        where: { fulfillmentOrder: { orderId: { in: createdTestOrderIds } } },
      });
      await prisma.fulfillmentOrder.deleteMany({
        where: { orderId: { in: createdTestOrderIds } },
      });
      await prisma.deliveryJob.deleteMany({
        where: { orderId: { in: createdTestOrderIds } },
      });
      await prisma.fulfillmentOutbox.deleteMany({
        where: { orderId: { in: createdTestOrderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdTestOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdTestOrderIds } },
      });
    }

    if (createdTestSupplierIds.length > 0) {
      await prisma.supplierAccessSession.deleteMany({
        where: { supplierId: { in: createdTestSupplierIds } },
      });
      await prisma.supplierLocation.deleteMany({
        where: { supplierId: { in: createdTestSupplierIds } },
      });
      await prisma.supplier.deleteMany({
        where: { id: { in: createdTestSupplierIds } },
      });
    }
    console.log('✨ تم تنظيف قاعدة البيانات بالكامل وعودتها للحالة النقية 100%.\n');
  }

  // طباعة جدول النتائج النهائي
  console.log('======================================================');
  console.log('📊 التقرير النهائي لقائمة قبول رَواق التشغيلية:');
  console.log('======================================================');
  let passCount = 0;
  results.forEach((r, idx) => {
    if (r.passed) passCount++;
    console.log(`${r.passed ? '✅' : '❌'} [${idx + 1}/10] ${r.title} -> ${r.notes}`);
  });
  console.log('======================================================');
  console.log(`الاختبارات المؤكد اكتمالها بنجاح: ${passCount} / 10`);
  console.log('======================================================\n');
}

runAcceptanceSuite()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
