// Mock server-only for standalone script runner
try {
  const serverOnlyPath = require.resolve('server-only');
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { prisma } from '../src/lib/db';
import {
  getOrCreateOrderInvoice,
  getPublicInvoiceDataByToken,
  buildCustomerConfirmationWhatsAppMessage,
} from '../src/lib/invoices/invoice-service';
import { executeOrderFulfillmentSplit } from '../src/lib/fulfillment/order-splitter';

async function main() {
  console.log('======================================================');
  console.log('🚀 اختبار مركز إدارة الطلبات الموحد والفاتورة الإلكترونية');
  console.log('======================================================\n');

  const testSuffix = Date.now().toString().slice(-6);

  // 1. Get or create test employee and role
  const employee = await prisma.employee.findFirst({
    include: { role: true },
  });
  if (!employee) {
    throw new Error('No employee found in database');
  }

  // 2. Create 2 test suppliers with locations
  const supplierA = await prisma.supplier.create({
    data: {
      name: `مورد العبايات A-${testSuffix}`,
      phone: '0791111111',
      isActive: true,
      locations: {
        create: {
          label: 'المستودع الرئيسي - الصويفية',
          city: 'عمان',
          area: 'الصويفية',
          addressDetails: 'مجمع رَواق التجاري',
          contactPerson: 'مندوب المورد A',
          contactPhone: '0791111111',
          isDefault: true,
        },
      },
    },
  });

  const supplierB = await prisma.supplier.create({
    data: {
      name: `مورد العطور B-${testSuffix}`,
      phone: '0792222222',
      isActive: true,
      locations: {
        create: {
          label: 'فرع الشمال - إربد',
          city: 'إربد',
          area: 'الجامعة',
          addressDetails: 'بناية الزهور',
          contactPerson: 'مندوب المورد B',
          contactPhone: '0792222222',
          isDefault: true,
        },
      },
    },
  });

  const cat = await prisma.category.findFirst({ select: { id: true } });
  if (!cat) throw new Error('لا يوجد تصنيف');

  // 3. Create test products
  const productA = await prisma.product.create({
    data: {
      nameAr: `عباية سوداء فاخرة ${testSuffix}`,
      nameEn: `Abaya ${testSuffix}`,
      slug: `abaya-${testSuffix}`,
      sku: `PROD-A-${testSuffix}`,
      categoryId: cat.id,
      variants: {
        create: {
          sku: `SKU-A-${testSuffix}`,
          size: 'M',
          price: 35000, // 35 JOD
          inventorySource: 'SUPPLIER',
          supplierOffers: {
            create: {
              supplierId: supplierA.id,
              unitCost: 20000,
              isActive: true,
            },
          },
        },
      },
    },
    include: { variants: true },
  });

  const productB = await prisma.product.create({
    data: {
      nameAr: `عطر أصيل ${testSuffix}`,
      nameEn: `Perfume ${testSuffix}`,
      slug: `perfume-${testSuffix}`,
      sku: `PROD-B-${testSuffix}`,
      categoryId: cat.id,
      variants: {
        create: {
          sku: `SKU-B-${testSuffix}`,
          size: '100ml',
          price: 40000, // 40 JOD
          inventorySource: 'SUPPLIER',
          supplierOffers: {
            create: {
              supplierId: supplierB.id,
              unitCost: 25000,
              isActive: true,
            },
          },
        },
      },
    },
    include: { variants: true },
  });

  // 4. Create new Order in PENDING status
  const orderRef = `ORD-UCC-${testSuffix}`;
  const order = await prisma.order.create({
    data: {
      reference: orderRef,
      customerName: 'سارة عبد الله',
      customerPhone: '0795554433',
      status: 'PENDING',
      paymentStatus: 'UNPAID',
      fulfillmentStatus: 'UNFULFILLED',
      fulfillmentStrategy: 'DIRECT_PICKUP',
      shippingCost: 3000, // 3 JOD
      totalAmount: 78000, // 35 + 40 + 3 = 78 JOD
      items: {
        create: [
          {
            productId: productA.id,
            variantId: productA.variants[0].id,
            sku: productA.variants[0].sku,
            name: productA.nameAr,
            size: 'M',
            quantity: 1,
            unitPrice: 35000,
            total: 35000,
            supplierIdSnapshot: supplierA.id,
            supplierNameSnapshot: supplierA.name,
            unitCostSnapshot: 20000,
          },
          {
            productId: productB.id,
            variantId: productB.variants[0].id,
            sku: productB.variants[0].sku,
            name: productB.nameAr,
            size: '100ml',
            quantity: 1,
            unitPrice: 40000,
            total: 40000,
            supplierIdSnapshot: supplierB.id,
            supplierNameSnapshot: supplierB.name,
            unitCostSnapshot: 25000,
          },
        ],
      },
      deliveryJob: {
        create: {
          recipientName: 'سارة عبد الله',
          recipientPhone: '0795554433',
          city: 'عمان',
          area: 'دير غبار',
          addressDetails: 'عمارة 15 - الطابق 2',
          codAmountToCollect: 78000,
          status: 'PENDING',
          codStatus: 'PENDING',
        },
      },
    },
    include: { items: true, deliveryJob: true },
  });

  console.log(`✅ 1. تم إنشاء الطلب الجديد #${order.reference} بقيمة ${(order.totalAmount / 1000).toFixed(3)} د.أ بنجاح.`);

  // 5. Test Invoice & Secure Token generation
  console.log('\n🔍 إنشاء الفاتورة الثابتة ورمز الأمان المشفر...');
  const invoice = await getOrCreateOrderInvoice(order.id, employee.id);
  console.log(`✅ 2. تم إنشاء الفاتورة الثابتة بنجاح:`);
  console.log(`   - رقم الفاتورة: ${invoice.number}`);
  console.log(`   - رمز الأمان (Secure Token): ${invoice.secureToken}`);
  console.log(`   - الصافي: ${(invoice.netSubtotalFils / 1000).toFixed(3)} د.أ`);
  console.log(`   - التوصيل: ${(invoice.shippingAmountFils / 1000).toFixed(3)} د.أ`);
  console.log(`   - الإجمالي النهائي: ${(invoice.grossTotalFils / 1000).toFixed(3)} د.أ`);

  // 6. Test Customer WhatsApp message generation
  console.log('\n🔍 صياغة رسالة واتساب المعتمدة للعميلة مع رابط الفاتورة الإلكترونية...');
  const customerWhatsApp = buildCustomerConfirmationWhatsAppMessage({
    customerName: order.customerName,
    orderReference: order.reference,
    totalAmountFils: order.totalAmount,
    secureToken: invoice.secureToken!,
    customerPhone: order.customerPhone,
    origin: 'https://rawaq.jo',
  });

  console.log('✅ 3. تم تجهيز رسالة واتساب للعميلة بنجاح:');
  console.log('--------------------------------------------------');
  console.log(customerWhatsApp.text);
  console.log('--------------------------------------------------');
  console.log(`رابط الفاتورة المباشر: ${customerWhatsApp.invoiceUrl}`);

  if (customerWhatsApp.invoiceUrl.includes('localhost')) {
    throw new Error('رابط الفاتورة يحتوي على localhost!');
  }

  // 7. Test Public Invoice View Page Data
  console.log('\n🔍 فحص صفحة الفاتورة الإلكترونية الموثقة للعرض العام (Read-Only)...');
  const publicInvoice = await getPublicInvoiceDataByToken(invoice.secureToken!);
  if (!publicInvoice) {
    throw new Error('تعذر العثور على الفاتورة عبر رمز الأمان');
  }
  console.log(`✅ 4. تم التحقق من صفحة العرض الموثقة:`);
  console.log(`   - اسم العميلة: ${publicInvoice.customerName}`);
  console.log(`   - رقم الهاتف: ${publicInvoice.customerPhone}`);
  console.log(`   - المدينة: ${publicInvoice.city}`);
  console.log(`   - عدد الأصناف المحفوظة: ${publicInvoice.items.length}`);
  console.log(`   - الإجمالي النهائي: ${(publicInvoice.grossTotalFils / 1000).toFixed(3)} د.أ`);

  // 8. Test Multi-Vendor Fulfillment Split
  console.log('\n🔍 تقسيم الطلب إلى أوامر تجهيز الموردين...');
  const splitResult = await executeOrderFulfillmentSplit(order.id);
  console.log(`✅ 5. اكتمل التقسيم بنجاح: تم إنشاء (${splitResult.createdOrdersCount}) أمر تجهيز لموردي العبايات والعطور.`);

  // 9. Update status to CONFIRMED
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'CONFIRMED',
      customerWhatsAppSentAt: new Date(),
    },
  });
  console.log('✅ 6. تم تحديث حالة الطلب إلى CONFIRMED وتوثيق إرسال واتساب للعميلة.');

  // Cleanup
  console.log('\n🧹 جاري تنظيف بيانات الاختبار...');
  await prisma.package.deleteMany({
    where: { fulfillmentOrder: { orderId: order.id } },
  });
  await prisma.fulfillmentItem.deleteMany({
    where: { fulfillmentOrder: { orderId: order.id } },
  });
  await prisma.fulfillmentOrder.deleteMany({
    where: { orderId: order.id },
  });
  await prisma.invoice.deleteMany({ where: { orderId: order.id } });
  await prisma.deliveryJob.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.supplierOffer.deleteMany({
    where: { supplierId: { in: [supplierA.id, supplierB.id] } },
  });
  await prisma.productVariant.deleteMany({
    where: { productId: { in: [productA.id, productB.id] } },
  });
  await prisma.product.deleteMany({
    where: { id: { in: [productA.id, productB.id] } },
  });
  await prisma.supplierLocation.deleteMany({
    where: { supplierId: { in: [supplierA.id, supplierB.id] } },
  });
  await prisma.supplier.deleteMany({
    where: { id: { in: [supplierA.id, supplierB.id] } },
  });

  console.log('✨ تم تنظيف قاعدة البيانات بنجاح 100%.');
  console.log('\n======================================================');
  console.log('🎉 مركز إدارة الطلبات والفاتورة الإلكترونية الموحدة يعمل بنجاح 100%!');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('❌ خطأ في الاختبار:', err);
  process.exit(1);
});
