'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Store,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ExternalLink,
  Phone,
  MapPin,
  MessageCircle,
  Truck,
  Copy,
  Check,
  Search,
  Sparkles,
  X,
  XCircle,
  ArrowRight,
  Filter,
  Eye,
  FileText,
  DollarSign,
  User,
  PlusCircle,
} from 'lucide-react';
import { filsToDisplay } from '@/lib/money';
import {
  ShopOperationsData,
  batchConfirmShopPackagesPickupAction,
  createShopMasterSessionLinkAction,
  generateShopPickupManifestAction,
  getShopOperationsHubDataAction,
} from '@/actions/shop-orders-hub';
import {
  removeShortageOrderItemAction,
  replaceShortageOrderItemAction,
  searchProductsForReplacementAction,
  searchProductsForCatalogAction,
  addOrderItemAction,
  cancelUnifiedOrderAction,
  createSupplierSessionForOrderAction,
} from '@/actions/unified-orders';

interface Props {
  initialData: ShopOperationsData;
}

export default function ShopOperationsClient({ initialData }: Props) {
  const [data, setData] = useState<ShopOperationsData>(initialData);
  const [selectedShopId, setSelectedShopId] = useState<string>(
    initialData.shops[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SHORTAGES' | 'READY' | 'PREPARING'>('ALL');
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [selectedOrderModal, setSelectedOrderModal] = useState<any | null>(null);
  const [masterSessionModal, setMasterSessionModal] = useState<any | null>(null);
  const [pickupManifestModal, setPickupManifestModal] = useState<any | null>(null);
  const [replacementModalItem, setReplacementModalItem] = useState<any | null>(null);
  const [replacementSearchQuery, setReplacementSearchQuery] = useState('');
  const [replacementSearchResults, setReplacementSearchResults] = useState<any[]>([]);
  const [isSearchingReplacements, setIsSearchingReplacements] = useState(false);
  const [selectedReplacementVariant, setSelectedReplacementVariant] = useState<any | null>(null);
  const [replacementQuantity, setReplacementQuantity] = useState(1);
  const [replacementAdjustmentNote, setReplacementAdjustmentNote] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Add Product to Order / Invoice State
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addItemSearchQuery, setAddItemSearchQuery] = useState('');
  const [addItemSearchResults, setAddItemSearchResults] = useState<any[]>([]);
  const [isSearchingAddItem, setIsSearchingAddItem] = useState(false);
  const [selectedAddItemVariant, setSelectedAddItemVariant] = useState<any | null>(null);
  const [addItemQuantity, setAddItemQuantity] = useState(1);
  const [addItemCustomPrice, setAddItemCustomPrice] = useState<string>('');
  const [addItemAdjustmentNote, setAddItemAdjustmentNote] = useState('');
  const [isSubmittingAddItem, setIsSubmittingAddItem] = useState(false);

  // Cancel order modal
  const [cancelPromptModal, setCancelPromptModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderReference: string;
    message?: string;
  } | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  const [copiedText, setCopiedText] = useState(false);

  const refreshData = async () => {
    const updated = await getShopOperationsHubDataAction();
    setData(updated);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filter shops
  const filteredShops = data.shops.filter((shop) => {
    const matchesSearch =
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.ownerName && shop.ownerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (shop.phone && shop.phone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === 'SHORTAGES') return shop.counts.shortageAlerts > 0;
    if (statusFilter === 'READY') return shop.counts.readyPackages > 0;
    if (statusFilter === 'PREPARING') return shop.counts.preparingOrders > 0;
    return true;
  });

  const selectedShop =
    data.shops.find((s) => s.id === selectedShopId) || filteredShops[0] || null;

  // Master Session Link for Shop
  const handleGenerateShopSession = async (supplierId: string, fulfillmentOrderId?: string) => {
    try {
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      let res: any;
      if (fulfillmentOrderId) {
        res = await createSupplierSessionForOrderAction(supplierId, fulfillmentOrderId, clientOrigin);
      } else {
        res = await createShopMasterSessionLinkAction(supplierId, clientOrigin);
      }
      if (!res.success) {
        alert(res.error || 'تعذر إصدار رابط التجهيز');
        return;
      }
      setMasterSessionModal(res);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    }
  };

  // Courier Pickup Manifest for Shop
  const handleGeneratePickupManifest = async (supplierId: string) => {
    try {
      const res = await generateShopPickupManifestAction(supplierId);
      setPickupManifestModal(res);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    }
  };

  // Batch Confirm Pickup for Shop
  const handleBatchConfirmPickup = async (codes: string[]) => {
    if (!codes || codes.length === 0) return;
    if (!confirm(`هل أنت متأكد من تأكيد استلام ${codes.length} طرد من هذا المحل؟`)) return;

    startTransition(async () => {
      const res = await batchConfirmShopPackagesPickupAction(codes);
      if (!res.success) {
        alert(res.error || 'تعذر تأكيد الاستلام');
        return;
      }
      await refreshData();
      alert(`تم بنجاح تأكيد استلام ${codes.length} طرد.`);
    });
  };

  // Handle Remove Shortage Item from Shop View
  const handleRemoveShortageItem = async (
    orderId: string,
    orderReference: string,
    orderItemId: string,
    itemName: string
  ) => {
    if (!confirm(`هل أنت متأكد من حذف صنف (${itemName}) من الطلب #${orderReference} وتعديل الفاتورة؟`))
      return;

    setIsSubmittingAdjustment(true);
    try {
      const res = await removeShortageOrderItemAction(orderId, orderItemId);
      if (!res.success) {
        const errMsg = (res as any).error || 'تعذر حذف الصنف';
        if (errMsg.includes('لا يمكن حذف كافة أصناف الطلب')) {
          setCancelPromptModal({
            isOpen: true,
            orderId,
            orderReference,
            message: 'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.',
          });
          return;
        }
        alert(errMsg);
        return;
      }
      await refreshData();
      if (res.rewardStatus === 'REVOKED_BELOW_THRESHOLD') {
        alert(
          `تم استبعاد (${itemName}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.\n\n` +
          `⚠️ تنبيه الأمان المالي: تم إلغاء التوصيل المجاني واحتساب رسوم التوصيل (${filsToDisplay(res.restoredShippingFee || 2000)}) تلقائياً لانخفاض قيمة الطلب عن الحد الأدنى.`
        );
      } else {
        alert(`تم استبعاد (${itemName}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.`);
      }
    } catch (err: any) {
      if (err.message?.includes('لا يمكن حذف كافة أصناف الطلب')) {
        setCancelPromptModal({
          isOpen: true,
          orderId,
          orderReference,
          message: 'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.',
        });
        return;
      }
      alert(err.message || 'حدث خطأ');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  // Replacement handlers
  const handleSearchReplacements = async (q: string) => {
    setReplacementSearchQuery(q);
    if (q.trim().length < 2) {
      setReplacementSearchResults([]);
      return;
    }
    setIsSearchingReplacements(true);
    try {
      const results = await searchProductsForReplacementAction(q);
      setReplacementSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingReplacements(false);
    }
  };

  const handleConfirmReplacement = async () => {
    if (!replacementModalItem || !selectedReplacementVariant) return;

    setIsSubmittingAdjustment(true);
    try {
      const res = await replaceShortageOrderItemAction(
        replacementModalItem.orderId,
        replacementModalItem.id,
        selectedReplacementVariant.variantId,
        replacementQuantity,
        replacementAdjustmentNote
      );
      if (!res.success) {
        alert((res as any).error || 'تعذر استبدال الصنف');
        return;
      }
      setReplacementModalItem(null);
      setSelectedReplacementVariant(null);
      setReplacementSearchResults([]);
      setReplacementAdjustmentNote('');
      await refreshData();
      alert(`تم استبدال الصنف بالبديل (${res.replacedWith}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  const handleSearchAddItem = async (q: string) => {
    setAddItemSearchQuery(q);
    if (q.trim().length < 2) {
      setAddItemSearchResults([]);
      return;
    }
    setIsSearchingAddItem(true);
    try {
      const results = await searchProductsForCatalogAction(q);
      setAddItemSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearchingAddItem(false);
    }
  };

  const handleConfirmAddItem = async () => {
    if (!selectedOrderModal || !selectedAddItemVariant) return;

    setIsSubmittingAddItem(true);
    try {
      const customPriceFils =
        addItemCustomPrice && !isNaN(parseFloat(addItemCustomPrice))
          ? Math.round(parseFloat(addItemCustomPrice) * 1000)
          : undefined;

      const res = await addOrderItemAction({
        orderId: selectedOrderModal.id,
        variantId: selectedAddItemVariant.variantId,
        quantity: addItemQuantity,
        customUnitPriceFils: customPriceFils,
        adjustmentNote: addItemAdjustmentNote,
      });

      if (!res.success) {
        alert((res as any).error || 'تعذر إضافة المنتج للطلب');
        return;
      }

      setAddItemModalOpen(false);
      setSelectedAddItemVariant(null);
      setAddItemSearchResults([]);
      setAddItemSearchQuery('');
      setAddItemAdjustmentNote('');
      setAddItemCustomPrice('');
      setAddItemQuantity(1);

      // Re-fetch data and close order modal so fresh data is visible
      await refreshData();
      setSelectedOrderModal(null);

      alert(`تمت إضافة (${res.addedProduct}) للطلب والفاتورة بنجاح. الإجمالي الجديد: ${filsToDisplay(res.newTotal)}.`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إضافة المنتج');
    } finally {
      setIsSubmittingAddItem(false);
    }
  };

  // Confirm cancel order
  const handleConfirmCancelOrder = async (orderId: string) => {
    setIsCancellingOrder(true);
    try {
      const res = await cancelUnifiedOrderAction(orderId, 'إلغاء الطلب بعد نقص الصنف الأخير في المحل');
      if (!res.success) {
        alert(res.error || 'تعذر إلغاء الطلب');
        return;
      }
      setCancelPromptModal(null);
      await refreshData();
      alert('تم إلغاء الطلب بنجاح وتحديث كافة الحسابات والطرود.');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إلغاء الطلب');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const readyPackages = selectedShop
    ? selectedShop.fulfillmentOrders.flatMap((fo) =>
        fo.packages
          .filter((p: any) => p.status === 'READY_FOR_PICKUP')
          .map((p: any) => ({
            ...p,
            orderReference: fo.order.reference,
            customerName: fo.order.customerName,
            city: fo.order.deliveryJob?.city || fo.order.shippingZoneNameSnapshot || 'عمان',
          }))
      )
    : [];

  return (
    <div className="space-y-6" dir="rtl">
      {/* 1. Header Navigation Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#3F4832] text-white flex items-center justify-center font-bold text-sm">
              ر
            </span>
            <h1 className="text-xl font-black text-stone-900 tracking-tight">
              أوامر تجهيز المحلات والطرود (Shop Operations Hub)
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            إدارة ومتابعة تجهيز طرود المحلات • استعراض تفاصيل الطلبات الكاملة • روابط التجهيز وكشوفات الاستلام
          </p>
        </div>

        {/* Global Page Switcher */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200">
          <Link
            href="/admin/orders"
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 transition flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5" />
            <span>مركز الطلبات</span>
          </Link>
          <div className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-[#3F4832] shadow-xs border border-stone-200 flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            <span>تجهيز المحلات والطرود (نشط)</span>
          </div>
        </div>
      </div>

      {/* 2. Top KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'ALL'
              ? 'bg-stone-50 border-stone-400 ring-2 ring-stone-400'
              : 'bg-white border-stone-200 hover:border-stone-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>المحلات النشطة</span>
            <Store className="w-4 h-4 text-stone-600" />
          </div>
          <div className="text-2xl font-black text-stone-900 font-mono mt-2">
            {String(data.kpis.activeShopsCount).padStart(2, '0')}
          </div>
          <span className="text-[11px] text-stone-600 mt-1 block">لديها أوامر تجهيز مفتوحة</span>
        </button>

        <button
          onClick={() => setStatusFilter('SHORTAGES')}
          className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'SHORTAGES'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400'
              : 'bg-white border-stone-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>بلاغات النقص</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-900 font-mono mt-2">
            {String(data.kpis.shortageAlertsCount).padStart(2, '0')}
          </div>
          <span className="text-[11px] text-rose-700 mt-1 block">تحتاج استبدال أو تعديل الفاتورة</span>
        </button>

        <button
          onClick={() => setStatusFilter('READY')}
          className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'READY'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400'
              : 'bg-white border-stone-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>طرود جاهزة للاستلام</span>
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono mt-2">
            {String(data.kpis.readyPackagesCount).padStart(2, '0')}
          </div>
          <span className="text-[11px] text-emerald-700 mt-1 block">جاهزة لسيارات التوصيل</span>
        </button>

        <button
          onClick={() => setStatusFilter('PREPARING')}
          className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
            statusFilter === 'PREPARING'
              ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-400'
              : 'bg-white border-stone-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>قيد التجهيز</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono mt-2">
            {String(data.kpis.preparingOrdersCount).padStart(2, '0')}
          </div>
          <span className="text-[11px] text-blue-700 mt-1 block">لدى المحلات لم تغلف بعد</span>
        </button>
      </div>

      {/* 3. Main Operational Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Shops List Feed (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
              <Store className="w-4 h-4 text-[#3F4832]" />
              <span>المحلات ({filteredShops.length})</span>
            </div>
            {statusFilter !== 'ALL' && (
              <button
                onClick={() => setStatusFilter('ALL')}
                className="text-[11px] text-stone-400 hover:text-stone-700 font-bold underline"
              >
                عرض الكل
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المحل أو المسؤول أو الهاتف..."
              className="w-full pr-9 pl-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#3F4832]"
            />
          </div>

          {/* Shops Feed */}
          {filteredShops.length === 0 ? (
            <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
              لا توجد محلات تطابق الفلتر الحالي.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-0.5">
              {filteredShops.map((shop) => {
                const isSelected = shop.id === selectedShop?.id;
                const hasIssues = shop.counts.shortageAlerts > 0;
                const hasReady = shop.counts.readyPackages > 0;

                return (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShopId(shop.id)}
                    className={`w-full text-right p-3.5 rounded-2xl border transition flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-stone-50 border-[#3F4832] ring-2 ring-[#3F4832]/30 shadow-xs'
                        : 'bg-white border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-stone-900">
                          {shop.name}
                        </span>
                        {shop.ownerName && (
                          <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                            {shop.ownerName}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono font-bold text-stone-500">
                        {shop.counts.totalActiveOrders} طلبات
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 truncate w-full">
                      📍 {shop.address}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {hasIssues && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{shop.counts.shortageAlerts} نقص</span>
                        </span>
                      )}
                      {hasReady && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{shop.counts.readyPackages} طرد جاهز</span>
                        </span>
                      )}
                      {shop.counts.preparingOrders > 0 && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {shop.counts.preparingOrders} قيد التجهيز
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Shop Workspace & Orders (8 Cols) */}
        <div className="lg:col-span-8 space-y-5">
          {!selectedShop ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400 text-xs shadow-xs">
              اختر محلاً من القائمة لمتابعة أوامر تجهيزه وطروده.
            </div>
          ) : (
            <>
              {/* Selected Shop Profile Header */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black text-stone-900">
                        {selectedShop.name}
                      </h2>
                      {selectedShop.ownerName && (
                        <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-md border border-stone-200">
                          المسؤول: {selectedShop.ownerName}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500 mt-1">
                      {selectedShop.phone && (
                        <a
                          href={`tel:${selectedShop.phone}`}
                          className="hover:underline font-mono text-stone-700 font-bold"
                        >
                          📞 {selectedShop.phone}
                        </a>
                      )}
                      <span>•</span>
                      <span>🏠 {selectedShop.address}</span>
                      {selectedShop.mapLocationUrl && (
                        <>
                          <span>•</span>
                          <a
                            href={selectedShop.mapLocationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-bold underline flex items-center gap-0.5"
                          >
                            <span>موقع المحل على الخريطة 📍</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions for this shop */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleGenerateShopSession(selectedShop.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>إرسال رابط التجهيز الموحد عبر واتساب 💬</span>
                    </button>

                    <button
                      onClick={() => handleGeneratePickupManifest(selectedShop.id)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white transition flex items-center gap-1.5 shadow-xs"
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>كشف المندوب للمحل</span>
                    </button>
                  </div>
                </div>

                {/* Quick Shop Summary Ribbon */}
                <div className="grid grid-cols-3 gap-3 text-center bg-stone-50 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-stone-400 block text-[11px]">إجمالي الأوامر</span>
                    <span className="font-extrabold text-stone-900 text-sm mt-0.5 block">
                      {selectedShop.counts.totalActiveOrders}
                    </span>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-bold block text-[11px]">
                      طرود جاهزة للاستلام
                    </span>
                    <span className="font-extrabold text-emerald-900 text-sm mt-0.5 block font-mono">
                      {selectedShop.counts.readyPackages}
                    </span>
                  </div>
                  <div>
                    <span className="text-rose-700 font-bold block text-[11px]">
                      بلاغات نقص
                    </span>
                    <span className="font-extrabold text-rose-900 text-sm mt-0.5 block font-mono">
                      {selectedShop.counts.shortageAlerts}
                    </span>
                  </div>
                </div>

                {readyPackages.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-600 font-medium">
                      يوجد {readyPackages.length} طرد معلن كجاهز للاستلام من هذا المحل
                    </span>
                    <button
                      onClick={() =>
                        handleBatchConfirmPickup(readyPackages.map((p) => p.packageCode))
                      }
                      disabled={isPending}
                      className="px-4 py-2 bg-[#3F4832] hover:bg-[#2e3524] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>تأكيد استلام كافة طرود المحل دفعة واحدة ({readyPackages.length})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* CORE SECTION: أوامر تجهيز المحلات والطرود (SHOP FULFILLMENT ORDERS) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#3F4832]" />
                    <h3 className="text-base font-black text-stone-900">
                      أوامر تجهيز المحل والطرود ({selectedShop.fulfillmentOrders.length})
                    </h3>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">
                    يمكنك استعراض تفاصيل أي طلب بالكامل بالنقر على &quot;عرض تفاصيل الطلب&quot;
                  </span>
                </div>

                {selectedShop.fulfillmentOrders.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center text-xs text-stone-400">
                    لا توجد أوامر تجهيز مفتوحة لهذا المحل حالياً.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedShop.fulfillmentOrders.map((fOrder: any) => {
                      const isReady =
                        fOrder.status === 'READY_FOR_PICKUP' || fOrder.status === 'PICKED_UP';
                      const isIssue = fOrder.status === 'ISSUE_REPORTED';

                      return (
                        <div
                          key={fOrder.id}
                          className="bg-white border border-stone-200 rounded-3xl p-5 shadow-xs space-y-4 transition"
                        >
                          {/* Order Card Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-base text-stone-900 font-mono">
                                  طلب #{fOrder.order.reference}
                                </span>
                                <span
                                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                    fOrder.status === 'PICKED_UP'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : isReady
                                      ? 'bg-purple-100 text-purple-900'
                                      : isIssue
                                      ? 'bg-rose-100 text-rose-900'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {fOrder.status === 'PICKED_UP'
                                    ? 'تم الاستلام من المحل'
                                    : isReady
                                    ? 'جاهز للاستلام 🚚'
                                    : isIssue
                                    ? '⚠️ بلاغ نقص'
                                    : 'قيد التجهيز'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-600">
                                <span>
                                  العميلة: <strong>{fOrder.order.customerName}</strong>
                                </span>
                                <span>•</span>
                                <span className="font-mono">{fOrder.order.customerPhone}</span>
                                <span>•</span>
                                <span>
                                  📍 {fOrder.order.deliveryJob?.city || fOrder.order.shippingZoneNameSnapshot || 'عمان'}
                                  {fOrder.order.deliveryJob?.area ? ` (${fOrder.order.deliveryJob.area})` : ''}
                                </span>
                                <span>•</span>
                                <span className="font-bold text-[#3F4832] font-mono" dir="ltr">
                                  الإجمالي: {filsToDisplay(fOrder.order.totalAmount)}
                                </span>
                              </div>
                            </div>

                            {/* View Full Order Details Button */}
                            <button
                              onClick={() => setSelectedOrderModal(fOrder.order)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-800 transition flex items-center justify-center gap-1.5 shrink-0 shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5 text-[#3F4832]" />
                              <span>عرض تفاصيل الطلب الكاملة</span>
                            </button>
                          </div>

                          {/* Items assigned to this shop */}
                          <div className="bg-stone-50/80 rounded-2xl p-3.5 border border-stone-200/80 space-y-2">
                            <span className="text-[11px] font-bold text-stone-600 block">
                              الأصناف المسندة لهذا المحل في هذا الطلب:
                            </span>

                            <div className="space-y-1.5">
                              {fOrder.items?.map((it: any) => {
                                const isShortage = it.isOutOfStock;
                                return (
                                  <div
                                    key={it.id}
                                    className={`flex items-center justify-between p-2 rounded-xl border text-xs ${
                                      isShortage
                                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                                        : 'bg-white border-stone-200 text-stone-800'
                                    }`}
                                  >
                                    <div>
                                      <span className="font-bold">
                                        • {it.productName}
                                      </span>
                                      {isShortage && it.outOfStockReason && (
                                        <p className="text-[10px] text-rose-700 mt-0.5">
                                          سبب النقص: {it.outOfStockReason}
                                        </p>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                      <span className="font-bold font-mono text-sm">
                                        x{it.quantity}
                                      </span>

                                      {isShortage && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled={isSubmittingAdjustment}
                                            onClick={() =>
                                              handleRemoveShortageItem(
                                                fOrder.order.id,
                                                fOrder.order.reference,
                                                it.orderItemId,
                                                it.productName
                                              )
                                            }
                                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition"
                                          >
                                            حذف وتعديل
                                          </button>
                                          <button
                                            type="button"
                                            disabled={isSubmittingAdjustment}
                                            onClick={() => {
                                              setReplacementModalItem({
                                                ...it,
                                                orderId: fOrder.order.id,
                                                id: it.orderItemId,
                                                name: it.productName,
                                              });
                                              setReplacementQuantity(it.quantity);
                                              setSelectedReplacementVariant(null);
                                              setReplacementSearchResults([]);
                                              setReplacementSearchQuery('');
                                            }}
                                            className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-[#3F4832] text-white hover:bg-[#2d3424] transition"
                                          >
                                            استبدال
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Packages & Quick Actions Bar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <div className="flex items-center gap-2">
                              {fOrder.packages?.length > 0 ? (
                                fOrder.packages.map((pkg: any) => (
                                  <div
                                    key={pkg.id}
                                    className="flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-mono"
                                  >
                                    <span className="font-bold text-stone-900">
                                      {pkg.packageCode}
                                    </span>
                                    <span className="text-[10px] text-stone-500">
                                      ({pkg.status})
                                    </span>
                                    {pkg.status !== 'PICKED_UP' && (
                                      <button
                                        onClick={() =>
                                          handleBatchConfirmPickup([pkg.packageCode])
                                        }
                                        disabled={isPending}
                                        className="text-[10px] font-bold bg-[#3F4832] text-white px-2 py-0.5 rounded-md hover:bg-[#2e3524] transition"
                                      >
                                        تأكيد الاستلام
                                      </button>
                                    )}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-stone-400">
                                  بانتظار تأكيد المحل للتغليف لإنشاء الباركود
                                </span>
                              )}
                            </div>

                            <button
                              onClick={() =>
                                handleGenerateShopSession(selectedShop.id, fOrder.id)
                              }
                              className="text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-2xs"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>مشاركة رابط التجهيز لهذا الطلب عبر واتساب</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 4. Complete Order Details Modal (عرض الطلبات وجميع معلومات الطلب) */}
      {selectedOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 border border-stone-200 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-black text-stone-900 font-mono">
                    تفاصيل الطلب الكاملة #{selectedOrderModal.reference}
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
                    {selectedOrderModal.status}
                  </span>
                </div>
                <span className="text-xs text-stone-400 font-mono">
                  تاريخ الطلب: {new Date(selectedOrderModal.createdAt).toLocaleString('ar-JO')}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderModal(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer & Delivery Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <User className="w-3.5 h-3.5 text-[#3F4832]" />
                  <span>بيانات العميلة والتوصيل</span>
                </div>
                <div className="space-y-1 text-stone-700">
                  <div>
                    الاسم: <strong>{selectedOrderModal.customerName}</strong>
                  </div>
                  <div>
                    الهاتف:{' '}
                    <a
                      href={`tel:${selectedOrderModal.customerPhone}`}
                      className="text-stone-900 font-bold font-mono hover:underline"
                    >
                      {selectedOrderModal.customerPhone}
                    </a>
                  </div>
                  <div>
                    المدينة: <strong>{selectedOrderModal.deliveryJob?.city || selectedOrderModal.shippingZoneNameSnapshot || 'عمان'}</strong>
                  </div>
                  <div>
                    المنطقة: {selectedOrderModal.deliveryJob?.area || 'المنطقة المسجلة'}
                  </div>
                  <div>
                    العنوان التفصيلي: {selectedOrderModal.deliveryJob?.addressDetails || 'العنوان المسجل'}
                  </div>
                  {selectedOrderModal.notes && (
                    <div className="p-2 bg-amber-50 rounded-lg text-amber-900 mt-2 font-medium">
                      ملاحظات: {selectedOrderModal.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Financials & Invoice */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-2">
                <div className="font-bold text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-2">
                  <DollarSign className="w-3.5 h-3.5 text-[#3F4832]" />
                  <span>البيانات المالية والفاتورة</span>
                </div>
                <div className="space-y-1.5 text-stone-700">
                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    <span className="font-mono">{filsToDisplay(selectedOrderModal.shippingCost || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>الخصم / الكوبون:</span>
                    <span className="font-mono text-emerald-700">-{filsToDisplay(selectedOrderModal.discountAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-sm text-[#3F4832] pt-1 border-t border-stone-200">
                    <span>إجمالي الطلب المطلوب تحصيله (COD):</span>
                    <span className="font-mono" dir="ltr">{filsToDisplay(selectedOrderModal.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 pt-1">
                    <span>حالة الدفع:</span>
                    <span className="font-bold text-stone-800">{selectedOrderModal.paymentStatus}</span>
                  </div>

                  {selectedOrderModal.invoice && (
                    <div className="pt-2">
                      <a
                        href={`/invoice/view/${selectedOrderModal.invoice.secureToken || selectedOrderModal.reference}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>معاينة الفاتورة الإلكترونية الثابتة</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* All Order Items Table */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-stone-900 block">
                كافة أصناف ومنتجات هذا الطلب ({selectedOrderModal.items?.length || 0}):
              </span>
              <div className="border border-stone-200 rounded-2xl overflow-x-auto w-full bg-white">
                <table className="w-full text-right">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold text-[11px]">
                      <th className="p-3">المنتج</th>
                      <th className="p-3 text-center">الكمية</th>
                      <th className="p-3 text-left">السعر</th>
                      <th className="p-3 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {selectedOrderModal.items?.map((it: any) => (
                      <tr key={it.id} className={it.isRemoved ? 'bg-rose-50/50' : ''}>
                        <td className="p-3">
                          <span className={`font-bold text-stone-800 ${it.isRemoved ? 'line-through text-stone-400' : ''}`}>
                            {it.name}
                          </span>
                          {it.size && it.size !== 'افتراضي' && (
                            <div className="text-[10px] text-stone-500">
                              المقاس: {it.size}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-bold font-mono">
                          {it.quantity}
                        </td>
                        <td className="p-3 text-left font-mono" dir="ltr">
                          {filsToDisplay(it.unitPrice)}
                        </td>
                        <td className="p-3 text-left font-bold font-mono text-[#3F4832]" dir="ltr">
                          {filsToDisplay(it.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Button */}
              <div className="flex items-center justify-between mt-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAddItemModalOpen(true);
                    setAddItemSearchQuery('');
                    setAddItemSearchResults([]);
                    setSelectedAddItemVariant(null);
                    setAddItemQuantity(1);
                    setAddItemCustomPrice('');
                    setAddItemAdjustmentNote('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-[#3F4832] text-stone-700 hover:text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-stone-500 group-hover:text-white" />
                  <span>إضافة منتج للطلب والفاتورة مع ملاحظة</span>
                </button>
                <span className="text-[11px] text-stone-400">
                  تحديث الفاتورة وإسناد الصنف للمحل المعني
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedOrderModal(null)}
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Master Session Link Modal */}
      {masterSessionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-[#3F4832]" />
                <h3 className="text-base font-bold text-stone-900">
                  رابط التجهيز للمحل جاهز للمشاركة
                </h3>
              </div>
              <button
                onClick={() => setMasterSessionModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-stone-600 leading-relaxed">
                تم إنشاء رابط جلسة مؤمن لصالح المحل لمدة 72 ساعة. يمكنك فتحه مباشرة في واتساب أو نسخ الرابط:
              </p>

              {masterSessionModal.whatsappUrl && (
                <a
                  href={masterSessionModal.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>فتح محادثة واتساب مع المحل مباشرة وإرسال الرابط 💬</span>
                </a>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  رابط البوابة المباشر للمحل:
                </label>
                <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl p-2">
                  <input
                    type="text"
                    readOnly
                    value={masterSessionModal.magicUrl}
                    className="text-xs font-mono text-stone-800 bg-transparent border-none flex-1 focus:outline-none select-all px-1"
                  />
                  <button
                    onClick={() => copyToClipboard(masterSessionModal.magicUrl)}
                    className="text-xs font-bold text-stone-700 hover:text-stone-900 px-2.5 py-1.5 rounded-lg bg-stone-200 transition"
                  >
                    نسخ الرابط
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-600 block">
                  نص رسالة واتساب المنسقة للمحل:
                </label>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {masterSessionModal.whatsappMessage}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => copyToClipboard(masterSessionModal.whatsappMessage)}
                  className="flex-1 bg-stone-800 hover:bg-stone-900 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText ? 'تم النسخ!' : 'نسخ نص الرسالة'}</span>
                </button>

                <a
                  href={masterSessionModal.magicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>معاينة الرابط</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Courier Pickup Manifest Modal */}
      {pickupManifestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  كشف استلام المندوب من محل: {pickupManifestModal.shopName}
                </h3>
                <span className="text-xs text-stone-500">
                  إجمالي الطرود الجاهزة: {pickupManifestModal.packagesCount} طرد
                </span>
              </div>
              <button
                onClick={() => setPickupManifestModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-stone-50 border border-stone-200 p-3 rounded-2xl space-y-1">
                <div className="font-bold text-stone-900">
                  🏠 العنوان: {pickupManifestModal.pickupLocation}
                </div>
                {pickupManifestModal.ownerName && (
                  <div className="text-stone-600">
                    👤 المسؤول: {pickupManifestModal.ownerName}
                  </div>
                )}
                <div className="text-stone-600 font-mono">
                  📞 هاتف المحل: {pickupManifestModal.phone}
                </div>
                {pickupManifestModal.mapUrl && (
                  <a
                    href={pickupManifestModal.mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-bold block pt-1"
                  >
                    فتح موقع المحل على Google Maps 📍
                  </a>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-600 block">
                  نص كشف الاستلام المنسق لواتساب المندوب:
                </label>
                <div className="bg-stone-900 text-stone-100 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {pickupManifestModal.whatsappText}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => copyToClipboard(pickupManifestModal.whatsappText)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copiedText ? 'تم النسخ!' : 'نسخ كشف المحل لواتساب'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Product Replacement Modal */}
      {replacementModalItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#3F4832]" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  استبدال صنف ناقص: {replacementModalItem.name}
                </h3>
              </div>
              <button
                onClick={() => setReplacementModalItem(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  value={replacementSearchQuery}
                  onChange={(e) => handleSearchReplacements(e.target.value)}
                  placeholder="ابحث باسم المنتج البديل..."
                  className="w-full pr-9 pl-3 py-2 border border-stone-200 rounded-xl text-xs bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#3F4832]"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-stone-100 rounded-2xl p-2 bg-stone-50/50">
                {isSearchingReplacements ? (
                  <div className="p-4 text-center text-stone-400 text-xs">جارٍ البحث...</div>
                ) : replacementSearchResults.length === 0 ? (
                  <div className="p-4 text-center text-stone-400 text-xs">
                    {replacementSearchQuery.length < 2
                      ? 'اكتب حرفين على الأقل للبحث عن الأصناف البديلة'
                      : 'لم يتم العثور على نتائج'}
                  </div>
                ) : (
                  replacementSearchResults.map((prod) => {
                    const isSelected = selectedReplacementVariant?.variantId === prod.variantId;
                    return (
                      <div
                        key={prod.variantId}
                        onClick={() => setSelectedReplacementVariant(prod)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400'
                            : 'bg-white border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-stone-800 block">{prod.productName}</span>
                          {prod.variantTitle && prod.variantTitle !== 'افتراضي' && (
                            <span className="text-[10px] text-stone-500">
                              المقاس: {prod.variantTitle}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-stone-900 font-mono" dir="ltr">
                          {filsToDisplay(prod.price)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {selectedReplacementVariant && (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 block">الصنف البديل المختار</span>
                      <span className="font-bold text-emerald-950">{selectedReplacementVariant.productName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-stone-600">الكمية:</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={replacementQuantity}
                        onChange={(e) => setReplacementQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-14 text-center p-1 border border-stone-300 rounded-lg bg-white font-mono font-bold text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-stone-700 block mb-1">
                      ملاحظة التعديل (تظهر في فاتورة الزبونة والتنبيهات):
                    </label>
                    <input
                      type="text"
                      value={replacementAdjustmentNote}
                      onChange={(e) => setReplacementAdjustmentNote(e.target.value)}
                      placeholder="مثال: تم الاتفاق مع الزبونة هاتفياً على استبدال المقاس/اللون"
                      className="w-full p-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3F4832] text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!selectedReplacementVariant || isSubmittingAdjustment}
                  onClick={handleConfirmReplacement}
                  className="flex-1 bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmittingAdjustment ? 'جارٍ الاستبدال...' : 'تأكيد الاستبدال وتحديث الفاتورة'}
                </button>
                <button
                  type="button"
                  onClick={() => setReplacementModalItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Product to Order / Invoice */}
      {addItemModalOpen && selectedOrderModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3F4832]/10 text-[#3F4832] flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-[#3F4832]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900">
                    إضافة منتج للطلب #{selectedOrderModal.reference}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    سيتم تحديث الفاتورة وإسناد الصنف الجديد للمحل المختص آلياً
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAddItemModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  البحث في كتالوج المنتجات:
                </label>
                <input
                  type="text"
                  value={addItemSearchQuery}
                  onChange={(e) => handleSearchAddItem(e.target.value)}
                  placeholder="اكتب اسم المنتج للبحث..."
                  className="w-full p-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3F4832] text-xs"
                />
              </div>

              {/* Search Results */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-stone-100 rounded-xl p-2 bg-stone-50/50">
                {isSearchingAddItem && (
                  <p className="text-center text-stone-400 py-3">جارٍ البحث في الكتالوج...</p>
                )}
                {!isSearchingAddItem && addItemSearchResults.length === 0 && (
                  <p className="text-center text-stone-400 py-3">
                    {addItemSearchQuery.length >= 2 ? 'لا توجد منتجات مطابقة' : 'اكتب حرفين على الأقل للبحث'}
                  </p>
                )}
                {addItemSearchResults.map((prod) => {
                  const isSelected = selectedAddItemVariant?.variantId === prod.variantId;
                  return (
                    <div
                      key={prod.variantId}
                      onClick={() => {
                        setSelectedAddItemVariant(prod);
                        setAddItemCustomPrice((prod.price / 1000).toFixed(3));
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-stone-900">{prod.productName}</div>
                        <div className="text-stone-500 text-[11px] flex items-center gap-2 mt-0.5">
                          {prod.variantTitle && prod.variantTitle !== 'افتراضي' && (
                            <span>المقاس: {prod.variantTitle}</span>
                          )}
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-sans">
                            {prod.supplierName}
                          </span>
                        </div>
                      </div>
                      <div className="text-left font-mono font-bold text-stone-900">
                        {filsToDisplay(prod.price)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {selectedAddItemVariant && (
                <div className="space-y-3 p-3 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block">المنتج المختار</span>
                      <span className="font-bold text-stone-900">{selectedAddItemVariant.productName}</span>
                    </div>
                    <span className="font-mono font-bold text-emerald-800 text-sm">
                      {filsToDisplay(selectedAddItemVariant.price)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200">
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">الكمية:</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={addItemQuantity}
                        onChange={(e) => setAddItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center p-2 border border-stone-300 rounded-xl bg-white font-mono font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-stone-700 block mb-1">سعر الوحدة (د.أ):</label>
                      <input
                        type="number"
                        step="0.001"
                        value={addItemCustomPrice}
                        onChange={(e) => setAddItemCustomPrice(e.target.value)}
                        className="w-full text-center p-2 border border-stone-300 rounded-xl bg-white font-mono font-bold text-xs"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-700 block mb-1">
                      ملاحظة التعديل (تظهر في الفاتورة والتنبيهات):
                    </label>
                    <input
                      type="text"
                      value={addItemAdjustmentNote}
                      onChange={(e) => setAddItemAdjustmentNote(e.target.value)}
                      placeholder="مثال: تمت إضافة شال بيج بناءً على مكالمة تأكيد الطلب مع العميلة"
                      className="w-full p-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3F4832] text-xs bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={!selectedAddItemVariant || isSubmittingAddItem}
                  onClick={handleConfirmAddItem}
                  className="flex-1 bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                >
                  {isSubmittingAddItem ? 'جارٍ الإضافة...' : 'تأكيد إضافة المنتج وتحديث الفاتورة'}
                </button>
                <button
                  type="button"
                  onClick={() => setAddItemModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Cancel Order Modal */}
      {cancelPromptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    إلغاء الطلب كاملاً
                  </h3>
                  <span className="text-xs text-stone-500 font-mono">
                    طلب #{cancelPromptModal.orderReference}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCancelPromptModal(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 font-semibold leading-relaxed">
                {cancelPromptModal.message ||
                  'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.'}
              </div>

              <p className="text-stone-600 leading-relaxed">
                عند تأكيد الإلغاء، سيتم تحويل حالة الطلب إلى <strong>ملغي</strong> وعكس القيود المالية وإلغاء أوامر التجهيز ومهام التوصيل المرتبطة به فوراً.
              </p>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  disabled={isCancellingOrder}
                  onClick={() => handleConfirmCancelOrder(cancelPromptModal.orderId)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>{isCancellingOrder ? 'جارٍ الإلغاء...' : 'تأكيد إلغاء الطلب كاملاً'}</span>
                </button>
                <button
                  type="button"
                  disabled={isCancellingOrder}
                  onClick={() => setCancelPromptModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold text-xs"
                >
                  تراجع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
