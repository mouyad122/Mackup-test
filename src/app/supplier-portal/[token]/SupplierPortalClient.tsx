'use client';

import { useState } from 'react';
import {
  updateFulfillmentFromPortalAction,
  reportSupplierItemShortageAction,
} from '@/actions/supplier-portal';
import { SUPPLIER_STATUS_MAP } from '@/lib/fulfillment/types';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Play,
  Check,
  Send,
  Loader2,
  Eye,
  ArrowRight,
  X,
} from 'lucide-react';

interface Props {
  token: string;
  initialData: any;
}

export default function SupplierPortalClient({ token, initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [loadingOrder, setLoadingOrder] = useState<string | null>(null);
  const [issueInputs, setIssueInputs] = useState<Record<string, string>>({});
  const [showIssueBox, setShowIssueBox] = useState<Record<string, boolean>>({});
  const [activeItemShortage, setActiveItemShortage] = useState<string | null>(null);
  const [itemMissingQty, setItemMissingQty] = useState<Record<string, number>>({});
  const [itemMissingReason, setItemMissingReason] = useState<Record<string, string>>({});
  const [submittingItemShortage, setSubmittingItemShortage] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    productTitle: string;
    variantTitle?: string;
    allImages?: string[];
  } | null>(null);

  const handleItemShortageSubmit = async (orderId: string, itemId: string, maxQty: number) => {
    try {
      setSubmittingItemShortage(true);
      const qty = itemMissingQty[itemId] || maxQty || 1;
      const reason = itemMissingReason[itemId] || 'المنتج غير متوفر في المستودع';

      const res = await reportSupplierItemShortageAction(token, itemId, qty, reason);
      if (!res.success) {
        alert((res as any).error || 'تعذر تسجيل النقص');
        return;
      }

      // تحديث الحالة محلياً
      setData((prev: any) => ({
        ...prev,
        fulfillmentOrders: prev.fulfillmentOrders.map((f: any) =>
          f.id === orderId
            ? {
                ...f,
                status: 'ISSUE_REPORTED',
                issueReason: `نقص صنف: كمية (${qty}) - ${reason}`,
                items: f.items.map((it: any) =>
                  it.id === itemId
                    ? {
                        ...it,
                        isOutOfStock: true,
                        outOfStockQuantity: qty,
                        outOfStockReason: reason,
                      }
                    : it
                ),
              }
            : f
        ),
      }));

      setActiveItemShortage(null);
      alert('تم إشعار إدارة رَواق بالنقص لتعديل الطلب والفاتورة.');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    } finally {
      setSubmittingItemShortage(false);
    }
  };

  const handleAction = async (
    orderId: string,
    action: 'START' | 'READY' | 'REPORT_ISSUE'
  ) => {
    try {
      setLoadingOrder(orderId);
      // كل طلب يعامل كطرد واحد تلقائياً من كل محل
      const pkgCount = 1;
      const issueReason = issueInputs[orderId];

      const res = await updateFulfillmentFromPortalAction(token, orderId, action, {
        packagesCount: pkgCount,
        issueReason,
      });

      if (!res.success) {
        alert((res as any).error || 'حدث خطأ');
        return;
      }

      const updatedStatus = (res as any).status;

      // تحديث الحالة محلياً
      setData((prev: any) => ({
        ...prev,
        fulfillmentOrders: prev.fulfillmentOrders.map((f: any) =>
          f.id === orderId
            ? {
                ...f,
                status: updatedStatus,
                packagesCount: action === 'READY' ? pkgCount : f.packagesCount,
                issueReason: action === 'REPORT_ISSUE' ? issueReason : f.issueReason,
              }
            : f
        ),
      }));

      if (action === 'REPORT_ISSUE') {
        setShowIssueBox((prev) => ({ ...prev, [orderId]: false }));
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    } finally {
      setLoadingOrder(null);
    }
  };

  const orders = data.fulfillmentOrders;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">طلبات التجهيز المسندة لمحلكم</h2>
            <p className="text-xs text-amber-100 mt-1">
              إجمالي الطلبات المطلوب متابعتها: {orders.length}
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-zinc-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-900">لا توجد طلبات جديدة حالياً</h3>
          <p className="text-xs text-zinc-500 mt-1">
            تم تجهيز كافة الطلبات بنجاح. ستظهر لك الطلبات الجديدة فور اعتمادها.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((f: any) => {
            const meta = SUPPLIER_STATUS_MAP[f.status] || {
              label: f.status,
              badgeBg: 'bg-zinc-100',
              badgeText: 'text-zinc-800',
              borderClass: 'border-zinc-300',
            };
            const isLoading = loadingOrder === f.id;

            return (
              <div
                key={f.id}
                className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Top Card Bar */}
                <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-zinc-900">
                      طلب #{f.orderReference}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${meta.badgeBg} ${meta.badgeText} ${meta.borderClass}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {new Date(f.createdAt).toLocaleDateString('ar-JO')}
                  </div>
                </div>

                {/* Location Bar */}
                <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-100 flex items-center gap-1.5 text-xs text-zinc-600">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  <span className="font-medium text-zinc-700">موقع استلام المندوب من المحل:</span>
                  <span className="truncate">{f.location.label}</span>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-3">
                  <div className="text-xs font-bold text-zinc-700">المنتجات المطلوب تجهيزها:</div>
                  <div className="space-y-2">
                    {f.items.map((item: any) => {
                      const isItemShort = item.isOutOfStock || (item.outOfStockQuantity && item.outOfStockQuantity > 0);
                      const isReportingThis = activeItemShortage === item.id;
                      const canReport = f.status === 'IN_PREPARATION' || f.status === 'NOTIFIED' || f.status === 'DRAFT';

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all ${
                            isItemShort
                              ? 'bg-rose-50/60 border-rose-200'
                              : 'bg-zinc-50 border-zinc-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm font-bold text-zinc-800 flex items-center gap-2">
                                <span className={isItemShort ? 'line-through text-zinc-400' : ''}>
                                  {item.productTitle}
                                </span>
                                {isItemShort && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                    مسجل كنقص (× {item.outOfStockQuantity || item.quantity})
                                  </span>
                                )}
                              </div>
                              {item.variantTitle && (
                                <div className="text-xs text-zinc-500 mt-0.5">
                                  المقاس / المتغير: {item.variantTitle}
                                </div>
                              )}
                            </div>
                            <div className="text-left">
                              <span className="text-xs text-zinc-500 block">الكمية</span>
                              <span className={`text-base font-extrabold ${isItemShort ? 'text-rose-600 line-through' : 'text-amber-600'}`}>
                                × {item.quantity}
                              </span>
                            </div>
                          </div>

                          {/* Image preview button if image exists */}
                          {item.imageUrl && (
                            <div className="mt-2.5 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewImageModal({
                                    isOpen: true,
                                    imageUrl: item.imageUrl,
                                    productTitle: item.productTitle,
                                    variantTitle: item.variantTitle,
                                    allImages: item.images && item.images.length > 0 ? item.images : [item.imageUrl],
                                  })
                                }
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition active:scale-95 shadow-2xs cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-amber-700" />
                                <span>عرض صورة المنتج 📷</span>
                              </button>
                            </div>
                          )}

                          {/* Reason note if already short */}
                          {isItemShort && item.outOfStockReason && (
                            <div className="mt-2 text-[11px] text-rose-700 bg-white/80 p-2 rounded-lg border border-rose-150">
                              سبب النقص: {item.outOfStockReason}
                            </div>
                          )}

                          {/* Shortage Reporting Action for Supplier */}
                          {canReport && !isItemShort && (
                            <div className="mt-2 pt-2 border-t border-zinc-200/60 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setActiveItemShortage(isReportingThis ? null : item.id)}
                                className="text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1"
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>{isReportingThis ? 'إلغاء' : 'إبلاغ عن نقص في هذه القطعة'}</span>
                              </button>
                            </div>
                          )}

                          {/* Inline reporting box */}
                          {isReportingThis && (
                            <div className="mt-3 p-3 bg-white rounded-xl border border-rose-200 space-y-2.5">
                              <div className="text-xs font-bold text-rose-900">
                                تحديد تفاصيل النقص لقطعة ({item.productTitle}):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                                    الكمية الناقصة:
                                  </label>
                                  <select
                                    value={itemMissingQty[item.id] || item.quantity}
                                    onChange={(e) =>
                                      setItemMissingQty({
                                        ...itemMissingQty,
                                        [item.id]: parseInt(e.target.value),
                                      })
                                    }
                                    className="w-full text-xs p-1.5 border border-zinc-200 rounded-lg bg-zinc-50"
                                  >
                                    {Array.from({ length: item.quantity }, (_, i) => i + 1).map((q) => (
                                      <option key={q} value={q}>
                                        {q} قطعة
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[11px] font-bold text-zinc-600 block mb-1">
                                    السبب:
                                  </label>
                                  <select
                                    value={itemMissingReason[item.id] || 'نفدت الكمية من المستودع'}
                                    onChange={(e) =>
                                      setItemMissingReason({
                                        ...itemMissingReason,
                                        [item.id]: e.target.value,
                                      })
                                    }
                                    className="w-full text-xs p-1.5 border border-zinc-200 rounded-lg bg-zinc-50"
                                  >
                                    <option value="نفدت الكمية من المستودع">نفدت الكمية من المستودع</option>
                                    <option value="القطعة تالفة أو بها عيب مصنعي">القطعة تالفة أو بها عيب مصنعي</option>
                                    <option value="المقاس أو اللون المطلوب غير متوفر">المقاس أو اللون المطلوب غير متوفر</option>
                                    <option value="تأخر توفر الشحنة">تأخر توفر الشحنة</option>
                                  </select>
                                </div>
                              </div>
                              <button
                                type="button"
                                disabled={submittingItemShortage}
                                onClick={() => handleItemShortageSubmit(f.id, item.id, item.quantity)}
                                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                              >
                                {submittingItemShortage ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                                <span>إرسال إشعار النقص للإدارة لتعديل الفاتورة</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Issues reported notice */}
                  {f.status === 'ISSUE_REPORTED' && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <div className="font-bold">تم إرسال إشعار نقص للإدارة</div>
                        <div className="mt-0.5">{f.issueReason}</div>
                      </div>
                    </div>
                  )}

                  {/* Packages generated notice */}
                  {f.packages && f.packages.length > 0 && (
                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-zinc-600">رمز الطرد للتسليم:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {f.packages.map((pkg: any) => (
                          <span
                            key={pkg.id}
                            className="text-xs font-mono bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-0.5 rounded-md font-bold"
                          >
                            {pkg.packageCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-zinc-50 border-t border-zinc-100 space-y-3">
                  {f.status === 'NOTIFIED' || f.status === 'DRAFT' ? (
                    <button
                      onClick={() => handleAction(f.id, 'START')}
                      disabled={isLoading}
                      className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      <span>بدء تجهيز الطلب</span>
                    </button>
                  ) : null}

                  {f.status === 'IN_PREPARATION' ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAction(f.id, 'READY')}
                          disabled={isLoading}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          <span>الطلب جاهز للاستلام</span>
                        </button>

                        <button
                          onClick={() =>
                            setShowIssueBox({
                              ...showIssueBox,
                              [f.id]: !showIssueBox[f.id],
                            })
                          }
                          className="px-3 py-2.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                        >
                          إبلاغ عن نقص
                        </button>
                      </div>

                      {showIssueBox[f.id] && (
                        <div className="p-3 bg-white border border-rose-200 rounded-xl space-y-2 mt-2">
                          <label className="text-xs font-bold text-rose-800 block">
                            اكتب سبب النقص أو اسم القطعة غير المتوفرة:
                          </label>
                          <textarea
                            rows={2}
                            value={issueInputs[f.id] || ''}
                            onChange={(e) =>
                              setIssueInputs({
                                ...issueInputs,
                                [f.id]: e.target.value,
                              })
                            }
                            placeholder="مثال: مقاس L غير متوفر في المستودع..."
                            className="w-full text-xs p-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                          <button
                            onClick={() => handleAction(f.id, 'REPORT_ISSUE')}
                            disabled={isLoading || !issueInputs[f.id]}
                            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>إرسال التنبيه للإدارة</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {f.status === 'READY_FOR_PICKUP' ? (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-900">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="font-bold">
                          تم تجهيز الطلب وهو جاهز للاستلام وبانتظار حضور المندوب
                        </span>
                      </div>
                      <span className="font-bold bg-white px-2.5 py-1 rounded-lg text-purple-700 border border-purple-200 whitespace-nowrap">
                        جاهز للاستلام ✅
                      </span>
                    </div>
                  ) : null}

                  {f.status === 'PICKED_UP' ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>تم تسليم الطرد للمندوب وتوثيق الخروج بنجاح ✅</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Image Modal for Supplier (Mobile-Friendly with Back Button) */}
      {previewImageModal?.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl border border-zinc-200 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Top Header with Back / Return Button */}
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition shadow-xs active:scale-95 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>رجوع للقائمة</span>
              </button>

              <div className="text-start pe-2">
                <h4 className="text-xs sm:text-sm font-black text-zinc-900 truncate max-w-[200px]">
                  {previewImageModal.productTitle}
                </h4>
                {previewImageModal.variantTitle && (
                  <p className="text-[11px] text-zinc-500">{previewImageModal.variantTitle}</p>
                )}
              </div>
            </div>

            {/* Main Image Display */}
            <div className="relative flex-1 min-h-[300px] sm:min-h-[380px] bg-zinc-100 flex items-center justify-center p-4 overflow-hidden">
              <img
                src={previewImageModal.imageUrl}
                alt={previewImageModal.productTitle}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-xs"
              />
            </div>

            {/* Thumbnail selector if multiple images */}
            {previewImageModal.allImages && previewImageModal.allImages.length > 1 && (
              <div className="p-3 bg-zinc-50 border-t border-zinc-100 flex items-center justify-center gap-2 overflow-x-auto">
                {previewImageModal.allImages.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>
                      setPreviewImageModal((prev) => (prev ? { ...prev, imageUrl: img } : null))
                    }
                    className={`w-12 h-12 rounded-lg border-2 overflow-hidden shrink-0 transition cursor-pointer ${
                      previewImageModal.imageUrl === img
                        ? 'border-amber-500 scale-105'
                        : 'border-zinc-200 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Footer with Back Button */}
            <div className="p-3 bg-white border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>إغلاق والرجوع للطلبات</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
