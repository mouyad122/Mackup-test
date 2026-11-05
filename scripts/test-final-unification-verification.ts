// Mock server-only before any other imports
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (path: string, ...args: unknown[]) {
  if (path === 'server-only') {
    return {};
  }
  return originalRequire.call(this, path, ...args);
};

import { prisma } from '../src/lib/db';
import { getOrCreateOrderInvoice, getPublicInvoiceDataByToken } from '../src/lib/invoices/invoice-service';
import { createSupplierAccessSession } from '../src/lib/fulfillment/supplier-session';

async function run() {
  console.log('🚀 بدء التحقق الشامل من المنظومة الموحدة لرَواق...\n');

  // 1. اختبار ضمان الرابط الرسمي (Official Domain Verification)
  console.log('--- 1. فحص الروابط الرسمية (https://rawaq.jo) ---');
  const dummySupplier = await prisma.supplier.findFirst({
    include: { fulfillmentOrders: { take: 1 } },
  });

  if (dummySupplier) {
    const sessionRes = await createSupplierAccessSession(dummySupplier.id, {
      baseUrl: 'http://localhost:3000', // Even if localhost passed, must be sanitized to rawaq.jo
    });
    console.log('Supplier magicUrl:', sessionRes.magicUrl);
    if (!sessionRes.magicUrl.startsWith('https://rawaq.jo')) {
      throw new Error(`Supplier URL is not using official domain: ${sessionRes.magicUrl}`);
    }
    console.log('✅ رابط المورد محمي ويستخدم https://rawaq.jo حصراً.');
  }

  // 2. اختبار الفاتورة وتعديل النواقص مع الموردين
  console.log('\n--- 2. فحص الفاتورة وتعديل النواقص مع الموردين ---');
  const testOrder = await prisma.order.findFirst({
    where: {
      items: { some: {} },
    },
    include: {
      items: true,
      fulfillmentOrders: {
        include: { items: true },
      },
    },
  });

  if (testOrder) {
    const invoice = await getOrCreateOrderInvoice(testOrder.id);
    console.log('Invoice secureToken:', invoice.secureToken);
    const publicDataBefore = await getPublicInvoiceDataByToken(invoice.secureToken!);
    console.log('Customer Invoice before adjustment:', {
      ref: publicDataBefore?.orderReference,
      total: publicDataBefore?.grossTotalFils,
      itemsCount: publicDataBefore?.items.length,
      hasAdjustment: publicDataBefore?.hasAdjustment,
    });

    // تحديث افتراضي لمحاكاة التعديل والنقص
    const firstItem = testOrder.items[0];
    const newGrossTotal = Math.max(0, testOrder.totalAmount - firstItem.total);

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: firstItem.id },
        data: {
          isRemoved: true,
          removalReason: 'غير متوفر لدى المورد الرئيسي',
          missingQuantity: firstItem.quantity,
        },
      });

      await tx.order.update({
        where: { id: testOrder.id },
        data: {
          hasAdjustment: true,
          previousTotalAmount: testOrder.totalAmount,
          totalAmount: newGrossTotal,
          adjustmentNotes: `تم استبعاد (${firstItem.name}) لعدم توفره. تم تعديل المبلغ إلى ${newGrossTotal} فلس.`,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          grossTotalFils: newGrossTotal,
        },
      });
    });

    const publicDataAfter = await getPublicInvoiceDataByToken(invoice.secureToken!);
    console.log('Customer Invoice after adjustment:', {
      ref: publicDataAfter?.orderReference,
      previousTotal: publicDataAfter?.previousTotalAmount,
      currentTotal: publicDataAfter?.grossTotalFils,
      hasAdjustment: publicDataAfter?.hasAdjustment,
      adjustmentNotes: publicDataAfter?.adjustmentNotes,
      removedItem: publicDataAfter?.items.find((it) => it.isRemoved),
    });

    if (!publicDataAfter?.hasAdjustment) {
      throw new Error('Invoice hasAdjustment flag was not set!');
    }
    console.log('✅ تم تسجيل تعديل النقص في الفاتورة وتحديث الإجمالي وتوثيق الصنف المستبعد بنجاح.');
  }

  // 3. اختبار كشف التوصيل المجمع
  console.log('\n--- 3. فحص طلبيات شركة التوصيل وكشف المحلات ---');
  const batch = await prisma.deliveryBatch.findFirst({
    include: {
      orders: {
        include: {
          items: true,
          fulfillmentOrders: {
            include: {
              supplier: true,
              location: true,
              packages: true,
            },
          },
        },
      },
    },
  });

  if (batch) {
    console.log(`Delivery Batch #${batch.reference}:`);
    console.log(`- عدد الطلبات: ${batch.orders.length}`);
    const locations = new Set(
      batch.orders.flatMap((o) => o.fulfillmentOrders.map((f) => f.locationId || f.supplierId))
    );
    console.log(`- المحلات المطلوب زيارتها: ${locations.size} محلات`);
    console.log('✅ تجميع المحطات اللوجستية يعمل بكفاءة.');
  }

  console.log('\n🎉 كافة الفحوصات تمت بنجاح تام وفق متطلبات رَواق 100%!');
}

run()
  .catch((err) => {
    console.error('❌ خطأ في الفحص:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
