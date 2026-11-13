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
  confirmSingleOrderPickupFromManifestAction,
  confirmAllOrdersDeliveryFromManifestAction,
} from '@/actions/delivery-batch';

interface Props {
  batch: {
    reference: string;
    secureToken?: string;
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
      orderId?: string;
      fulfillmentOrderId?: string;
      isPickedUp?: boolean;
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

  const [localBatchStatus, setLocalBatchStatus] = useState(batch.status);
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [localPickedUpParcels, setLocalPickedUpParcels] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const stop of pickupStops) {
      for (const p of stop.parcels) {
        if (p.isPickedUp) {
          if (p.fulfillmentOrderId) initial[p.fulfillmentOrderId] = true;
          if (p.packageCode) initial[p.packageCode] = true;
          if (p.orderId) initial[p.orderId] = true;
        }
      }
    }
    return initial;
  });
  const [isConfirmingSinglePickup, setIsConfirmingSinglePickup] = useState<Record<string, boolean>>({});
  const [isConfirmingAllDeliveries, setIsConfirmingAllDeliveries] = useState(false);

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

  const handleConfirmSingleOrderPickup = async (
    orderId: string,
    orderRef: string,
    fulfillmentOrderId?: string,
    packageCode?: string
  ) => {
    if (!confirm(`هل أنت متأكد من استلام طرد الطلب #${orderRef} من المحل؟`)) {
      return;
    }

    const confirmKey = fulfillmentOrderId || packageCode || orderId;
    try {
      setIsConfirmingSinglePickup((prev) => ({ ...prev, [confirmKey]: true }));
      const res = await confirmSingleOrderPickupFromManifestAction(
        batch.reference,
        orderId,
        fulfillmentOrderId,
        batch.secureToken
      );
      if (res.success) {
        setLocalPickedUpParcels((prev) => ({
          ...prev,
          [confirmKey]: true,
          ...(fulfillmentOrderId ? { [fulfillmentOrderId]: true } : {}),
          ...(packageCode ? { [packageCode]: true } : {}),
          [orderId]: true,
        }));
        alert(`تم تأكيد استلام الطلب #${orderRef} من المحل بنجاح! ✓`);
      } else {
        alert(res.error || 'تعذر تأكيد استلام هذا الطلب.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء تأكيد استلام الطلب');
    } finally {
      setIsConfirmingSinglePickup((prev) => ({ ...prev, [confirmKey]: false }));
    }
  };

  const handleConfirmAllDeliveries = async () => {
    const undelivered = dropoffStops.filter((d) => !localDeliveredOrders[d.orderId]);
    if (undelivered.length === 0) {
      alert('كافة الطلبات مسلّمة بالفعل.');
      return;
    }

    const totalRemainingCod = undelivered
      .filter((d) => !d.isPaid)
      .reduce((sum, d) => sum + d.codAmountFils, 0);

    const msg = `هل أنت متأكد من تأكيد تسليم كافة الطلبات المتبقية (${undelivered.length} طلب) وتحصيل مبلغ إجمالي قدره (${filsToDisplay(totalRemainingCod)}) نقداً؟`;

    if (!confirm(msg)) {
      return;
    }

    try {
      setIsConfirmingAllDeliveries(true);
      const res = await confirmAllOrdersDeliveryFromManifestAction(
        batch.reference,
        batch.secureToken
      );
      if (res.success) {
        setLocalDeliveredOrders((prev) => {
          const updated = { ...prev };
          for (const d of dropoffStops) {
            updated[d.orderId] = true;
          }
          return updated;
        });
        setLocalBatchStatus('COMPLETED');
        alert(`تم بنجاح تأكيد تسليم كافة طلبات الإرسالية (${res.deliveredCount} طلب) وإتمام الكشف بالكامل! ✓`);
      } else {
        alert(res.error || 'تعذر تأكيد تسليم جميع الطلبات.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsConfirmingAllDeliveries(false);
    }
  };

  const handleConfirmPickup = async () => {
    if (
      !confirm(
        'هل قمت باستلام كافة الطرود من المحلات بنجاح وتريد تأكيد بدء رحلة التوصيل؟'
      )
    ) {
      return;
    }

    try {
      setIsConfirmingPickup(true);
      const res = await confirmBatchPickupFromManifestAction(batch.reference, batch.secureToken);
      if (res.success) {
        setLocalBatchStatus('IN_DELIVERY');
        setLocalPickedUpParcels((prev) => {
          const updated = { ...prev };
          for (const stop of pickupStops) {
            for (const p of stop.parcels) {
              if (p.fulfillmentOrderId) updated[p.fulfillmentOrderId] = true;
              if (p.packageCode) updated[p.packageCode] = true;
              if (p.orderId) updated[p.orderId] = true;
            }
          }
          return updated;
        });
        alert('تم تأكيد الاستلام بنجاح! تم تحديث حالة الإرسالية إلى (جارٍ التوصيل). 🚚');
      } else {
        alert(res.error || 'تعذر تأكيد الاستلام.');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  const handleConfirmOrderDelivery = async (
    orderId: string,
    orderRef: string,
    codAmount: number,
    isPaid: boolean
  ) => {
    const confirmPrompt = isPaid
      ? `هل تم تسليم الطلب #${orderRef} للزبونة بنجاح؟ (الطلب مدفوع مسبقاً 0 د.أ)`
      : `هل تم تسليم الطلب #${orderRef} للزبونة وتحصيل مبلغ ${filsToDisplay(
          codAmount
        )} نقداً بنجاح؟`;

    if (!confirm(confirmPrompt)) {
      return;
    }

    try {
      setIsConfirmingDelivery((prev) => ({ ...prev, [orderId]: true }));
      const res = await confirmOrderDeliveryFromManifestAction(batch.reference, orderId, undefined, batch.secureToken);
      if (res.success) {
        setLocalDeliveredOrders((prev) => ({ ...prev, [orderId]: true }));
        alert(`تم تأكيد تسليم الطلب #${orderRef} وتحصيل المبلغ بنجاح! ✓`);
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
    <div className="min-h-screen bg-zinc-50 py-4 sm:py-8 px-3 sm:px-6 font-sans text-zinc-900" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Top Control Bar (Clean, Minimal, Non-distracting) */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-zinc-200 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 text-white flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-zinc-900">
                كشف تسليم واستلام المندوب
              </h1>
              <p className="text-xs text-zinc-500 font-mono">
                {batch.reference} • منصة رَواق
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? 'تم النسخ!' : 'نسخ النص لواتساب'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الكشف</span>
            </button>
          </div>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xs border border-zinc-200 overflow-hidden print:shadow-none print:border-none print:m-0">
          <div className="bg-zinc-900 text-white p-5 sm:p-7 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black tracking-tight">رَواق</span>
                <span className="text-[11px] font-bold text-zinc-300 bg-zinc-800 px-2.5 py-0.5 rounded-md">
                  كشف التوصيل الرسمي
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                استلام الطرود من المحلات وتسليمها للزبونات
              </p>
            </div>

            <div className="text-left font-mono">
              <span className="text-[11px] text-zinc-400 block">رقم الإرسالية</span>
              <span className="text-lg font-black text-white">{batch.reference}</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">{formattedDate}</span>
            </div>
          </div>

          {/* Clean 4-Metric Summary Bar (Neutral, Clear, Legible) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-zinc-200 border-b border-zinc-200 bg-white text-center">
            <div className="p-3.5 sm:p-4">
              <span className="text-xs text-zinc-500 block mb-1">إجمالي الطلبات</span>
              <span className="text-lg sm:text-xl font-black text-zinc-900">{metrics.ordersCount}</span>
            </div>
            <div className="p-3.5 sm:p-4">
              <span className="text-xs text-zinc-500 block mb-1">محطات المحلات</span>
              <span className="text-lg sm:text-xl font-black text-zinc-900">{metrics.uniqueShopsCount}</span>
            </div>
            <div className="p-3.5 sm:p-4">
              <span className="text-xs text-zinc-500 block mb-1">عدد الطرود</span>
              <span className="text-lg sm:text-xl font-black text-zinc-900">{metrics.totalParcelsCount}</span>
            </div>
            <div className="p-3.5 sm:p-4 bg-zinc-50">
              <span className="text-xs font-bold text-zinc-700 block mb-1">مجموع التحصيل (COD)</span>
              <span className="text-lg sm:text-xl font-black text-zinc-900 font-mono" dir="ltr">
                {filsToDisplay(metrics.totalCodFils)}
              </span>
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                الكل
              </button>
              <button
                onClick={() => setActiveTab('PICKUP')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'PICKUP'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                1. استلام المحلات ({pickupStops.length})
              </button>
              <button
                onClick={() => setActiveTab('DROPOFF')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeTab === 'DROPOFF'
                    ? 'bg-zinc-900 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                }`}
              >
                2. تسليم الزبونات ({dropoffStops.length})
              </button>
            </div>
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
              اضغط على رمز الطرد لتأكيد فحصه
            </span>
          </div>

          {/* SECTION 1: PICKUP STOPS */}
          {(activeTab === 'ALL' || activeTab === 'PICKUP') && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900">
                    المرحلة 1: استلام الطرود من المحلات
                  </h2>
                  <p className="text-xs text-zinc-500">
                    استلم الطرود الموضحة لكل محل وتأكد من مطابقة أرقام الطرود
                  </p>
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                  {pickupStops.length} محطات
                </span>
              </div>

              {/* Master Pickup Confirmation Action */}
              <div className="bg-zinc-50 border border-zinc-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="space-y-0.5">
                  <h3 className="font-bold text-sm text-zinc-900">
                    تأكيد استلام كافة طرود المحلات
                  </h3>
                  <p className="text-xs text-zinc-500">
                    اضغط هنا بعد استلام الطرود للانطلاق في رحلة التوصيل
                  </p>
                </div>

                {localBatchStatus === 'IN_DELIVERY' ? (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم تأكيد الاستلام — رحلة التوصيل جارية ✓</span>
                  </div>
                ) : localBatchStatus === 'COMPLETED' ? (
                  <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>تم اكتمال الإرسالية بالكامل بنجاح ✓</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isConfirmingPickup}
                    onClick={handleConfirmPickup}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isConfirmingPickup ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ التأكيد...</span>
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

              {/* Shops Cards */}
              <div className="space-y-3">
                {pickupStops.map((stop, index) => (
                  <div
                    key={stop.shopKey}
                    className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-zinc-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                            {index + 1}
                          </span>
                          <h3 className="font-extrabold text-sm text-zinc-900">
                            {stop.supplierName}
                          </h3>
                          {stop.contactPerson && (
                            <span className="text-xs text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                              {stop.contactPerson}
                            </span>
                          )}
                          <span className="text-xs text-zinc-400 font-mono">
                            ({stop.locationLabel})
                          </span>
                        </div>
                        <div className="text-xs text-zinc-600 mt-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>{stop.address} — {stop.city}</span>
                        </div>
                      </div>

                      {/* Phone & Map actions */}
                      <div className="flex items-center gap-2 print:hidden">
                        {stop.contactPhone && (
                          <a
                            href={`tel:${stop.contactPhone}`}
                            className="inline-flex items-center gap-1 text-xs font-bold text-zinc-800 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-lg transition"
                          >
                            <Phone className="w-3.5 h-3.5 text-zinc-600" />
                            <span dir="ltr">{stop.contactPhone}</span>
                          </a>
                        )}
                        <a
                          href={stop.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-900 bg-white border border-zinc-300 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>الخريطة</span>
                        </a>
                      </div>
                    </div>

                    {stop.pickupInstructions && (
                      <div className="p-2 bg-zinc-50 rounded-lg text-xs text-zinc-700 border border-zinc-200">
                        <strong>ملاحظة:</strong> {stop.pickupInstructions}
                      </div>
                    )}

                    {/* Parcels */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-bold text-zinc-700 block">
                        الطرود المطلوبة ({stop.parcels.length}):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {stop.parcels.map((pkg) => {
                          const parcelKey = pkg.fulfillmentOrderId || pkg.packageCode || pkg.orderId || '';
                          const isChecked = checkedParcels[pkg.packageCode];
                          const isPickedUp = Boolean(
                            (parcelKey && localPickedUpParcels[parcelKey]) ||
                            (pkg.packageCode && localPickedUpParcels[pkg.packageCode]) ||
                            (pkg.fulfillmentOrderId && localPickedUpParcels[pkg.fulfillmentOrderId]) ||
                            (pkg.orderId && localPickedUpParcels[pkg.orderId]) ||
                            pkg.isPickedUp ||
                            (pkg.orderId && localDeliveredOrders[pkg.orderId])
                          );
                          const isConfirming = parcelKey ? Boolean(isConfirmingSinglePickup[parcelKey]) : false;

                          return (
                            <div
                              key={pkg.packageCode}
                              className={`p-3 rounded-xl border text-xs transition flex flex-col gap-2 ${
                                isPickedUp
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                  : isChecked
                                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 font-bold'
                                  : 'bg-zinc-50 border-zinc-200 text-zinc-800'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div
                                  onClick={() => toggleParcelCheck(pkg.packageCode)}
                                  className="flex items-center gap-2 cursor-pointer select-none"
                                >
                                  <span
                                    className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold border ${
                                      isChecked || isPickedUp
                                        ? 'bg-emerald-600 border-emerald-600 text-white'
                                        : 'bg-white border-zinc-300 text-transparent'
                                    }`}
                                  >
                                    ✓
                                  </span>
                                  <span className="font-mono font-bold">{pkg.packageCode}</span>
                                </div>
                                <span className="text-zinc-600 font-mono font-bold">
                                  طلب #{pkg.orderReference}
                                </span>
                              </div>

                              {/* Single Order Confirm Pickup Button */}
                              <div className="pt-2 border-t border-zinc-200/60 flex items-center justify-between gap-2 print:hidden">
                                <div className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                                  {pkg.items?.map((it) => `${it.name} (${it.quantity})`).join(', ')}
                                </div>

                                {isPickedUp ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>تم الاستلام من المحل ✓</span>
                                  </span>
                                ) : pkg.orderId ? (
                                  <button
                                    type="button"
                                    disabled={isConfirming}
                                    onClick={() => handleConfirmSingleOrderPickup(pkg.orderId!, pkg.orderReference, pkg.fulfillmentOrderId, pkg.packageCode)}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-[11px] font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
                                  >
                                    {isConfirming ? (
                                      <>
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>جارٍ التأكيد...</span>
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>تأكيد استلام هذا الطلب</span>
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: DROPOFF DESTINATIONS */}
          {(activeTab === 'ALL' || activeTab === 'DROPOFF') && (
            <div className="p-4 sm:p-6 space-y-4 border-t border-zinc-200">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900">
                    المرحلة 2: تسليم الزبونات وتحصيل المبالغ
                  </h2>
                  <p className="text-xs text-zinc-500">
                    سلّم الطلب للعنوان الموضح وحصّل قيمة الـ COD النقدية
                  </p>
                </div>
                <span className="text-xs font-bold text-zinc-700 bg-zinc-100 border border-zinc-200 px-2.5 py-1 rounded-md">
                  {dropoffStops.length} طلبات
                </span>
              </div>

              {/* Master Delivery Action for All Orders */}
              <div className="bg-emerald-50/80 border border-emerald-300 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-emerald-700" />
                    <span>تأكيد تسليم كافة الطلبات (تسليم جماعي إضافي)</span>
                  </h3>
                  <p className="text-xs text-emerald-800">
                    يمكن للمندوب تأكيد تسليم كافة طلبات الكشف دفعة واحدة وتحصيل كامل المبالغ
                  </p>
                </div>

                {localBatchStatus === 'COMPLETED' || dropoffStops.every((d) => localDeliveredOrders[d.orderId]) ? (
                  <div className="inline-flex items-center gap-1.5 bg-white text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم تسليم كافة الطلبات بالكامل ✓</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isConfirmingAllDeliveries}
                    onClick={handleConfirmAllDeliveries}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs active:scale-95"
                  >
                    {isConfirmingAllDeliveries ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>جارٍ تأكيد تسليم الجميع...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>تأكيد تسليم جميع الطلبات دفعة واحدة ✓</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {dropoffStops.map((dropoff) => {
                  const isDelivered = Boolean(localDeliveredOrders[dropoff.orderId]);
                  return (
                    <div
                      key={dropoff.orderId}
                      className={`p-4 rounded-xl border transition space-y-3 ${
                        isDelivered
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between border-b border-zinc-100 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-zinc-900 font-mono">
                              #{dropoff.orderReference}
                            </span>
                            {isDelivered && (
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded">
                                تم التسليم ✓
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-zinc-700 block mt-0.5">
                            {dropoff.customerName}
                          </span>
                        </div>

                        {/* COD Amount */}
                        <div className="text-left">
                          <span className="text-[10px] text-zinc-400 block">المبلغ المطلوب</span>
                          <span
                            className={`text-sm sm:text-base font-black font-mono ${
                              dropoff.isPaid
                                ? 'text-zinc-400 line-through'
                                : isDelivered
                                ? 'text-emerald-700'
                                : 'text-zinc-900'
                            }`}
                            dir="ltr"
                          >
                            {dropoff.isPaid
                              ? '0.00 د.أ (مدفوع)'
                              : isDelivered
                              ? `تم تحصيل: ${filsToDisplay(dropoff.codAmountFils)}`
                              : filsToDisplay(dropoff.codAmountFils)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <a
                            href={`tel:${dropoff.customerPhone}`}
                            className="font-mono text-zinc-900 font-bold hover:underline"
                            dir="ltr"
                          >
                            {dropoff.customerPhone}
                          </a>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                          <span>{dropoff.city} — {dropoff.address}</span>
                        </div>
                        {dropoff.notes && (
                          <div className="p-1.5 bg-zinc-50 rounded text-[11px] text-zinc-600 border border-zinc-200">
                            {dropoff.notes}
                          </div>
                        )}
                      </div>

                      {/* Package codes & Confirm delivery button */}
                      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-1">
                          {dropoff.packageCodes.map((c) => (
                            <span
                              key={c}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 font-bold"
                            >
                              {c}
                            </span>
                          ))}
                        </div>

                        <div className="print:hidden">
                          {isDelivered ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>مكتمل ✓</span>
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
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs transition disabled:opacity-50 cursor-pointer"
                            >
                              {isConfirmingDelivery[dropoff.orderId] ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>جارٍ التأكيد...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>تأكيد التسليم ✓</span>
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

          <div className="p-4 bg-zinc-50 border-t border-zinc-200 text-center text-xs text-zinc-500">
            رَواق • كشف التوصيل والتنفيذ اللوجستي
          </div>
        </div>
      </div>
    </div>
  );
}
