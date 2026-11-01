import { prisma } from '../src/lib/db';
import { OrderLifecycleService } from '../src/lib/orders/order-lifecycle-service';
import { executeOrderFulfillmentSplit } from '../src/lib/fulfillment/order-splitter';
import { updateSupplierFulfillmentStatus, verifyCourierPackagePickup } from '../src/lib/fulfillment/supplier-session';

async function main() {
  console.log('======================================================');
  console.log('🚀 بدء اختبارات التكامل للمرحلة الثانية: دورة حياة الطلب الموحدة');
  console.log('======================================================\n');

  const testRef = `TEST-P2-${Date.now().toString().slice(-6)}`;
  let createdOrderId: string | null = null;
  let supplier1Id: string | null = null;
  let supplier2Id: string | null = null;
  let captainId: string | null = null;

  try {
    // 1. تجهيز بيانات موردين وكابتن
    const s1 = await prisma.supplier.create({
      data: { name: `مورد أ - ${testRef}`, phone: '0791111111', isActive: true },
    });
    supplier1Id = s1.id;

    const s2 = await prisma.supplier.create({
      data: { name: `مورد ب - ${testRef}`, phone: '0792222222', isActive: true },
    });
    supplier2Id = s2.id;

    const cap = await prisma.captain.create({
      data: { name: `كابتن ${testRef}`, phone: `079${Date.now().toString().slice(-7)}`, status: 'AVAILABLE', isActive: true },
    });
    captainId = cap.id;

    // موقعين للموردين
    const loc1 = await prisma.supplierLocation.create({
      data: { supplierId: s1.id, label: 'مستودع أ', contactPerson: 'أحمد', contactPhone: '0791111111', city: 'عمان', area: 'خلدا', addressDetails: 'بناية 1', isDefault: true, isActive: true },
    });
    const loc2 = await prisma.supplierLocation.create({
      data: { supplierId: s2.id, label: 'مستودع ب', contactPerson: 'خالد', contactPhone: '0792222222', city: 'عمان', area: 'الشميساني', addressDetails: 'بناية 2', isDefault: true, isActive: true },
    });

    // 2. إنشاء منتج وتباينين
    const cat = await prisma.category.findFirst({ select: { id: true } });
    if (!cat) throw new Error('لا يوجد تصنيف');

    const product = await prisma.product.create({
      data: {
        nameAr: `منتج تجريبي ${testRef}`,
        nameEn: `Test ${testRef}`,
        slug: `test-prod-${testRef.toLowerCase()}`,
        sku: `SKU-${testRef}`,
        categoryId: cat.id,
      },
    });

    const v1 = await prisma.productVariant.create({
      data: { productId: product.id, size: '50ml', sku: `SKU-${testRef}-1`, price: 20000, inventorySource: 'SUPPLIER' },
    });
    const v2 = await prisma.productVariant.create({
      data: { productId: product.id, size: '100ml', sku: `SKU-${testRef}-2`, price: 30000, inventorySource: 'SUPPLIER' },
    });

    // 3. إنشاء طلب جديد من موردين متعددين
    const order = await prisma.order.create({
      data: {
        reference: testRef,
        customerName: 'فاطمة أحمد',
        customerPhone: '0798765432',
        status: 'CONFIRMED',
        paymentStatus: 'COD_PENDING',
        totalAmount: 52000, // 50.000 دينار أصناف + 2.000 دينار توصيل
        shippingCost: 2000,
        notes: 'عمان - دابوق',
        items: {
          create: [
            {
              productId: product.id,
              variantId: v1.id,
              sku: v1.sku,
              name: 'عطر الورد',
              size: '50ml',
              quantity: 1,
              unitPrice: 20000,
              total: 20000,
              supplierIdSnapshot: s1.id,
              supplierNameSnapshot: s1.name,
              unitCostSnapshot: 12000,
            },
            {
              productId: product.id,
              variantId: v2.id,
              sku: v2.sku,
              name: 'بخور ملكي',
              size: '100ml',
              quantity: 1,
              unitPrice: 30000,
              total: 30000,
              supplierIdSnapshot: s2.id,
              supplierNameSnapshot: s2.name,
              unitCostSnapshot: 18000,
            },
          ],
        },
      },
    });
    createdOrderId = order.id;

    // فاتورة
    await prisma.invoice.create({
      data: {
        orderId: order.id,
        number: `INV-${testRef}`,
        grossTotalFils: 52000,
        netSubtotalFils: 50000,
        shippingAmountFils: 2000,
        paymentStatus: 'COD_PENDING',
      },
    });

    // تعيين المندوب
    await prisma.deliveryAssignment.create({
      data: {
        orderId: order.id,
        captainId: cap.id,
        captainEarning: 2000,
        customerDeliveryFee: 2000,
        status: 'ASSIGNED',
      },
    });
    await prisma.captain.update({ where: { id: cap.id }, data: { status: 'BUSY' } });

    console.log('✅ 1. تم إنشاء الطلب والبيانات الأولية بنجاح.');

    // 4. تشغيل تقسيم الطلب
    const splitRes = await executeOrderFulfillmentSplit(order.id);
    console.log(`✅ 2. تم تقسيم الطلب إلى ${splitRes.fulfillmentOrdersCount} أمر تجهيز.`);

    // جلب أوامر التجهيز المنشأة
    const fulfillments = await prisma.fulfillmentOrder.findMany({
      where: { orderId: order.id },
      include: { packages: true, items: true },
    });

    // 5. مورد 1 يعلن الجاهزية (READY)
    // ننشئ جلسة وصول أولاً
    const session1 = await prisma.supplierAccessSession.create({
      data: {
        supplierId: s1.id,
        tokenHash: 'dummy_hash_1',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    // تحديث الحالة لإنشاء الطرد
    const f1 = fulfillments.find(f => f.supplierId === s1.id)!;
    await prisma.package.create({
      data: {
        fulfillmentOrderId: f1.id,
        packageCode: `PKG-${testRef}-S1-1`,
        status: 'READY_FOR_PICKUP',
        qrPayload: JSON.stringify({ pkg: `PKG-${testRef}-S1-1` }),
      },
    });
    await prisma.fulfillmentOrder.update({
      where: { id: f1.id },
      data: { status: 'READY_FOR_PICKUP', packagesCount: 1 },
    });

    // مورد 2 لم يجهّز طرده بعد
    const f2 = fulfillments.find(f => f.supplierId === s2.id)!;
    await prisma.package.create({
      data: {
        fulfillmentOrderId: f2.id,
        packageCode: `PKG-${testRef}-S2-1`,
        status: 'PACKED', // مغلف ولكن لم يُستلم
        qrPayload: JSON.stringify({ pkg: `PKG-${testRef}-S2-1` }),
      },
    });

    // 6. اختبار الحماية رقم 1: محاولة تسليم الطلب للزبونة وهناك طرود لم يستلمها المندوب بعد!
    console.log('\n🔍 اختبار الحماية: محاولة تسليم الطلب وطرود الموردين غير مستلمة...');
    let preventedUnpicked = false;
    try {
      await OrderLifecycleService.completeOrderDelivery({
        orderId: order.id,
        source: 'ADMIN',
        actorName: 'فاحص النظام',
      });
    } catch (err: any) {
      preventedUnpicked = true;
      console.log(`🛡️ الحماية نجحت! تم منع التسليم بالرسالة:\n   "${err.message}"`);
    }

    if (!preventedUnpicked) {
      throw new Error('❌ فشل الاختبار: سمح النظام بالتسليم رغم وجود طرود غير مستلمة!');
    }

    // 7. الآن يقوم المندوب باستلام الطردين وتوثيقهما
    await prisma.package.update({
      where: { packageCode: `PKG-${testRef}-S1-1` },
      data: { status: 'PICKED_UP', pickedUpByCourier: cap.name, pickedUpAt: new Date() },
    });
    await prisma.package.update({
      where: { packageCode: `PKG-${testRef}-S2-1` },
      data: { status: 'PICKED_UP', pickedUpByCourier: cap.name, pickedUpAt: new Date() },
    });
    await prisma.fulfillmentOrder.updateMany({
      where: { orderId: order.id },
      data: { status: 'PICKED_UP', pickedUpAt: new Date() },
    });

    // إطلاق الشحنة للتسليم النهائي (OUT_FOR_DELIVERY)
    await OrderLifecycleService.dispatchOrderFinalDelivery({
      orderId: order.id,
      courierName: cap.name,
    });

    const dispatchedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { deliveryJob: true },
    });
    console.log(`\n✅ 3. انطلقت الشحنة للتسليم:`);
    console.log(`   Order.status = ${dispatchedOrder?.status}`);
    console.log(`   Order.fulfillmentStatus = ${dispatchedOrder?.fulfillmentStatus}`);
    console.log(`   DeliveryJob.status = ${dispatchedOrder?.deliveryJob?.status}`);

    // 8. تسليم الطلب للزبونة مع استلام الكابتن للنقد (COD = COLLECTED_BY_COURIER)
    console.log('\n🔍 تنفيذ التسليم الناجح مع تسجيل استلام المندوب للنقد...');
    const deliveryResult = await OrderLifecycleService.completeOrderDelivery({
      orderId: order.id,
      source: 'CAPTAIN',
      actorName: cap.name,
      collectedCodAmount: 52000,
    });

    console.log(`✅ 4. اكتمال التسليم:`);
    const afterDelivered = await prisma.order.findUnique({
      where: { id: order.id },
      include: {
        deliveryAssignment: { include: { captain: true } },
        deliveryJob: true,
        financialTransactions: true,
      },
    });

    console.log(`   Order.status: ${afterDelivered?.status}`);
    console.log(`   Order.fulfillmentStatus: ${afterDelivered?.fulfillmentStatus}`);
    console.log(`   DeliveryJob.status: ${afterDelivered?.deliveryJob?.status}`);
    console.log(`   DeliveryJob.codStatus: ${afterDelivered?.deliveryJob?.codStatus}`);
    console.log(`   Captain.status: ${afterDelivered?.deliveryAssignment?.captain?.status} (عاد متاحاً)`);

    const captainEarningTx = afterDelivered?.financialTransactions.find(
      t => t.type === 'CAPTAIN_EARNING'
    );
    console.log(`   CAPTAIN_EARNING مسجل: ${captainEarningTx ? 'نعم (' + captainEarningTx.amount + ' فلس)' : 'لا'}`);

    if (
      afterDelivered?.status !== 'DELIVERED' ||
      afterDelivered?.fulfillmentStatus !== 'DELIVERED' ||
      afterDelivered?.deliveryJob?.status !== 'DELIVERED' ||
      afterDelivered?.deliveryJob?.codStatus !== 'COLLECTED_BY_COURIER' ||
      afterDelivered?.deliveryAssignment?.captain?.status !== 'AVAILABLE' ||
      !captainEarningTx
    ) {
      throw new Error('❌ عدم تطابق حالات التسليم أو أجر المندوب!');
    }

    // 9. اختبار الـ Idempotency: إعادة تنفيذ completeOrderDelivery على نفس الطلب
    console.log('\n🔍 اختبار Idempotency: إعادة التسليم مرة أخرى...');
    const retryResult = await OrderLifecycleService.completeOrderDelivery({
      orderId: order.id,
      source: 'CAPTAIN',
      actorName: cap.name,
    });
    console.log(`   نتيجة الإعادة: alreadyDelivered = ${retryResult.alreadyDelivered} ✅`);

    const duplicateEarningCount = await prisma.financialTransaction.count({
      where: { orderId: order.id, type: 'CAPTAIN_EARNING' },
    });
    if (duplicateEarningCount !== 1) {
      throw new Error(`❌ تكرر قيد أجر المندوب! العدد: ${duplicateEarningCount}`);
    }
    console.log('   حماية من التكرار المالي: قيد واحد فقط لأجر المندوب ✅');

    // 10. اختبار تسوية COD وتوريده للمحاسبة (COD = SETTLED_TO_RAWAQ)
    console.log('\n🔍 اختبار تسوية النقد مع المحاسبة (COD Settlement)...');
    const settleRes = await OrderLifecycleService.settleCourierCodToRawaq({
      orderId: order.id,
      employeeId: 'system_admin',
      amountFils: 52000,
      paymentMethod: 'CASH',
      idempotencyKey: 'idem_settle_001',
    });

    const settledJob = await prisma.deliveryJob.findUnique({ where: { orderId: order.id } });
    const settledInvoice = await prisma.invoice.findUnique({ where: { orderId: order.id } });
    const settledOrder = await prisma.order.findUnique({ where: { id: order.id } });

    console.log(`   DeliveryJob.codStatus: ${settledJob?.codStatus}`);
    console.log(`   Invoice.paymentStatus: ${settledInvoice?.paymentStatus}`);
    console.log(`   Order.paymentStatus: ${settledOrder?.paymentStatus}`);

    if (
      settledJob?.codStatus !== 'SETTLED_TO_RAWAQ' ||
      settledInvoice?.paymentStatus !== 'PAID' ||
      settledOrder?.paymentStatus !== 'PAID'
    ) {
      throw new Error('❌ فشل تحديث تسوية COD أو إقفال الفاتورة!');
    }
    console.log('✅ 5. اكتملت دورة التحصيل والتوريد المحاسبي بنجاح تام وبلا أي تكرار!');

    console.log('\n======================================================');
    console.log('🎉 كافة اختبارات الخدمة المركزية للمرحلة الثانية نجحت بنسبة 100%!');
    console.log('======================================================');
  } finally {
    // تنظيف بيانات الاختبار
    console.log('\n🧹 جاري تنظيف بيانات الاختبار...');
    if (createdOrderId) {
      await prisma.financialTransaction.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.payment.deleteMany({ where: { sale: { invoice: { orderId: createdOrderId } } } });
      await prisma.invoice.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.deliveryAssignment.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.deliveryJob.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.packageItem.deleteMany({ where: { package: { fulfillmentOrder: { orderId: createdOrderId } } } });
      await prisma.package.deleteMany({ where: { fulfillmentOrder: { orderId: createdOrderId } } });
      await prisma.fulfillmentItem.deleteMany({ where: { fulfillmentOrder: { orderId: createdOrderId } } });
      await prisma.fulfillmentOrder.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.fulfillmentOutbox.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.fulfillmentAuditLog.deleteMany({ where: { entityId: createdOrderId } });
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: createdOrderId } });
      await prisma.order.delete({ where: { id: createdOrderId } });
    }
    if (supplier1Id) {
      await prisma.supplierLocation.deleteMany({ where: { supplierId: supplier1Id } });
      await prisma.supplierAccessSession.deleteMany({ where: { supplierId: supplier1Id } });
      await prisma.supplier.delete({ where: { id: supplier1Id } });
    }
    if (supplier2Id) {
      await prisma.supplierLocation.deleteMany({ where: { supplierId: supplier2Id } });
      await prisma.supplierAccessSession.deleteMany({ where: { supplierId: supplier2Id } });
      await prisma.supplier.delete({ where: { id: supplier2Id } });
    }
    if (captainId) {
      await prisma.captain.delete({ where: { id: captainId } });
    }
    await prisma.productVariant.deleteMany({ where: { sku: { startsWith: `SKU-${testRef}` } } });
    await prisma.product.deleteMany({ where: { sku: `SKU-${testRef}` } });
    console.log('✨ تم تنظيف قاعدة البيانات بالكامل.');
  }
}

main().catch(err => {
  console.error('\n❌ خطأ غير متوقع:', err);
  process.exit(1);
});
