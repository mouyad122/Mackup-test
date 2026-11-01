import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { calculateInclusiveTax, calculateExclusiveTax } from '@/lib/money';

/**
 * توليد رمز أمان تشفيري غير قابل للتخمين للفاتورة (Secure 192-bit Token)
 */
export function generateSecureInvoiceToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * تحديد الرابط الأساسي للفاتورة والرسائل المشتركة
 * يستخدم الرابط الممرر من المتصفح أو الخادم مباشرة (مثل http://localhost:3000 أثناء التجربة)، أو الدومين المعتمد في البيئة
 */
export function resolveCustomerFacingBaseUrl(candidateUrl?: string): string {
  if (candidateUrl && (candidateUrl.startsWith('http://') || candidateUrl.startsWith('https://'))) {
    return candidateUrl.replace(/\/+$/, '');
  }

  const envUrl = process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && (envUrl.startsWith('http://') || envUrl.startsWith('https://'))) {
    return envUrl.replace(/\/+$/, '');
  }

  return 'https://rawaq.jo';
}

/**
 * استرجاع أو إنشاء فاتورة مالية ثابتة غير قابلة للتعديل للطلب
 */
export async function getOrCreateOrderInvoice(orderId: string, employeeId?: string) {
  let invoice = await prisma.invoice.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          items: true,
          deliveryJob: true,
        },
      },
    },
  });

  if (invoice && invoice.secureToken) {
    return invoice;
  }

  const order = invoice?.order || await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      deliveryJob: true,
    },
  });

  if (!order) {
    throw new Error('الطلب غير موجود لإصدار الفاتورة.');
  }

  const secureToken = invoice?.secureToken || generateSecureInvoiceToken();

  // حساب الضرائب والمجاميع
  const settings = await prisma.globalPricingSettings.findUnique({ where: { id: '1' } });
  const taxEnabled = settings?.taxEnabled ?? false;
  const taxRate = settings?.taxRate ?? 0.0;
  const pricesIncludeTax = settings?.pricesIncludeTax ?? true;

  const subtotal = order.totalAmount - order.shippingCost;
  let taxAmount = 0;
  let calculatedSubtotal = subtotal;

  if (taxEnabled) {
    if (pricesIncludeTax) {
      taxAmount = calculateInclusiveTax(subtotal, taxRate);
      calculatedSubtotal = subtotal - taxAmount;
    } else {
      taxAmount = calculateExclusiveTax(subtotal, taxRate);
      calculatedSubtotal = subtotal;
    }
  }

  const invoiceNumber = invoice?.number || `INV-${order.reference}-${Date.now().toString().slice(-4)}`;

  const updatedInvoice = await prisma.invoice.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      number: invoiceNumber,
      secureToken,
      netSubtotalFils: calculatedSubtotal,
      discountAmountFils: order.discountAmount,
      shippingAmountFils: order.shippingCost,
      taxAmountFils: taxAmount,
      grossTotalFils: order.totalAmount,
      taxRateSnapshot: taxRate,
      taxModeSnapshot: !taxEnabled ? 'DISABLED' : (pricesIncludeTax ? 'INCLUSIVE' : 'EXCLUSIVE'),
      pricesIncludeTaxSnapshot: pricesIncludeTax,
      paymentStatus: order.paymentStatus || 'COD_PENDING',
      confirmedByEmployeeId: employeeId,
    },
    update: {
      secureToken,
      grossTotalFils: order.totalAmount,
      shippingAmountFils: order.shippingCost,
      discountAmountFils: order.discountAmount,
      paymentStatus: order.paymentStatus || 'COD_PENDING',
    },
    include: {
      order: {
        include: {
          items: true,
          deliveryJob: true,
        },
      },
    },
  });

  return updatedInvoice;
}

/**
 * استرجاع بيانات الفاتورة الآمنة للعرض العام (Read-Only)
 */
