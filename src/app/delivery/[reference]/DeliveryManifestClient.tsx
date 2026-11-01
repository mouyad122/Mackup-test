'use client';

import React, { useState } from 'react';
import {
  Printer,
  Copy,
  MapPin,
  Phone,
  Package,
  Store,
  DollarSign,
  Truck,
  ExternalLink,
  CheckCircle2,
  Share2,
  Clock,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { filsToDisplay } from '@/lib/money';
import {
  confirmBatchPickupFromManifestAction,
  confirmOrderDeliveryFromManifestAction,
} from '@/actions/delivery-batch';

interface Props {
  batch: {
    reference: string;
    createdAt: Date | string;
    status: string;
  };
  metrics: {
    ordersCount: number;
    uniqueShopsCount: number;
    totalParcelsCount: number;
    totalCodFils: number;
  };
  pickupStops: Array<{
    shopKey: string;
    supplierName: string;
    locationLabel: string;
    contactPerson: string;
    contactPhone: string;
    address: string;
    city: string;
    googleMapsUrl: string;
    pickupInstructions?: string | null;
    parcels: Array<{
      packageCode: string;
      orderReference: string;
      items: Array<{
        name: string;
        variantTitle?: string | null;
        quantity: number;
      }>;
    }>;
  }>;
  dropoffStops: Array<{
    orderId: string;
    orderReference: string;
    customerName: string;
    customerPhone: string;
    city: string;
    address: string;
    googleMapsUrl: string;
    notes?: string | null;
    codAmountFils: number;
    isPaid: boolean;
    status: string;
    fulfillmentStatus?: string | null;
    isDelivered?: boolean;
    deliveredAt?: string | null;
    packageCodes: string[];
  }>;
  formattedWhatsAppText: string;
}

export default function DeliveryManifestClient({
  batch,
  metrics,
  pickupStops,
  dropoffStops,
  formattedWhatsAppText,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PICKUP' | 'DROPOFF'>('ALL');
  const [checkedParcels, setCheckedParcels] = useState<Record<string, boolean>>({});

  // حالات العمليات الميدانية للسائق
  const [localBatchStatus, setLocalBatchStatus] = useState(batch.status);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [localDeliveredOrders, setLocalDeliveredOrders] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const d of dropoffStops) {
      if (d.isDelivered || d.status === 'DELIVERED') {
        initial[d.orderId] = true;
      }
    }
    return initial;
  });
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState<Record<string, boolean>>({});

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(formattedWhatsAppText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleParcelCheck = (pkgCode: string) => {
    setCheckedParcels((prev) => ({
      ...prev,
      [pkgCode]: !prev[pkgCode],
    }));
  };

  // تأكيد استلام الطرود وبدء رحلة التوصيل من كشف المندوب
  const handleConfirmPickup = async () => {
    if (!confirm('هل تم استلام كافة الطرود من المحلات بنجاح وبدء رحلة التوصيل للزبونات؟')) {
      return;
    }
    setIsConfirmingPickup(true);
    try {
      const res = await confirmBatchPickupFromManifestAction(batch.reference);
      if (res.success) {
        setLocalBatchStatus('IN_DELIVERY');
        alert('تم تأكيد استلام الشحنة وتحديث الحالة إلى "قيد التوصيل" بنجاح!');
      } else {
        alert(res.error || 'تعذر تأكيد الاستلام.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تأكيد الاستلام');
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  // تأكيد تسليم طلب معين للزبونة وتحصيل المبلغ مباشرة من كشف التوصيل
  const handleConfirmOrderDelivery = async (orderId: string, orderRef: string, codFils: number, isPaid: boolean) => {
    const amountStr = isPaid ? '0.00 د.أ (مدفوع مسبقاً)' : filsToDisplay(codFils);
    if (!confirm(`تأكيد تسليم الطلب #${orderRef} للزبونة وتحصيل مبلغ (${amountStr})؟`)) {
      return;
    }

    setIsConfirmingDelivery((prev) => ({ ...prev, [orderId]: true }));
    try {
      const res = await confirmOrderDeliveryFromManifestAction(batch.reference, orderId);
      if (res.success) {
        setLocalDeliveredOrders((prev) => ({ ...prev, [orderId]: true }));
        alert(`تم تأكيد تسليم الطلب #${orderRef} للزبونة وتحصيل المبلغ بنجاح! ✓`);
      } else {
        alert(res.error || 'تعذر تأكيد التسليم.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تأكيد التسليم');
    } finally {
      setIsConfirmingDelivery((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const formattedDate = new Date(batch.createdAt).toLocaleDateString('ar-JO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="min-h-screen bg-stone-100 py-6 px-3 sm:px-6 font-sans text-stone-900" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Control Bar (Hidden on print) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-stone-200 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#3F4832] text-white flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-stone-900">
                كشف تسليم واستلام شركة التوصيل
              </h1>
              <span className="text-[11px] text-stone-500 font-mono">
                {batch.reference} • منصة رَواق الرسمية
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'تم نسخ التقرير لواتساب!' : 'نسخ كشف واتساب للمندوب'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-stone-200 text-stone-700 hover:bg-stone-50 shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف / PDF</span>
            </button>
          </div>
        </div>

        {/* Printable Card Header */}
        <div className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden print:shadow-none print:border-none print:m-0">
          <div className="bg-[#3F4832] text-white p-6 sm:p-8 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight">رَواق</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full text-stone-100">
                  RAWAQ FULFILLMENT & LOGISTICS
                </span>
              </div>
              <p className="text-xs text-stone-300">
                كشف إرسالية مجمعة لاستلام الطرود من المحلات وتوصيلها للزبونات
              </p>
            </div>

            <div className="text-left font-mono">
              <span className="text-[11px] block text-stone-300">رقم الإرسالية</span>
              <span className="text-lg font-black text-white">{batch.reference}</span>
              <span className="text-[11px] block text-stone-300 mt-0.5">{formattedDate}</span>
            </div>
          </div>

          {/* KPI Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-stone-200 border-b border-stone-200 bg-stone-50 text-center">
            <div className="p-4 space-y-0.5">
              <span className="text-[11px] font-bold text-stone-500 block">إجمالي الطلبات</span>
              <span className="text-xl font-extrabold text-stone-900">{metrics.ordersCount} طلبات</span>
            </div>
            <div className="p-4 space-y-0.5 bg-amber-50/50">
              <span className="text-[11px] font-bold text-amber-800 block">المحلات المطلوب زيارتها</span>
              <span className="text-xl font-extrabold text-amber-950">
                {metrics.uniqueShopsCount} محلات
              </span>
            </div>
            <div className="p-4 space-y-0.5 bg-purple-50/50">
              <span className="text-[11px] font-bold text-purple-800 block">إجمالي الطرود المطلوبة</span>
              <span className="text-xl font-extrabold text-purple-950">
                {metrics.totalParcelsCount} طرد
              </span>
            </div>
            <div className="p-4 space-y-0.5 bg-emerald-50/50">
              <span className="text-[11px] font-bold text-emerald-800 block">مجموع تحصيل النقد COD</span>
              <span className="text-xl font-black text-emerald-950 font-mono" dir="ltr">
                {filsToDisplay(metrics.totalCodFils)}
              </span>
            </div>
          </div>

          {/* Filter Tabs (Hidden on print) */}
          <div className="p-4 bg-white border-b border-stone-100 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'ALL'
                    ? 'bg-[#3F4832] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                الكل (استلام + توصيل)
              </button>
              <button
                onClick={() => setActiveTab('PICKUP')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'PICKUP'
                    ? 'bg-amber-700 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                المرحلة 1: استلام المحلات ({pickupStops.length} محطات)
              </button>
              <button
                onClick={() => setActiveTab('DROPOFF')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === 'DROPOFF'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100'
                }`}
              >
                المرحلة 2: تسليم الزبونات ({dropoffStops.length} وجهات)
              </button>
            </div>
            <span className="text-xs text-stone-400 font-medium">
              اضغط على رمز الطرد لتأكيد استلامه
            </span>
          </div>

          {/* Section 1: Pickup Stops */}
          {(activeTab === 'ALL' || activeTab === 'PICKUP') && (
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-amber-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900">
                      محطات الاستلام من المحلات (Pickup Stops)
                    </h2>
                    <p className="text-xs text-stone-500">
                      يجب على السائق المرور بهذه المحلات واستلام الطرود المحددة لكل محل
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  {pickupStops.length} محطات استلام مختلفة
                </span>
              </div>

              {/* Pickup Confirmation Action Banner */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-stone-900">
                      تأكيد استلام الطرود وبدء رحلة التوصيل
                    </h3>
                    <p className="text-xs text-stone-600">
                      بعد استلام كافة طرود المحلات المبينة أدناه، اضغط هنا لتأكيد الاستلام والانطلاق في رحلة التوصيل
                    </p>
                  </div>
                </div>

                {localBatchStatus === 'IN_DELIVERY' ? (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    <span>تم تأكيد الاستلام — رحلة التوصيل جارية حالياً ✓</span>
                  </div>
                ) : localBatchStatus === 'COMPLETED' ? (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 border border-emerald-300 px-4 py-2 rounded-xl text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>تم اكتمال تسليم كافة طلبات الإرسالية بنجاح ✓</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isConfirmingPickup}
                    onClick={handleConfirmPickup}
                    className="bg-[#3F4832] hover:bg-[#2d3424] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isConfirmingPickup ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ تأكيد الاستلام...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>تأكيد استلام الطرود وبدء التوصيل 🚚</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {pickupStops.map((stop, index) => {
                  return (
                    <div
                      key={stop.shopKey}
                      className="rounded-2xl border-2 border-stone-200 bg-white p-5 space-y-4 hover:border-amber-400 transition"
                    >
                      {/* Shop Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-3">
                        <div className="flex items-start gap-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-extrabold text-sm text-stone-900">
                                {stop.supplierName}
                              </h3>
                              {stop.contactPerson && (
                                <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  المسؤول: {stop.contactPerson}
                                </span>
                              )}
                              <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                {stop.locationLabel}
                              </span>
                            </div>
                            <div className="text-xs text-stone-600 mt-1 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span>{stop.address} — {stop.city}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Contact & Map Actions */}
                        <div className="flex items-center gap-2 print:hidden">
                          {stop.contactPhone && (
                            <>
                              <a
                                href={`tel:${stop.contactPhone}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition"
                              >
                                <Phone className="w-3.5 h-3.5 text-stone-600" />
                                <span dir="ltr">{stop.contactPhone}</span>
                              </a>
                              <a
                                href={`https://wa.me/${stop.contactPhone.replace(/\D/g, '').replace(/^07/, '9627')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition"
                              >
                                <span>واتساب 💬</span>
                              </a>
                            </>
                          )}
                          <a
                            href={stop.googleMapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#3F4832] hover:bg-[#2d3424] px-3.5 py-1.5 rounded-xl shadow-xs transition"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>موقع المحل على الخريطة</span>
                          </a>
                        </div>
                      </div>

                      {/* Pickup Instructions */}
                      {stop.pickupInstructions && (
                        <div className="p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200">
                          <strong>تعليمات الاستلام:</strong> {stop.pickupInstructions}
                        </div>
                      )}

                      {/* Parcels to pickup from this shop */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-stone-700">
                          الطرود المطلوب استلامها من هذا المحل ({stop.parcels.length} طرد):
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {stop.parcels.map((pkg) => {
                            const isChecked = checkedParcels[pkg.packageCode];
                            return (
                              <div
                                key={pkg.packageCode}
                                onClick={() => toggleParcelCheck(pkg.packageCode)}
                                className={`p-3 rounded-xl border cursor-pointer transition select-none ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                                    : 'bg-stone-50 border-stone-200 text-stone-800 hover:border-stone-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`w-4 h-4 rounded-md flex items-center justify-center border text-[10px] font-bold ${
                                        isChecked
                                          ? 'bg-emerald-600 border-emerald-600 text-white'
                                          : 'bg-white border-stone-300 text-transparent'
                                      }`}
                                    >
                                      ✓
                                    </span>
                                    <span className="font-mono font-black text-xs">
                                      {pkg.packageCode}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-bold text-stone-500 font-mono">
                                    طلب #{pkg.orderReference}
                                  </span>
                                </div>
                                <div className="space-y-0.5 text-[11px] text-stone-600 pr-5">
                                  {pkg.items.map((it, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>
                                        {it.name} {it.variantTitle ? `(${it.variantTitle})` : ''}
                                      </span>
                                      <span className="font-bold text-stone-900">×{it.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 2: Dropoff Destinations */}
          {(activeTab === 'ALL' || activeTab === 'DROPOFF') && (
            <div className="p-6 sm:p-8 space-y-6 border-t-4 border-stone-200">
              <div className="flex items-center justify-between border-b border-purple-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-stone-900">
                      محطات التسليم للعملاء والتحصيل (Dropoff Stops)
                    </h2>
                    <p className="text-xs text-stone-500">
                      تسليم كل طلب لعنوان الزبونة الموضح وتحصيل قيمة النقد COD المحددة
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-300">
                  {dropoffStops.length} طلبات للتسليم
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dropoffStops.map((dropoff) => {
                  const isDelivered = Boolean(localDeliveredOrders[dropoff.orderId]);
                  return (
                    <div
                      key={dropoff.orderId}
                      className={`p-5 rounded-2xl border transition space-y-3 ${
                        isDelivered
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-stone-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start justify-between border-b border-stone-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-stone-900 block font-mono">
                              #{dropoff.orderReference}
                            </span>
                            {isDelivered && (
                              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                                تم التسليم ✓
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-stone-700 block mt-0.5">
                            {dropoff.customerName}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-[10px] text-stone-400 block">المبلغ المطلوب تحصيله</span>
                          <span
                            className={`text-base font-black font-mono ${
                              dropoff.isPaid
                                ? 'text-stone-400 line-through'
                                : isDelivered
                                ? 'text-emerald-700'
                                : 'text-stone-900'
                            }`}
                            dir="ltr"
                          >
                            {dropoff.isPaid
                              ? '0.00 د.أ (مدفوع)'
                              : isDelivered
                              ? `تم تحصيل: ${filsToDisplay(dropoff.codAmountFils)} ✓`
                              : filsToDisplay(dropoff.codAmountFils)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <a
                            href={`tel:${dropoff.customerPhone}`}
                            className="font-mono text-blue-600 font-bold hover:underline"
                            dir="ltr"
                          >
                            {dropoff.customerPhone}
                          </a>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                          <span>
                            {dropoff.city} — {dropoff.address}
                          </span>
                        </div>
                        {dropoff.notes && (
                          <div className="p-2 bg-amber-50 rounded-lg text-[11px] text-amber-900 border border-amber-200">
                            {dropoff.notes}
                          </div>
                        )}
                      </div>

                      {/* Bar with packages and confirm delivery button (no map button) */}
                      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {dropoff.packageCodes.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold"
                            >
                              {c}
                            </span>
                          ))}
                        </div>

                        {/* Delivery Confirmation for Courier */}
                        <div className="print:hidden">
                          {isDelivered ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>تم التسليم بنجاح ✓</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={isConfirmingDelivery[dropoff.orderId]}
                              onClick={() =>
                                handleConfirmOrderDelivery(
                                  dropoff.orderId,
                                  dropoff.orderReference,
                                  dropoff.codAmountFils,
                                  dropoff.isPaid
                                )
                              }
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3F4832] hover:bg-[#2d3424] text-white font-extrabold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                            >
                              {isConfirmingDelivery[dropoff.orderId] ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>جارٍ تأكيد التسليم...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>تأكيد التسليم للزبونة ✓</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 text-center text-xs text-stone-500">
            رَواق • منصة إدارة التجارة الإلكترونية والتنفيذ اللوجستي متعدد المحلات
          </div>
        </div>
      </div>
    </div>
  );
}
