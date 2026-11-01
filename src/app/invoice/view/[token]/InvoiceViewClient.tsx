'use client';

import React from 'react';
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Clock,
  Sparkles,
  Package,
  XCircle,
} from 'lucide-react';
import { filsToDisplay } from '@/lib/money';

interface Props {
  invoice: {
    invoiceNumber: string;
    issueDate: Date | string;
    secureToken: string;
    paymentStatus: string;
    isPaid: boolean;
    orderReference: string;
    orderStatus?: string;
    fulfillmentStatus?: string | null;
    customerName: string;
    customerPhone: string;
    city: string;
    addressDetails: string;
    paymentMethod: string;
    grossTotalFils: number;
    netSubtotalFils: number;
    discountAmountFils: number;
    shippingAmountFils: number;
    taxAmountFils: number;
    hasAdjustment?: boolean;
    previousTotalAmount?: number | null;
    adjustmentNotes?: string | null;
    items: Array<{
      name: string;
      size: string;
      quantity: number;
      unitPriceFils: number;
      totalFils: number;
      isRemoved?: boolean;
      removalReason?: string | null;
      missingQuantity?: number;
    }>;
  };
}

export default function InvoiceViewClient({ invoice }: Props) {
  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(invoice.issueDate).toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // تحديد تفاصيل حالة الطلب للعميل
  const getOrderStatusConfig = (status?: string, fulfillmentStatus?: string | null) => {
    const s = (fulfillmentStatus || status || 'PENDING').toUpperCase();
    if (s === 'DELIVERED') {
      return {
        label: 'تم التسليم بنجاح ✨',
        step: 4,
        badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
        description: 'تم تسليم الطلب لكِ بنجاح، نتمنى لكِ تجربة تسوق رائعة مع رَواق!',
        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
      };
    }
    if (s === 'OUT_FOR_DELIVERY' || s === 'SHIPPED') {
      return {
        label: 'خرج للتوصيل مع المندوب 🚚',
        step: 3,
        badgeClass: 'bg-blue-100 text-blue-900 border border-blue-300',
        description: 'شحنتكِ الآن مع مندوب التوصيل وفي طريقها لعنوانكِ',
        icon: <Truck className="w-4 h-4 text-blue-600" />,
      };
    }
    if (s === 'PREPARED' || s === 'READY_FOR_PICKUP') {
      return {
        label: 'جاهز للتسليم لشركة التوصيل 📦',
        step: 2,
        badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
        description: 'تم تجهيز وتغليف طرود طلبكِ وبانتظار استلام المندوب',
        icon: <Package className="w-4 h-4 text-indigo-600" />,
      };
    }
    if (s === 'PREPARING' || s === 'IN_PREPARATION') {
      return {
        label: 'قيد التجهيز لدى المحلات ⏳',
        step: 2,
        badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
        description: 'يجري تجهيز وتجميع طلبكِ بعناية من المحلات الشريكة',
        icon: <Clock className="w-4 h-4 text-amber-600" />,
      };
    }
    if (s === 'CANCELLED') {
      return {
        label: 'طلب ملغي ✕',
        step: 0,
        badgeClass: 'bg-rose-100 text-rose-900 border border-rose-300',
        description: 'تم إلغاء هذا الطلب بناءً على الطلب أو لعدم توفر الأصناف',
        icon: <XCircle className="w-4 h-4 text-rose-600" />,
      };
    }
    // الافتراضي: مؤكد أو بانتظار
    const isConfirmed = status === 'CONFIRMED';
    return {
      label: isConfirmed ? 'تم تأكيد الطلب بنجاح ✓' : 'بانتظار تأكيد الطلب 🕒',
      step: 1,
      badgeClass: isConfirmed
        ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
        : 'bg-stone-100 text-stone-800 border border-stone-300',
      description: isConfirmed
        ? 'تم تأكيد طلبكِ وسيبدأ تجهيز الطرود فوراً'
        : 'تم استلام طلبكِ وجارٍ مراجعته مع خدمة العملاء',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
    };
  };

  const orderStatusConfig = getOrderStatusConfig(invoice.orderStatus, invoice.fulfillmentStatus);
  const stepIndex = orderStatusConfig.step;

  const invoiceUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/invoice/view/${invoice.secureToken}`
      : `https://rawaq.jo/invoice/view/${invoice.secureToken}`;

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 font-sans text-stone-900" dir="rtl">
      {/* Top action bar (hidden during print) */}
      <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2 text-xs text-stone-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>نسخة مالية موثقة ومعتمدة من رَواق</span>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>طباعة الفاتورة / PDF</span>
        </button>
      </div>

      {/* Invoice Card */}
      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden print:shadow-none print:border-none print:m-0 print:p-0">
        {/* Header */}
        <div className="bg-[#3F4832] text-white p-6 sm:p-8 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight">رَواق</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-stone-100">
                RAWAQ BEAUTY
              </span>
            </div>
            <p className="text-xs text-stone-300">فاتورة إلكترونية معتمدة للطلب</p>
          </div>

          <div className="text-left font-mono">
            <span className="text-[11px] block text-stone-300">رقم الفاتورة</span>
            <span className="text-sm sm:text-base font-extrabold text-white">
              {invoice.invoiceNumber}
            </span>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-stone-100/70 border-b border-stone-200 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-500">حالة الفاتورة:</span>
            {invoice.isPaid ? (
              <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>مدفوعة بالكامل</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>صادرة — الدفع عند الاستلام</span>
              </span>
            )}
          </div>
          <div className="text-stone-500 font-medium">{formattedDate}</div>
        </div>

        {/* ── Order Status Card (حالة الطلب لدى الزبونة ومراحل التوصيل) ── */}
        <div className="bg-white border-b border-stone-200 p-6 sm:p-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                حالة الطلب الحالية
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${orderStatusConfig.badgeClass}`}
                >
                  {orderStatusConfig.icon}
                  <span>{orderStatusConfig.label}</span>
                </span>
                <span className="text-xs text-stone-500 font-mono">
                  #{invoice.orderReference}
                </span>
              </div>
            </div>
            <p className="text-xs text-stone-600 font-medium max-w-xs sm:text-left">
              {orderStatusConfig.description}
            </p>
          </div>

          {/* خط سير الطلب التفاعلي */}
          {stepIndex > 0 && (
            <div className="pt-2 grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              <div
                className={`p-2 rounded-xl border ${
                  stepIndex >= 1
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <span className="block">1. التأكيد</span>
                <span className="text-[9px] font-normal">{stepIndex >= 1 ? 'مكتمل ✓' : 'بانتظار'}</span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  stepIndex >= 2
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <span className="block">2. التجهيز</span>
                <span className="text-[9px] font-normal">
                  {stepIndex >= 2 ? 'مكتمل ✓' : stepIndex === 1 ? 'قيد العمل' : 'بانتظار'}
                </span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  stepIndex >= 3
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <span className="block">3. مع المندوب</span>
                <span className="text-[9px] font-normal">
                  {stepIndex >= 3 ? 'في الطريق 🚚' : 'بانتظار'}
                </span>
              </div>
              <div
                className={`p-2 rounded-xl border ${
                  stepIndex >= 4
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                    : 'bg-stone-50 border-stone-200 text-stone-400'
                }`}
              >
                <span className="block">4. التسليم</span>
                <span className="text-[9px] font-normal">
                  {stepIndex >= 4 ? 'تم الاستلام ✨' : 'بانتظار'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Shortage Adjustment Notice */}
        {invoice.hasAdjustment && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>تنبيه بخصوص تحديث محتويات طلبكِ</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              {invoice.adjustmentNotes || 'تم تعديل محتويات هذا الطلب بناءً على التوافر الفعلي للمنتجات لدى الموردين، وتم تحديث الإجمالي تلقائياً.'}
            </p>
            {invoice.previousTotalAmount && (
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono">
                <span className="text-stone-400 line-through">الإجمالي السابق: {filsToDisplay(invoice.previousTotalAmount)}</span>
                <span className="font-extrabold text-amber-950 bg-white/80 px-2 py-0.5 rounded-md border border-amber-300">
                  المبلغ الحالي المطلوب للدفع: {filsToDisplay(invoice.grossTotalFils)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Customer & Order Details */}
        <div className="p-6 sm:p-8 border-b border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-stone-400 block text-[11px]">بيانات العميلة</span>
            <div className="text-sm font-bold text-stone-900">{invoice.customerName}</div>
            <div className="text-stone-600 font-mono" dir="ltr">{invoice.customerPhone}</div>
            <div className="text-stone-500 text-[11px] mt-0.5">
              {invoice.city} — {invoice.addressDetails}
            </div>
          </div>

          <div className="space-y-1 sm:text-left">
            <span className="font-bold text-stone-400 block text-[11px]">مرجع الطلب</span>
            <div className="text-sm font-bold text-stone-900 font-mono">#{invoice.orderReference}</div>
            <div className="text-stone-500 text-[11px]">طريقة الدفع: {invoice.paymentMethod}</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="p-6 sm:p-8">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-bold">
                <th className="pb-3 text-right">المنتج والمواصفات</th>
                <th className="pb-3 text-center">الكمية</th>
                <th className="pb-3 text-left">سعر الوحدة</th>
                <th className="pb-3 text-left">المجموع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoice.items.map((item, idx) => {
                const isRemoved = item.isRemoved;
                return (
                  <tr key={idx} className={isRemoved ? 'bg-rose-50/50' : 'hover:bg-stone-50/50'}>
                    <td className="py-3.5 pr-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`font-bold block ${isRemoved ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {item.name}
                        </span>
                        {isRemoved && (
                          <span className="no-underline inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            غير متوفر - تم استبعاده {item.removalReason ? `(${item.removalReason})` : ''}
                          </span>
                        )}
                      </div>
                      {item.size && item.size !== 'افتراضي' && (
                        <span className={`text-[11px] block ${isRemoved ? 'text-stone-400' : 'text-stone-500'}`}>
                          {item.size}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-center font-mono font-bold text-stone-700">
                      {isRemoved ? <span className="line-through text-stone-300">{item.quantity}</span> : item.quantity}
                    </td>
                    <td className="py-3.5 text-left font-mono text-stone-600" dir="ltr">
                      {filsToDisplay(item.unitPriceFils)}
                    </td>
                    <td className="py-3.5 text-left font-mono font-bold text-stone-900" dir="ltr">
                      {isRemoved ? (
                        <span className="line-through text-stone-300">0.00 د.أ</span>
                      ) : (
                        filsToDisplay(item.totalFils)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals Summary */}
          <div className="mt-6 pt-4 border-t border-stone-200 space-y-2 text-xs">
            <div className="flex justify-between text-stone-600">
              <span>المجموع الفرعي للمنتجات:</span>
              <span className="font-mono" dir="ltr">{filsToDisplay(invoice.netSubtotalFils)}</span>
            </div>

            {invoice.discountAmountFils > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>الخصومات المطبقة:</span>
                <span className="font-mono font-bold" dir="ltr">-{filsToDisplay(invoice.discountAmountFils)}</span>
              </div>
            )}

            <div className="flex justify-between text-stone-600">
              <span>رسوم التوصيل:</span>
              <span className="font-mono" dir="ltr">{filsToDisplay(invoice.shippingAmountFils)}</span>
            </div>

            <div className="pt-3 border-t-2 border-stone-900 flex justify-between items-baseline">
              <span className="text-sm font-extrabold text-stone-900">المبلغ الإجمالي النهائي:</span>
              <span className="text-lg font-black text-[#3F4832] font-mono" dir="ltr">
                {filsToDisplay(invoice.grossTotalFils)}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code & Verification Notice */}
        <div className="bg-stone-50 p-6 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1 max-w-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <ShieldCheck className="w-4 h-4 text-[#3F4832]" />
              <span>فاتورة إلكترونية رسمية موثقة ومعتمدة من رَواق</span>
            </div>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              يمكنكِ مسح رمز الاستجابة السريعة (QR) بكاميرا الهاتف لاستعراض الفاتورة المحدثة في أي وقت ومتابعة حالة التوصيل مباشرة.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white p-2.5 rounded-2xl border border-stone-200 shadow-2xs">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(invoiceUrl)}`}
              alt="QR التحقق من الفاتورة"
              width={64}
              height={64}
              className="rounded-lg"
            />
            <div className="text-right space-y-0.5">
              <span className="text-[10px] font-black text-[#3F4832] block">QR التحقق من الفاتورة</span>
              <span className="text-[10px] font-mono text-stone-500 block">#{invoice.orderReference}</span>
              <span className="text-[9px] text-stone-400 block">امسحي للمتابعة المباشرة</span>
            </div>
          </div>
        </div>

        {/* Read-Only Notice */}
        <div className="bg-stone-100/60 p-3.5 border-t border-stone-200 text-center space-y-0.5">
          <p className="text-[10px] text-stone-400">
            شكراً لثقتكِ برَواق • منصة مستحضرات العناية والتجميل الأولى في الأردن
          </p>
        </div>
      </div>
    </div>
  );
}
