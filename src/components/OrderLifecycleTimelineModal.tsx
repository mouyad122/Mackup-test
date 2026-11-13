'use client';

import React, { useEffect, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  User,
  Package,
  Truck,
  DollarSign,
  FileText,
  ShieldCheck,
  Send,
  Calendar,
  Store,
} from 'lucide-react';
import {
  getOrderAuditTimelineAction,
  OrderAuditTimelineEvent,
} from '@/actions/audit-timeline';
import { filsToDisplay } from '@/lib/money';

interface Props {
  orderReferenceOrId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function OrderLifecycleTimelineModal({
  orderReferenceOrId,
  isOpen,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    order: any;
    events: OrderAuditTimelineEvent[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !orderReferenceOrId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getOrderAuditTimelineAction(orderReferenceOrId)
      .then((res) => {
        if (!isMounted) return;
        if (!res.success) {
          setError(res.error || 'تعذر تحميل تاريخ الطلب');
        } else {
          setData({ order: res.order, events: res.events || [] });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'حدث خطأ أثناء تحميل السجل');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, orderReferenceOrId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans" dir="rtl">
      <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3F4832] text-white flex items-center justify-center shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-stone-900 font-mono">
                  تاريخ ودورة حياة الطلب #{orderReferenceOrId.replace(/^#/, '')}
                </h3>
                {data?.order && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {data.order.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                سجل الأحداث والعمليات المرتبطة بنفس الطلب مرتبة زمنياً من لحظة الشراء وحتى الإغلاق.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="py-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-stone-300 border-t-[#3F4832] rounded-full animate-spin mx-auto" />
            <p className="text-xs text-stone-500 font-medium">جاري تتبع وجمع كافة أحداث الطلب من السجل المركزي...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Order Meta Snapshot Card */}
        {!loading && data?.order && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-xs">
            <div>
              <span className="text-stone-400 text-[10px] block font-semibold">صاحبة الطلب</span>
              <strong className="text-stone-900 text-xs font-bold block truncate">
                {data.order.customerName}
              </strong>
              <span className="text-[10px] text-stone-400 font-mono" dir="ltr">
                {data.order.customerPhone || '—'}
              </span>
            </div>

            <div>
              <span className="text-stone-400 text-[10px] block font-semibold">القيمة الإجمالية</span>
              <strong className="text-[#3F4832] text-sm font-black font-mono block" dir="ltr">
                {filsToDisplay(data.order.totalAmountFils)}
              </strong>
              <span className="text-[10px] text-stone-500">
                {data.order.itemsCount} أصناف
              </span>
            </div>

            <div>
              <span className="text-stone-400 text-[10px] block font-semibold">حالة التجهيز</span>
              <strong className="text-stone-800 text-xs font-bold block">
                {data.order.fulfillmentStatus || '—'}
              </strong>
              <span className="text-[10px] text-stone-400">
                المرحلة اللوجستية
              </span>
            </div>

            <div>
              <span className="text-stone-400 text-[10px] block font-semibold">تاريخ الإنشاء</span>
              <strong className="text-stone-800 font-mono text-[11px] block">
                {new Date(data.order.createdAt).toLocaleDateString('ar-JO')}
              </strong>
              <span className="text-[10px] text-stone-400 font-mono" dir="ltr">
                {new Date(data.order.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}

        {/* Timeline Events List */}
        {!loading && data && data.events.length > 0 && (
          <div className="relative pl-2 pr-2 py-2 space-y-6 before:absolute before:top-4 before:bottom-4 before:right-6 before:w-0.5 before:bg-stone-200">
            {data.events.map((ev, idx) => {
              const isOrderCreation = ev.action === 'ORDER_CREATED';
              const isCancelled = ev.action === 'ORDER_CANCELLED';
              const isConfirmed = ev.action === 'ORDER_CONFIRMED';
              const isTelegram = ev.action.includes('TELEGRAM');
              const isDelivery = ev.action.includes('DELIVERY') || ev.action.includes('PICKUP');

              let badgeIcon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
              let dotBg = 'bg-emerald-500';

              if (isCancelled) {
                badgeIcon = <X className="w-4 h-4 text-rose-600" />;
                dotBg = 'bg-rose-500';
              } else if (isTelegram) {
                badgeIcon = <Send className="w-4 h-4 text-sky-600" />;
                dotBg = 'bg-sky-500';
              } else if (isConfirmed) {
                badgeIcon = <ShieldCheck className="w-4 h-4 text-[#3F4832]" />;
                dotBg = 'bg-[#3F4832]';
              } else if (isDelivery) {
                badgeIcon = <Truck className="w-4 h-4 text-amber-600" />;
                dotBg = 'bg-amber-500';
              }

              return (
                <div key={ev.id || idx} className="relative flex items-start gap-4 mr-1">
                  {/* Timeline Dot */}
                  <div className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs border-2 border-white ${
                    isCancelled ? 'bg-rose-100' : isConfirmed ? 'bg-emerald-100' : isTelegram ? 'bg-sky-100' : 'bg-stone-100'
                  }`}>
                    {badgeIcon}
                  </div>

                  {/* Event Content Card */}
                  <div className={`flex-1 rounded-2xl border p-4 shadow-2xs space-y-2 text-xs transition ${
                    isCancelled
                      ? 'bg-rose-50/50 border-rose-200 text-rose-950'
                      : isConfirmed
                      ? 'bg-emerald-50/40 border-emerald-200 text-stone-900'
                      : 'bg-white border-stone-200 text-stone-900'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-100 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-stone-900">
                          {idx + 1}. {ev.actionTitle}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-stone-100 text-stone-600">
                          {ev.category}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-stone-500 flex items-center gap-1.5" dir="ltr">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>
                          {new Intl.DateTimeFormat('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            day: '2-digit',
                            month: 'short',
                            timeZone: 'Asia/Amman',
                          }).format(new Date(ev.timestamp))}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] leading-relaxed">
                      <p className="text-stone-700 font-medium">
                        {ev.summary}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-500 pt-1 text-[10px]">
                        <span>
                          المنفذ: <strong className="text-stone-800">{ev.actorName}</strong> ({ev.actorType})
                        </span>
                        {ev.reason && (
                          <span className="text-rose-700 font-bold bg-rose-100/70 px-2 py-0.5 rounded-md">
                            السبب: {ev.reason}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Changes or Items Diff Table if Available */}
                    {ev.changes && (
                      <div className="mt-2 pt-2 border-t border-stone-100 text-[10px] font-mono bg-stone-50/70 p-2 rounded-xl">
                        {ev.changes.status && (
                          <div className="flex items-center gap-2">
                            <span className="text-stone-500">تغير الحالة:</span>
                            <span className="text-rose-700 font-bold">{ev.changes.status.before}</span>
                            <span>←</span>
                            <span className="text-emerald-700 font-bold">{ev.changes.status.after}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-900 text-white hover:bg-stone-800 px-5 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
