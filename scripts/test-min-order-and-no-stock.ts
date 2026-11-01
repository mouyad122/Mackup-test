import { prisma } from '../src/lib/db';
import { processCheckout } from '../src/actions/checkout';

async function main() {
  console.log('======================================================');
  console.log('🚀 فحص الحد الأدنى للطلب (5 د.أ) وإلغاء فحص المخزون');
  console.log('======================================================\n');

  const testRef = `TEST-MIN-${Date.now().toString().slice(-6)}`;
  let testOrderId: string | null = null;
  let testProductId: string | null = null;
  let testVariantId1: string | null = null;
  let testVariantId2: string | null = null;
  let supplierId: string | null = null;

  try {
    // 1. تجهيز مورد
    const sup = await prisma.supplier.create({
      data: { name: `مورد ${testRef}`, phone: '0799999999', isActive: true },
    });
    supplierId = sup.id;

    const cat = await prisma.category.findFirst({ select: { id: true } });
    if (!cat) throw new Error('لا يوجد تصنيف');

    const zone = await prisma.shippingZone.findFirst({ where: { isEnabled: true } });
    if (!zone) throw new Error('لا توجد منطقة شحن مفعلة');

    // 2. إنشاء منتج مع تباين رخيص (3 د.أ = 3000 فلس) وتباين (6 د.أ = 6000 فلس)
    // لاحظ: المخزون المحلي 0 لنتأكد أنه لا يعيق الشراء!
    const product = await prisma.product.create({
      data: {
        nameAr: `منتج اختبار الحد الأدنى ${testRef}`,
        nameEn: `Min Order Product ${testRef}`,
        slug: `prod-min-${testRef.toLowerCase()}`,
        sku: `SKU-MIN-${testRef}`,
        categoryId: cat.id,
      },
    });
    testProductId = product.id;

    const vLow = await prisma.productVariant.create({
      data: {
        productId: product.id,
        size: 'صغير',
        sku: `SKU-MIN-${testRef}-LOW`,
        price: 3000, // 3 دنانير
        stock: 0, // 0 مخزون محلي!
        inventorySource: 'SUPPLIER',
      },
    });
    testVariantId1 = vLow.id;

    // عرض المورد بمخزون 0 محلي أيضاً
    await prisma.supplierOffer.create({
      data: {
        supplierId: sup.id,
        variantId: vLow.id,
        unitCost: 1500,
        stock: 0,
        isActive: true,
      },
    });

    const vHigh = await prisma.productVariant.create({
      data: {
        productId: product.id,
        size: 'كبير',
        sku: `SKU-MIN-${testRef}-HIGH`,
        price: 6000, // 6 دنانير
        stock: 0, // 0 مخزون محلي!
        inventorySource: 'SUPPLIER',
      },
    });
    testVariantId2 = vHigh.id;

    await prisma.supplierOffer.create({
      data: {
        supplierId: sup.id,
        variantId: vHigh.id,
        unitCost: 3500,
        stock: 0,
        isActive: true,
      },
    });

    console.log('✅ 1. تم إنشاء بيانات المنتجات والمورد بنجاح.');

    // 3. اختبار محاولة شراء منتج بقيمة 3 دنانير (أقل من الحد الأدنى 5 د.أ)
    console.log('\n🔍 اختبار الشراء بأقل من 5 دنانير (3.000 د.أ)...');
    const formDataLow = new FormData();
    formDataLow.append('customerName', 'هدى عمر');
    formDataLow.append('customerPhone', '0791234567');
    formDataLow.append('addressStreet', 'شارع مكة');
    formDataLow.append('addressBuilding', 'عمارة 10');
    formDataLow.append('shippingZoneId', zone.id);
    formDataLow.append('items', JSON.stringify([{ productId: product.id, variantId: vLow.id, quantity: 1 }]));

    const resLow = await processCheckout(null, formDataLow);
    console.log('   استجابة النظام:', resLow);

    if (!resLow.error || !resLow.error.includes('الحد الأدنى للطلب هو 5 د.أ')) {
      throw new Error(`❌ فشل الاختبار: سمح النظام بطلب أقل من 5 دنانير! الاستجابة: ${JSON.stringify(resLow)}`);
    }
    console.log('🛡️ تم رفض الطلب بنجاح للوصول للحد الأدنى (5 د.أ) ✅');

    // 4. اختبار الشراء بمنتج بقيمة 6 دنانير (أكبر من 5 د.أ ومخزونه 0 لأننا نعتمد على الموردين)
    console.log('\n🔍 اختبار الشراء بمنتج بقيمة 6 دنانير ومخزونه 0 محلياً...');
    const formDataHigh = new FormData();
    formDataHigh.append('customerName', 'هدى عمر');
    formDataHigh.append('customerPhone', '0791234567');
    formDataHigh.append('addressStreet', 'شارع مكة');
    formDataHigh.append('addressBuilding', 'عمارة 10');
    formDataHigh.append('shippingZoneId', zone.id);
    formDataHigh.append('items', JSON.stringify([{ productId: product.id, variantId: vHigh.id, quantity: 1 }]));

    const resHigh = await processCheckout(null, formDataHigh);
    console.log('   استجابة النظام:', resHigh);

    if (!resHigh.success || !resHigh.reference) {
      throw new Error(`❌ فشل الطلب الصحيح: ${resHigh.error}`);
    }
    console.log(`✅ تم إنشاء الطلب بنجاح برقم المرجع: ${resHigh.reference}`);

    const createdOrder = await prisma.order.findUnique({
      where: { reference: resHigh.reference },
    });
    testOrderId = createdOrder?.id || null;

    console.log(`   إجمالي الطلب: ${createdOrder?.totalAmount} فلس`);
    console.log('======================================================');
    console.log('🎉 نجح الفحص: الحد الأدنى 5 د.أ مفروض، والمخزون لا يعيق الموردين!');
    console.log('======================================================');
  } finally {
    console.log('\n🧹 جاري تنظيف بيانات الفحص...');
    if (testOrderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: testOrderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } });
      await prisma.order.delete({ where: { id: testOrderId } });
    }
    if (testVariantId1 && testVariantId2) {
      await prisma.supplierOffer.deleteMany({ where: { variantId: { in: [testVariantId1, testVariantId2] } } });
      await prisma.productVariant.deleteMany({ where: { id: { in: [testVariantId1, testVariantId2] } } });
    }
    if (testProductId) {
      await prisma.product.delete({ where: { id: testProductId } });
    }
    if (supplierId) {
      await prisma.supplier.delete({ where: { id: supplierId } });
    }
    console.log('✨ تم تنظيف قاعدة البيانات بالكامل.');
  }
}

main().catch(err => {
  console.error('\n❌ خطأ:', err);
  process.exit(1);
});