export async function getPublicInvoiceDataByToken(token: string) {
  if (!token || token.length < 8) return null;

  // 1. البحث بواسطة secureToken المشفر
  let invoice = await prisma.invoice.findUnique({
    where: { secureToken: token },
    include: {
      order: {
        include: {
          items: true,
          deliveryJob: true,
        },
      },
    },
  });

  // 2. كخيار رجوع آمن للتوافق مع الطلبات القديمة: البحث برقم الطلب أو معرفه
  if (!invoice) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token);
    invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          ...(isUuid ? [{ orderId: token }] : []),
          { number: token },
          { order: { reference: token } },
        ],
      },
      include: {
        order: {
          include: {
            items: true,
            deliveryJob: true,
          },
        },
      },
    });
  }

  if (!invoice || !invoice.order) return null;

  const order = invoice.order;

  return {
    invoiceNumber: invoice.number,
    issueDate: invoice.createdAt,
    secureToken: invoice.secureToken || token,
    paymentStatus: invoice.paymentStatus,
    isPaid: invoice.paymentStatus === 'PAID',
    orderReference: order.reference,
    orderStatus: order.status,
    fulfillmentStatus: order.fulfillmentStatus,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    city: order.deliveryJob?.city || order.shippingZoneNameSnapshot || 'عمان',
    addressDetails: order.deliveryJob?.addressDetails || order.notes || '—',
    paymentMethod: 'الدفع عند الاستلام (COD)',
    grossTotalFils: invoice.grossTotalFils,
    netSubtotalFils: invoice.netSubtotalFils,
    discountAmountFils: invoice.discountAmountFils,
    shippingAmountFils: invoice.shippingAmountFils,
    taxAmountFils: invoice.taxAmountFils,
    hasAdjustment: order.hasAdjustment,
    previousTotalAmount: order.previousTotalAmount,
    adjustmentNotes: order.adjustmentNotes,
    items: order.items.map((it) => ({
      name: it.name,
      size: it.size,
      quantity: it.quantity,
      unitPriceFils: it.unitPrice,
      totalFils: it.total,
      isRemoved: it.isRemoved,
      removalReason: it.removalReason,
      missingQuantity: it.missingQuantity,
    })),
  };
}

/**
 * صياغة رسالة واتساب للزبونة مع رابط الفاتورة غير القابل للتعديل
 */
export function buildCustomerConfirmationWhatsAppMessage(params: {
  customerName: string;
  orderReference: string;
  totalAmountFils: number;
  secureToken: string;
  customerPhone?: string;
  origin?: string;
}) {
  const baseUrl = resolveCustomerFacingBaseUrl(params.origin);
  const invoiceUrl = `${baseUrl}/invoice/view/${params.secureToken}`;
  const totalJod = (params.totalAmountFils / 1000).toFixed(3);

  const text =
    `أهلاً وسهلاً فيكِ 🌿\n` +
    `يسعدنا اختياركِ رَواق، وشكراً لثقتكِ فينا.\n\n` +
    `تم تأكيد طلبكِ بنجاح ✨\n` +
    `رقم الطلب: #${params.orderReference}\n` +
    `قيمة الطلب: ${totalJod} د.أ\n` +
    `طريقة الدفع: عند الاستلام\n\n` +
    `تقدري تطّلعي على تفاصيل طلبكِ والفاتورة من الرابط التالي:\n` +
    `${invoiceUrl}\n\n` +
    `رح نتابع تجهيز طلبكِ بعناية، ونبلغكِ عند خروجه للتوصيل.\n\n` +
    `رَواق | أناقة من روح الأصالة 🌿`;

  // تجهيز رابط wa.me
  let cleanPhone = (params.customerPhone || '').replace(/\D/g, '');
  if (cleanPhone.startsWith('07')) {
    cleanPhone = '962' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('7')) {
    cleanPhone = '962' + cleanPhone;
  }

  const encodedMessage = encodeURIComponent(text);
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  return {
    text,
    invoiceUrl,
    waUrl,
  };
}
