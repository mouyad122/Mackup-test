import React from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { filsToDisplay } from '@/lib/money';
import { CheckCircle2, Clock, Truck, Package, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const resolvedParams = await params;
  const { locale, reference } = resolvedParams;
  const isAr = locale === 'ar';

  const order = await prisma.order.findUnique({
    where: { reference },
    include: {
      items: true,
      deliveryJob: true,
    },
  });

  if (!order) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mx-auto mb-4">
          🔍
        </div>
        <h1 className="text-2xl font-bold text-stone-900 font-heading mb-2">
          {isAr ? 'لم يتم العثور على الطلب' : 'Order Not Found'}
        </h1>
        <p className="text-sm text-stone-600 max-w-md mb-6">
          {isAr
            ? `تعذر العثور على طلب بالرقم (${reference}). يرجى التأكد من صحة رقم الطلب.`
            : `Could not find an order with reference (${reference}). Please verify the number.`}
        </p>
        <Link
          href={`/${locale}/shop`}
          className="btn-rawaq-primary px-6 py-3 rounded-full text-sm font-bold shadow-md"
        >
          {isAr ? 'العودة إلى المتجر' : 'Back to Store'}
        </Link>
      </div>
    );
  }

  // Determine Order Stage for Timeline
  const isPendingReview = ['PENDING', 'AWAITING_WHATSAPP'].includes(order.status);
  const isConfirmed = order.status === 'CONFIRMED' || order.status === 'PREPARING';
  const isOutForDelivery = ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(order.status) || order.fulfillmentStatus === 'OUT_FOR_DELIVERY';
  const isDelivered = order.status === 'DELIVERED';
  const isCancelled = order.status === 'CANCELLED';

  const getStatusBadge = () => {
    if (isCancelled) {
      return {
        label: isAr ? 'ملغي' : 'Cancelled',
        color: 'bg-rose-50 text-rose-800 border-rose-200',
        desc: isAr ? 'تم إلغاء هذا الطلب من قبل الإدارة.' : 'This order has been cancelled.',
      };
    }
    if (isDelivered) {
      return {
        label: isAr ? 'تم التسليم بنجاح' : 'Delivered',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        desc: isAr ? 'تم تسليم الطلب واستلامه بنجاح.' : 'Your order has been delivered successfully.',
      };
    }
    if (isOutForDelivery) {
      return {
        label: isAr ? 'جاري التوصيل مع المندوب' : 'Out for Delivery',
        color: 'bg-blue-50 text-blue-800 border-blue-200',
        desc: isAr ? 'طلبكِ حالياً في طريق التوصيل مع مندوب الشحن.' : 'Your order is currently out for delivery.',
      };
    }
    if (isConfirmed) {
      return {
        label: isAr ? 'معتمد وقيد التجهيز' : 'Confirmed & Preparing',
        color: 'bg-purple-50 text-purple-800 border-purple-200',
        desc: isAr ? 'تم اعتماد الطلب ويجري تجهيز الطرود وتغليفها.' : 'Order confirmed and currently being prepared.',
      };
    }
    return {
      label: isAr ? 'بانتظار مراجعة الإدارة' : 'Pending Admin Review',
      color: 'bg-amber-50 text-amber-900 border-amber-300',
      desc: isAr
        ? 'طلبكِ مسجل بأمان في النظام، وبانتظار المراجعة والتأكيد النهائي. لا تحتاجين لإعادة إرسال الطلب.'
        : 'Your order is safely recorded and awaiting review. No need to resend.',
    };
  };

  const statusInfo = getStatusBadge();

  return (
    <div className="min-h-screen bg-[#FBF8F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs text-stone-500">
          <Link href={`/${locale}/shop`} className="hover:text-stone-900 flex items-center gap-1 font-bold">
            <ArrowRight className={`w-3.5 h-3.5 ${isAr ? '' : 'rotate-180'}`} />
            <span>{isAr ? 'متابعة التسوق في رَواق' : 'Continue Shopping'}</span>
          </Link>
          <span className="font-mono">{new Date(order.createdAt).toLocaleDateString('ar-JO')}</span>
        </div>

        {/* Status Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E9DDCC] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
            <div>
              <span className="text-xs font-bold text-stone-400 block mb-1">
                {isAr ? 'رقم الطلب' : 'Order Reference'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black font-mono text-[#2B2B2B]">
                #{order.reference}
              </h1>
            </div>
            <div className={`px-4 py-2 rounded-2xl border text-xs sm:text-sm font-bold flex items-center gap-2 self-start sm:self-auto ${statusInfo.color}`}>
              {isDelivered ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : isOutForDelivery ? (
                <Truck className="w-4 h-4 text-blue-600" />
              ) : isConfirmed ? (
                <Package className="w-4 h-4 text-purple-600" />
              ) : (
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              )}
              <span>{statusInfo.label}</span>
            </div>
          </div>

          {/* Reassurance Callout */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">{statusInfo.desc}</p>
              {isPendingReview && (
                <p className="text-xs text-emerald-800">
                  {isAr
                    ? 'سيتم التواصل معكِ عبر واتساب لإرسال الفاتورة وتأكيد موعد التوصيل قريباً.'
                    : 'We will reach out to you via WhatsApp with invoice and delivery details.'}
                </p>
              )}
            </div>
          </div>

          {/* Timeline Visual Steps */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-stone-400 mb-4">
              {isAr ? 'مراحل متابعة الطلب' : 'Order Progress'}
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center text-[11px] sm:text-xs">
              <div className="space-y-1.5">
                <div className="w-8 h-8 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">
                  ✓
                </div>
                <span className="font-bold text-stone-900 block">{isAr ? 'تم الاستلام' : 'Received'}</span>
              </div>
              <div className="space-y-1.5">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                  isConfirmed || isOutForDelivery || isDelivered ? 'bg-emerald-500 text-white' : 'bg-amber-100 text-amber-800 ring-2 ring-amber-400'
                }`}>
                  {isConfirmed || isOutForDelivery || isDelivered ? '✓' : '2'}
                </div>
                <span className={`font-bold block ${isPendingReview ? 'text-amber-800 font-extrabold' : 'text-stone-700'}`}>
                  {isAr ? 'المراجعة' : 'Review'}
                </span>
              </div>
              <div className="space-y-1.5">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                  isOutForDelivery || isDelivered ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {isOutForDelivery || isDelivered ? '✓' : '3'}
                </div>
                <span className="font-medium text-stone-500 block">{isAr ? 'التوصيل' : 'Delivery'}</span>
              </div>
              <div className="space-y-1.5">
                <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                  isDelivered ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400'
                }`}>
                  {isDelivered ? '✓' : '4'}
                </div>
                <span className="font-medium text-stone-500 block">{isAr ? 'الاستلام' : 'Delivered'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Details & Summary */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-[#E9DDCC] space-y-5">
          <h2 className="text-base font-extrabold text-[#2B2B2B]">
            {isAr ? 'تفاصيل المشتريات والتوصيل' : 'Order Summary'}
          </h2>

          <div className="divide-y divide-stone-100 text-xs sm:text-sm">
            {order.items.map((it) => (
              <div key={it.id} className="py-3 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-stone-900 block">{it.name}</span>
                  <span className="text-xs text-stone-500">
                    {it.size && it.size !== 'افتراضي' ? `المقاس: ${it.size} • ` : ''}الكمية: {it.quantity}
                  </span>
                </div>
                <span className="font-mono font-bold text-stone-800" dir="ltr">
                  {filsToDisplay(it.total, isAr ? 'ar' : 'en')}
                </span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl space-y-2 text-xs border border-stone-200">
            <div className="flex justify-between text-stone-600">
              <span>{isAr ? 'الاسم:' : 'Customer Name:'}</span>
              <span className="font-bold text-stone-900">{order.customerName}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>{isAr ? 'منطقة التوصيل:' : 'Delivery Zone:'}</span>
              <span className="font-bold text-stone-900">{order.shippingZoneNameSnapshot || 'الأردن'}</span>
            </div>
            {order.notes && (
              <div className="flex justify-between text-stone-600">
                <span>{isAr ? 'العنوان:' : 'Address:'}</span>
                <span className="font-bold text-stone-900">{order.notes.replace(/^العنوان:\s*/, '')}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>{isAr ? 'رسوم التوصيل:' : 'Shipping Cost:'}</span>
              <span className="font-bold text-stone-900">
                {order.shippingCost === 0 ? (isAr ? 'مجاني 🎁' : 'Free') : filsToDisplay(order.shippingCost, isAr ? 'ar' : 'en')}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-[#3F4832] pt-2 border-t border-stone-200">
              <span>{isAr ? 'المجموع النهائي المطلوب:' : 'Total Amount:'}</span>
              <span dir="ltr">{filsToDisplay(order.totalAmount, isAr ? 'ar' : 'en')}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <Link
              href={`/${locale}/invoice/${order.reference}`}
              className="w-full sm:flex-1 py-3 px-4 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isAr ? 'عرض الفاتورة الإلكترونية المباشرة' : 'View Digital Invoice'}</span>
            </Link>
            <Link
              href={`/${locale}/shop`}
              className="w-full sm:flex-1 btn-rawaq-primary py-3 px-4 rounded-full text-xs font-bold text-center shadow-md transition"
            >
              {isAr ? 'متابعة التسوق في المتجر' : 'Continue Shopping'}
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
