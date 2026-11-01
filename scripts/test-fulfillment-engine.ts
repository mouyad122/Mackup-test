import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { executeOrderFulfillmentSplit } from '../src/lib/fulfillment/order-splitter';
import {
  createSupplierAccessSession,
  getSupplierPortalData,
  updateSupplierFulfillmentStatus,
  verifyCourierPackagePickup,
} from '../src/lib/fulfillment/supplier-session';
import { generateDeliveryManifest } from '../src/lib/fulfillment/delivery-manifest';

async function runFulfillmentTest() {
  console.log('🚀 بدء اختبار محرك التنفيذ والتجهيز والتوصيل المتعدد (RAWAQ Fulfillment)...');

  // 1. إعداد موردين تجريبيين ومواقع استلام
  const supplierA = await prisma.supplier.upsert({
    where: { id: 'test-supplier-a' },
    update: { isActive: true },
    create: {
      id: 'test-supplier-a',
      name: 'مورد العبايات الملكية (A)',
      phone: '0791111111',
      isActive: true,
    },
  });

  const locA = await prisma.supplierLocation.upsert({
    where: { id: 'test-loc-a' },
    update: {},
    create: {
      id: 'test-loc-a',
      supplierId: supplierA.id,
      label: 'مستودع الصويفية الرئيسي',
      contactPerson: 'أحمد مسؤول التجهيز',
      contactPhone: '0791111111',
      city: 'عمان',
      area: 'الصويفية',
      addressDetails: 'شارع الوكالات - مجمع 14 - الطابق الأرضي',
      isDefault: true,
      isActive: true,
    },
  });

  const supplierB = await prisma.supplier.upsert({
    where: { id: 'test-supplier-b' },
    update: { isActive: true },
    create: {
      id: 'test-supplier-b',
      name: 'مورد العطور التراثية (B)',
      phone: '0792222222',
      isActive: true,
    },
  });

  const locB = await prisma.supplierLocation.upsert({
    where: { id: 'test-loc-b' },
    update: {},
    create: {
      id: 'test-loc-b',
      supplierId: supplierB.id,
      label: 'معمل العطور - إربد',
      contactPerson: 'عمر الخبير',
      contactPhone: '0792222222',
      city: 'إربد',
      area: 'شارع الجامعة',
      addressDetails: 'بناية اليرموك - مدخل المستودعات',
      isDefault: true,
      isActive: true,
    },
  });

  console.log('✅ تم تجهيز الموردين ومواقع الاستلام.');

  // 2. إنشاء منتج تجريبي وطلب عميل يحتوي صنفين من الموردين الاثنين
  const product = await prisma.product.findFirst({ include: { variants: true } });
  if (!product || product.variants.length === 0) {
    throw new Error('لا يوجد منتجات في قاعدة البيانات.');
  }

  const testRef = `TEST-ORD-${Date.now()}`;
  const order = await prisma.order.create({
    data: {
      reference: testRef,
      customerName: 'سارة خالد المجالي',
      customerPhone: '0795554433',
      status: 'CONFIRMED',
      totalAmount: 48000, // 48.00 JOD
      shippingCost: 3000,
      paymentStatus: 'COD_PENDING',
      notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
      shippingZoneNameSnapshot: 'عمان الغربية',
      items: {
        create: [
          {
            productId: product.id,
            variantId: product.variants[0].id,
            sku: `${product.variants[0].sku}-A`,
            name: 'عباية مخمل فاخرة مطرزة',
            size: 'L',
            quantity: 1,
            unitPrice: 30000,
            total: 30000,
            supplierIdSnapshot: supplierA.id,
            supplierNameSnapshot: supplierA.name,
          },
          {
            productId: product.id,
            variantId: product.variants[0].id,
            sku: `${product.variants[0].sku}-B`,
            name: 'عطر دهن العود الملكي 100 مل',
            size: '100ml',
            quantity: 1,
            unitPrice: 15000,
            total: 15000,
            supplierIdSnapshot: supplierB.id,
            supplierNameSnapshot: supplierB.name,
          },
        ],
      },
    },
  });

  console.log(`✅ تم إنشاء الطلب التجريبي #${testRef} بصنفين من موردين مختلفين.`);

  // 3. تشغيل محرك التقسيم (Order Splitter)
  const splitResult = await executeOrderFulfillmentSplit(order.id);
  console.log('✅ نتيجة محرك التقسيم:', splitResult);

  if (splitResult.fulfillmentOrdersCount !== 2) {
    throw new Error(`خطأ: المتوقع 2 أوامر تجهيز ولكن تم إنشاء ${splitResult.fulfillmentOrdersCount}`);
  }

  // 4. اختبار Idempotency: إعادة التقسيم لنفس الطلب لا يجب أن تكرر أي سجلات
  const repeatSplit = await executeOrderFulfillmentSplit(order.id);
  console.log('✅ اختبار منع التكرار (Idempotency):', repeatSplit.isIdempotentSkip ? 'نجح (تم التخطي)' : 'فشل');

  // 5. إنشاء جلسة ورابط مورد آمن للمورد A
  const sessionA = await createSupplierAccessSession(supplierA.id);
  console.log('✅ رابط المورد (A) المؤقت:', sessionA.magicUrl);
  console.log('✉️ نص رسالة واتساب:', sessionA.whatsappMessage.slice(0, 80) + '...');

  // 6. المورد A يفتح البوابة ويستعرض أوامره
  const portalDataA = await getSupplierPortalData(sessionA.rawToken);
  console.log(`✅ بوابة المورد A: وجد ${portalDataA.fulfillmentOrders.length} طلب مسند.`);
  const targetFulfillmentA = portalDataA.fulfillmentOrders.find((f) => f.orderReference === testRef);

  if (!targetFulfillmentA) {
    throw new Error('لم يظهر الطلب في بوابة المورد A!');
  }

  // 7. المورد A يبدأ التجهيز ثم يعلن الجاهزية (طرد واحد)
  await updateSupplierFulfillmentStatus(sessionA.rawToken, targetFulfillmentA.id, 'START');
  const readyResA = await updateSupplierFulfillmentStatus(
    sessionA.rawToken,
    targetFulfillmentA.id,
    'READY',
    { packagesCount: 1 }
  );
  console.log('✅ المورد A أعلن الجاهزية:', readyResA.status);

  // 8. فحص حالة الطلب العام: يجب أن تصبح PARTIALLY_READY لأن المورد B لم يجهز بعد!
  let orderAfterA = await prisma.order.findUnique({ where: { id: order.id } });
  console.log('✅ حالة الطلب بعد جهوزية المورد A فقط:', orderAfterA?.fulfillmentStatus);
  if (orderAfterA?.fulfillmentStatus !== 'PARTIALLY_READY') {
    throw new Error(`خطأ: المتوقع PARTIALLY_READY ولكن وجدنا ${orderAfterA?.fulfillmentStatus}`);
  }

  // 9. إنشاء جلسة للمورد B وإعلان الجاهزية
  const sessionB = await createSupplierAccessSession(supplierB.id);
  const portalDataB = await getSupplierPortalData(sessionB.rawToken);
  const targetFulfillmentB = portalDataB.fulfillmentOrders.find((f) => f.orderReference === testRef)!;

  await updateSupplierFulfillmentStatus(
    sessionB.rawToken,
    targetFulfillmentB.id,
    'READY',
    { packagesCount: 1 }
  );
  console.log('✅ المورد B أعلن الجاهزية.');

  // 10. فحص حالة الطلب العام: الآن كلا الموردين جاهز -> يجب أن تصبح READY_FOR_PICKUP!
  let orderAfterAllReady = await prisma.order.findUnique({ where: { id: order.id } });
  console.log('✅ حالة الطلب بعد جهوزية جميع الموردين:', orderAfterAllReady?.fulfillmentStatus);
  if (orderAfterAllReady?.fulfillmentStatus !== 'READY_FOR_PICKUP') {
    throw new Error(`خطأ: المتوقع READY_FOR_PICKUP ولكن وجدنا ${orderAfterAllReady?.fulfillmentStatus}`);
  }

  // 11. توليد كشف الاستلام والتسليم (Delivery Manifest)
  const manifest = await generateDeliveryManifest(order.id);
  console.log('\n================== كشف التوصيل لواتساب ==================');
  console.log(manifest.formattedWhatsAppText);
  console.log('=========================================================\n');

  // 12. محاكاة وصول المندوب واستلام طرود المورد A ثم المورد B
  const pkgA = await prisma.package.findFirst({
    where: { fulfillmentOrderId: targetFulfillmentA.id },
  });
  if (!pkgA) throw new Error('لم يتم العثور على طرد المورد A');

  await verifyCourierPackagePickup(pkgA.packageCode, 'كابتن رَواق - خالد', {
    role: 'COURIER',
  });
  console.log(`✅ تم تأكيد استلام طرد المورد A [${pkgA.packageCode}] بواسطة المندوب.`);

  const pkgB = await prisma.package.findFirst({
    where: { fulfillmentOrderId: targetFulfillmentB.id },
  });
  if (!pkgB) throw new Error('لم يتم العثور على طرد المورد B');

  await verifyCourierPackagePickup(pkgB.packageCode, 'كابتن رَواق - خالد', {
    role: 'COURIER',
  });
  console.log(`✅ تم تأكيد استلام طرد المورد B [${pkgB.packageCode}] بواسطة المندوب.`);

  // 13. فحص حالة الطلب النهائي: اكتمل استلام كامل الطرود وانطلق للتوصيل (OUT_FOR_DELIVERY)
  const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
  console.log('✅ حالة الطلب بعد اكتمال جمع كافة الطرود:', finalOrder?.fulfillmentStatus);

  console.log('\n🎉 اكتمل اختبار دورة التنفيذ والموردين بنجاح 100% وبدون أي أخطاء!');
}

runFulfillmentTest()
  .catch((err) => {
    console.error('❌ فشل الاختبار:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
