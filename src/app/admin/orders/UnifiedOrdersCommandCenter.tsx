'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Truck,
  ExternalLink,
  Copy,
  Printer,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Check,
  Send,
  User,
  Phone,
  MapPin,
  Package as PackageIcon,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
  Settings,
  X,
  Share2,
  MessageCircle,
  XCircle,
  Store,
  PlusCircle,
} from 'lucide-react';
import { filsToDisplay } from '@/lib/money';
import { checkOrderRewardThresholdDrop } from '@/lib/orders/reward-protection';
import {
  confirmAndInitializeOrderAction,
  getOrderFullDetailsAction,
  markCustomerWhatsAppSentAction,
  createSupplierSessionForOrderAction,
  updateOrderDeliveryQuickSettingsAction,
  quickSettleOrderCodAction,
  removeShortageOrderItemAction,
  replaceShortageOrderItemAction,
  searchProductsForReplacementAction,
  searchProductsForCatalogAction,
  addOrderItemAction,
  cancelUnifiedOrderAction,
  retryOrderTelegramNotificationAction,
} from '@/actions/unified-orders';
import {
  dispatchFinalDeliveryAction,
  completeOrderDeliveryAction,
  confirmPackagePickupAction,
  getOrderDeliveryManifestAction,
} from '@/actions/fulfillment-admin';

interface Props {
  initialKpis: {
    newCount: number;
    needsActionCount: number;
    preparingCount: number;
    readyDeliveryCount: number;
    telegramFailedCount?: number;
  };
  initialOrders: any[];
  captains: any[];
  selectedOrderId?: string;
}

export default function UnifiedOrdersCommandCenter({
  initialKpis,
  initialOrders,
  captains,
  selectedOrderId: defaultSelectedId,
}: Props) {
  const [kpis, setKpis] = useState(initialKpis);
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(
    defaultSelectedId || (initialOrders.length > 0 ? initialOrders[0].id : null)
  );

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Modals & Drawers
  const [isDeliveryDrawerOpen, setIsDeliveryDrawerOpen] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedInvoiceUrl, setCopiedInvoiceUrl] = useState(false);
  const [supplierSessionModal, setSupplierSessionModal] = useState<any>(null);
  const [manifestModal, setManifestModal] = useState<any>(null);

  // Delivery quick assignment state
  const [selectedCaptainId, setSelectedCaptainId] = useState('');
  const [deliveryNotesInput, setDeliveryNotesInput] = useState('');
  const [courierCompanyInput, setCourierCompanyInput] = useState('');

  // Shortage Resolution & Replacement States
  const [replacementModalItem, setReplacementModalItem] = useState<any | null>(null);
  const [replacementSearchQuery, setReplacementSearchQuery] = useState('');
  const [replacementSearchResults, setReplacementSearchResults] = useState<any[]>([]);
  const [isSearchingReplacements, setIsSearchingReplacements] = useState(false);
  const [selectedReplacementVariant, setSelectedReplacementVariant] = useState<any | null>(null);
  const [replacementQuantity, setReplacementQuantity] = useState(1);
  const [replacementAdjustmentNote, setReplacementAdjustmentNote] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Add Product directly to Order / Invoice State
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addItemSearchQuery, setAddItemSearchQuery] = useState('');
  const [addItemSearchResults, setAddItemSearchResults] = useState<any[]>([]);
  const [isSearchingAddItem, setIsSearchingAddItem] = useState(false);
  const [selectedAddItemVariant, setSelectedAddItemVariant] = useState<any | null>(null);
  const [addItemQuantity, setAddItemQuantity] = useState(1);
  const [addItemCustomPrice, setAddItemCustomPrice] = useState<string>('');
  const [addItemAdjustmentNote, setAddItemAdjustmentNote] = useState('');
  const [isSubmittingAddItem, setIsSubmittingAddItem] = useState(false);

  // Cancel Order Modal State
  const [cancelPromptModal, setCancelPromptModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderReference: string;
    message?: string;
  } | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);

  // نافذة التنبيه المالي عند انخفاض قيمة الطلب عن حد التوصيل المجاني/المكافأة
  const [rewardThresholdModal, setRewardThresholdModal] = useState<{
    isOpen: boolean;
    orderId: string;
    orderReference: string;
    orderItemId: string;
    itemName: string;
    currentSubtotal: number;
    futureSubtotal: number;
    threshold: number;
    shippingFee: number;
    ruleName: string;
  } | null>(null);

  const [isRetryingTelegram, setIsRetryingTelegram] = useState(false);

  const handleRetryTelegram = async (orderId: string) => {
    setIsRetryingTelegram(true);
    try {
      const res = await retryOrderTelegramNotificationAction(orderId);
      if (res.success) {
        alert(res.message || 'تم إرسال إشعار التيليجرام بنجاح! ✓');
        const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
        const updated = await getOrderFullDetailsAction(orderId, clientOrigin);
        setSelectedOrderDetails(updated);
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? { ...o, telegramStatus: 'SENT', telegramSentAt: new Date(), telegramError: null }
              : o
          )
        );
        setKpis((prev) => ({
          ...prev,
          telegramFailedCount: Math.max(0, (prev.telegramFailedCount || 1) - 1),
        }));
      } else {
        alert(res.error || 'تعذر إرسال الإشعار إلى تيليجرام');
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء محاولة إرسال إشعار تيليجرام');
    } finally {
      setIsRetryingTelegram(false);
    }
  };

  const handleConfirmCancelOrder = async (orderId: string, reason?: string) => {
    setIsCancellingOrder(true);
    try {
      const res = await cancelUnifiedOrderAction(orderId, reason || 'إلغاء الطلب كاملاً من مركز الطلبات');
      if (!res.success) {
        alert((res as any).error || 'تعذر إلغاء الطلب');
        return;
      }
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const updated = await getOrderFullDetailsAction(orderId, clientOrigin);
      setSelectedOrderDetails(updated);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, status: 'CANCELLED', fulfillmentStatus: 'CANCELLED' }
            : o
        )
      );
      setCancelPromptModal(null);
      alert('تم إلغاء الطلب بنجاح وتحديث كافة الحسابات والطرود المرتبطة.');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إلغاء الطلب');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleRemoveShortageItem = async (orderItemId: string, itemName: string) => {
    if (!selectedOrderDetails) return;

    // 1. فحص إذا كان هذا الصنف هو آخر صنف متبقٍ في الطلب
    const activeItems = selectedOrderDetails.order.items.filter((it: any) => !it.isRemoved);
    if (activeItems.length <= 1) {
      setCancelPromptModal({
        isOpen: true,
        orderId: selectedOrderDetails.order.id,
        orderReference: selectedOrderDetails.order.reference,
        message: 'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.',
      });
      return;
    }

    // 2. فحص الأمان المالي: هل حذف هذا الصنف سيخفض إجمالي المشتريات عن حد التوصيل المجاني أو المكافأة؟
    const dropCheck = checkOrderRewardThresholdDrop(
      selectedOrderDetails.order,
      orderItemId,
      selectedOrderDetails.shippingZone
    );

    if (dropCheck.willViolateThreshold && dropCheck.threshold) {
      setRewardThresholdModal({
        isOpen: true,
        orderId: selectedOrderDetails.order.id,
        orderReference: selectedOrderDetails.order.reference,
        orderItemId,
        itemName,
        currentSubtotal: dropCheck.currentSubtotal,
        futureSubtotal: dropCheck.futureSubtotal,
        threshold: dropCheck.threshold,
        shippingFee: dropCheck.standardFee,
        ruleName: dropCheck.ruleName,
      });
      return;
    }

    // 3. تأكيد اعتيادي إذا لم يكن هناك مخالفة لحد أدنى
    if (!confirm(`هل أنت متأكد من حذف صنف (${itemName}) من الطلب والفاتورة وتحديث الحسابات تلقائياً؟`)) return;

    await executeRemoveShortageItem(orderItemId, itemName, false);
  };

  const executeRemoveShortageItem = async (
    orderItemId: string,
    itemName: string,
    allowRewardBelowThreshold: boolean = false
  ) => {
    if (!selectedOrderDetails) return;
    setIsSubmittingAdjustment(true);
    setRewardThresholdModal(null);
    try {
      const res = await removeShortageOrderItemAction(selectedOrderDetails.order.id, orderItemId, {
        allowRewardBelowThreshold,
      });
      if (!res.success) {
        if ((res as any).error?.includes('لا يمكن حذف كافة أصناف الطلب')) {
          setCancelPromptModal({
            isOpen: true,
            orderId: selectedOrderDetails.order.id,
            orderReference: selectedOrderDetails.order.reference,
            message: 'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.',
          });
          return;
        }
        alert((res as any).error || 'تعذر حذف الصنف');
        return;
      }
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const updated = await getOrderFullDetailsAction(selectedOrderDetails.order.id, clientOrigin);
      setSelectedOrderDetails(updated);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderDetails.order.id
            ? { ...o, totalAmount: res.newTotal, hasAdjustment: true }
            : o
        )
      );

      if (res.rewardStatus === 'REVOKED_BELOW_THRESHOLD') {
        alert(
          `تم استبعاد (${itemName}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.\n\n` +
          `⚠️ حماية مالية: تم إلغاء التوصيل المجاني واحتساب رسوم التوصيل (${filsToDisplay(res.restoredShippingFee || 2000)}) لانخفاض قيمة المشتريات عن الحد الأدنى للمكافأة.`
        );
      } else if (res.rewardStatus === 'KEPT_BY_ADMIN_APPROVAL') {
        alert(
          `تم استبعاد (${itemName}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.\n\n` +
          `🌟 تم اعتماد استمرار التوصيل المجاني/المكافأة استثناءً بموافقة الإدارة.`
        );
      } else {
        alert(`تم استبعاد (${itemName}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.`);
      }
    } catch (err: any) {
      if (err.message?.includes('لا يمكن حذف كافة أصناف الطلب')) {
        setCancelPromptModal({
          isOpen: true,
          orderId: selectedOrderDetails.order.id,
          orderReference: selectedOrderDetails.order.reference,
          message: 'لا يمكن حذف كافة أصناف الطلب، يمكنك إلغاء الطلب كاملاً بدلاً من ذلك.',
        });
        return;
      }
      alert(err.message || 'حدث خطأ أثناء تعديل الطلب');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

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
    if (!selectedOrderDetails || !replacementModalItem || !selectedReplacementVariant) return;

    setIsSubmittingAdjustment(true);
    try {
      const res = await replaceShortageOrderItemAction(
        selectedOrderDetails.order.id,
        replacementModalItem.id,
        selectedReplacementVariant.variantId,
        replacementQuantity,
        replacementAdjustmentNote
      );
      if (!res.success) {
        alert((res as any).error || 'تعذر استبدال الصنف');
        return;
      }
      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const updated = await getOrderFullDetailsAction(selectedOrderDetails.order.id, clientOrigin);
      setSelectedOrderDetails(updated);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderDetails.order.id
            ? { ...o, totalAmount: res.newTotal, hasAdjustment: true }
            : o
        )
      );
      setReplacementModalItem(null);
      setSelectedReplacementVariant(null);
      setReplacementSearchResults([]);
      setReplacementAdjustmentNote('');
      alert(`تم استبدال الصنف بالبديل (${res.replacedWith}) وتحديث الفاتورة بمبلغ: ${filsToDisplay(res.newTotal)}.`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء الاستبدال');
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
    if (!selectedOrderDetails || !selectedAddItemVariant) return;

    setIsSubmittingAddItem(true);
    try {
      const customPriceFils =
        addItemCustomPrice && !isNaN(parseFloat(addItemCustomPrice))
          ? Math.round(parseFloat(addItemCustomPrice) * 1000)
          : undefined;

      const res = await addOrderItemAction({
        orderId: selectedOrderDetails.order.id,
        variantId: selectedAddItemVariant.variantId,
        quantity: addItemQuantity,
        customUnitPriceFils: customPriceFils,
        adjustmentNote: addItemAdjustmentNote,
      });

      if (!res.success) {
        alert((res as any).error || 'تعذر إضافة المنتج للطلب');
        return;
      }

      const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const updated = await getOrderFullDetailsAction(selectedOrderDetails.order.id, clientOrigin);
      setSelectedOrderDetails(updated);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderDetails.order.id
            ? { ...o, totalAmount: res.newTotal, hasAdjustment: true }
            : o
        )
      );

      setAddItemModalOpen(false);
      setSelectedAddItemVariant(null);
      setAddItemSearchResults([]);
      setAddItemSearchQuery('');
      setAddItemAdjustmentNote('');
      setAddItemCustomPrice('');
      setAddItemQuantity(1);

      alert(`تمت إضافة (${res.addedProduct}) للطلب وتحديث الفاتورة بنجاح. الإجمالي الجديد: ${filsToDisplay(res.newTotal)}.`);
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء إضافة المنتج');
    } finally {
      setIsSubmittingAddItem(false);
    }
  };

  // Load detailed order data whenever selectedId changes
  useEffect(() => {
    if (!selectedId) {
      setSelectedOrderDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoadingDetails(true);

    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    getOrderFullDetailsAction(selectedId, clientOrigin)
      .then((data) => {
        if (isMounted) {
          setSelectedOrderDetails(data);
          setSelectedCaptainId(data.order.deliveryAssignment?.captainId || '');
          setDeliveryNotesInput(data.order.notes || '');
          setCourierCompanyInput(data.order.deliveryJob?.collectedByCourier || '');
        }
      })
      .catch((err) => {
        console.error('Failed to load order details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId]);

  // Copy helper
  const copyToClipboard = (text: string, type: 'msg' | 'url' = 'msg') => {
    navigator.clipboard.writeText(text);
    if (type === 'msg') {
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } else {
      setCopiedInvoiceUrl(true);
      setTimeout(() => setCopiedInvoiceUrl(false), 2000);
    }
  };

  // Filter orders by tab and search
  const filteredOrders = orders.filter((ord) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const match =
        ord.reference.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.customerPhone.includes(q);
      if (!match) return false;
    }

    if (activeTab === 'NEW') {
      return ['PENDING', 'AWAITING_WHATSAPP'].includes(ord.status);
    }
    if (activeTab === 'NEEDS_ACTION') {
      return (
        ord.fulfillmentStatus === 'FAILED_DELIVERY' ||
        ord.status === 'FAILED_DELIVERY' ||
        ord.fulfillmentOrders?.some((f: any) => f.status === 'ISSUE_REPORTED')
      );
    }
    if (activeTab === 'PREPARING') {
      return (
        ['CONFIRMED', 'PREPARING'].includes(ord.status) &&
        ['UNFULFILLED', 'SPLIT_PENDING', 'PROCESSING', 'PARTIALLY_READY'].includes(ord.fulfillmentStatus)
      );
    }
    if (activeTab === 'DELIVERY') {
      return (
        ['READY_FOR_PICKUP', 'ALL_PICKED_UP', 'RECEIVED_AT_HUB', 'OUT_FOR_DELIVERY'].includes(
          ord.fulfillmentStatus
        ) || ['SHIPPED', 'OUT_FOR_DELIVERY'].includes(ord.status)
      );
    }
    if (activeTab === 'COMPLETED') {
      return ord.status === 'DELIVERED';
    }
    if (activeTab === 'TELEGRAM_FAILED') {
      return ord.telegramStatus === 'FAILED';
    }
    return true;
  });

  // Calculate Smart Next Action
  const getSmartNextAction = (order: any) => {
    if (!order) return null;

    // 1. New / Pending
    if (['PENDING', 'AWAITING_WHATSAPP'].includes(order.status)) {
      return {
        type: 'CONFIRM_ORDER',
        badge: 'بانتظار التأكيد',
        badgeColor: 'amber',
        title: 'تأكيد الطلب وتجهيز رسالة واتساب والفاتورة',
        subtitle: 'اعتماد الطلب • إصدار الفاتورة الثابتة • بدء تجهيز المحلات • فتح رسالة العميل',
        buttonText: 'تأكيد الطلب وتجهيز واتساب',
        buttonClass: 'bg-[#3F4832] hover:bg-[#2e3524] text-white shadow-md',
      };
    }

    // 2. Closed
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      return {
        type: 'CLOSED',
        badge: order.status === 'CANCELLED' ? 'ملغى' : 'مسترد',
        badgeColor: 'rose',
        title: 'الطلب مغلق',
        subtitle: 'تم إلغاء الطلب وتسوية القيود المالية.',
        buttonText: null,
      };
    }

    // 3. Delivered - Settlement needed
    if (order.status === 'DELIVERED') {
      const isSettled =
        order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ' || order.paymentStatus === 'PAID';
      if (!isSettled) {
        return {
          type: 'SETTLE_COD',
          badge: 'تم التسليم — بانتظار توريد النقد',
          badgeColor: 'emerald',
          title: 'تسوية النقد المحصل مع المحاسبة (COD Settlement)',
          subtitle: 'المندوب سلم الطلب وحصّل النقد. قم بتوريده لخزينة رَواق واعتماد الفاتورة كـ PAID.',
          buttonText: 'تسوية النقد وتأكيد توريده لخزينة رَواق',
          buttonClass: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md',
        };
      } else {
        return {
          type: 'COMPLETED',
          badge: 'مكتمل ومسوى بالكامل',
          badgeColor: 'emerald',
          title: 'اكتملت دورة الطلب بنجاح',
          subtitle: 'تم التسليم وتوريد النقد لخزينة رَواق وإغلاق الفاتورة.',
          buttonText: null,
        };
      }
    }

    // 4. Failed delivery
    if (order.fulfillmentStatus === 'FAILED_DELIVERY' || order.status === 'FAILED_DELIVERY') {
      return {
        type: 'RETRY_DELIVERY',
        badge: 'تعثر التوصيل — يحتاج تدخلك',
        badgeColor: 'rose',
        title: 'معالجة تعثر التوصيل للزبونة',
        subtitle: 'أبلغ المندوب عن تعذر التسليم. يرجى التواصل مع الزبونة وإعادة جدولة التوصيل.',
        buttonText: 'إعادة إطلاق التوصيل للزبونة',
        buttonClass: 'bg-amber-600 hover:bg-amber-700 text-white shadow-md',
      };
    }

    // 5. Out for Delivery
    if (
      order.fulfillmentStatus === 'OUT_FOR_DELIVERY' ||
      order.status === 'OUT_FOR_DELIVERY' ||
      order.status === 'SHIPPED'
    ) {
      return {
        type: 'COMPLETE_DELIVERY',
        badge: 'قيد التوصيل النهائي للزبونة',
        badgeColor: 'blue',
        title: 'متابعة تسليم الطلب للزبونة',
        subtitle: 'الشحنة مع المندوب وفي طريقها للزبونة. اضغط لتأكيد التسليم عند استلام الزبونة.',
        buttonText: 'تأكيد اكتمال التسليم للزبونة',
        buttonClass: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md',
      };
    }

    // 6. Packages all picked up - ready to dispatch
    const packages = order.fulfillmentOrders?.flatMap((f: any) => f.packages) || [];
    const allPickedUp =
      packages.length > 0 &&
      packages.every((p: any) => p.status === 'PICKED_UP' || p.status === 'DELIVERED');

    if (
      allPickedUp ||
      order.fulfillmentStatus === 'ALL_PICKED_UP' ||
      order.fulfillmentStatus === 'RECEIVED_AT_HUB'
    ) {
      return {
        type: 'DISPATCH_DELIVERY',
        badge: 'الطرود جاهزة للتوصيل النهائي',
        badgeColor: 'purple',
        title: 'إعداد كشف شركة التوصيل وإطلاق الشحنة',
        subtitle: 'تم استلام كافة طرود المحلات بنجاح. أطلق رحلة التوصيل النهائي لعنوان الزبونة.',
        buttonText: 'إطلاق التوصيل النهائي للزبونة (Out for Delivery)',
        buttonClass: 'bg-[#3F4832] hover:bg-[#2e3524] text-white shadow-md',
      };
    }

    // 7. Ready for pickup at shops
    const readyCount =
      order.fulfillmentOrders?.filter((f: any) => f.status === 'READY_FOR_PICKUP').length || 0;
    if (readyCount > 0 || order.fulfillmentStatus === 'READY_FOR_PICKUP') {
      return {
        type: 'PICKUP_PACKAGES',
        badge: 'منتجات جاهزة لدى المحلات',
        badgeColor: 'amber',
        title: 'جدولة استلام الطرود من المحلات',
        subtitle: `${readyCount} محل أعلن جاهزية الطرد. أرسل المناديب لاستلامها من مواقع المحلات.`,
        buttonText: 'تأكيد استلام الطرود / كشف الاستلام',
        buttonClass: 'bg-purple-700 hover:bg-purple-800 text-white shadow-md',
      };
    }

    // 8. Confirmed & in preparation
    return {
      type: 'NOTIFY_SUPPLIERS',
      badge: 'قيد التجهيز لدى المحلات',
      badgeColor: 'zinc',
      title: 'متابعة تجهيز المحلات ومشاركة الروابط',
      subtitle: 'أوامر التجهيز صادرة. شارك روابط التجهيز المؤقتة مع المحلات لمتابعة التغليف.',
      buttonText: 'متابعة المحلات وروابط التجهيز',
      buttonClass: 'bg-zinc-800 hover:bg-zinc-900 text-white shadow-md',
    };
  };

  const smartAction = selectedOrderDetails
    ? getSmartNextAction(selectedOrderDetails.order)
    : null;

  const isCompletedOrder = Boolean(
    selectedOrderDetails &&
      (smartAction?.type === 'COMPLETED' ||
        selectedOrderDetails.order.status === 'COMPLETED' ||
        (selectedOrderDetails.order.status === 'DELIVERED' &&
          (selectedOrderDetails.order.deliveryJob?.codStatus === 'SETTLED_TO_RAWAQ' ||
            selectedOrderDetails.order.paymentStatus === 'PAID')))
  );

  const isDeliveredOrClosed = Boolean(
    selectedOrderDetails &&
      (isCompletedOrder ||
        ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(
          selectedOrderDetails.order.status
        ) ||
        selectedOrderDetails.order.fulfillmentStatus === 'DELIVERED')
  );

  // Handle Smart Action Click
  const handleExecuteSmartAction = async () => {
    if (!selectedOrderDetails || !smartAction) return;

    const orderId = selectedOrderDetails.order.id;
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;

    startTransition(async () => {
      try {
        if (smartAction.type === 'CONFIRM_ORDER') {
          const res = await confirmAndInitializeOrderAction(orderId, clientOrigin);
          if (res.success) {
            setSelectedOrderDetails(res);
            // Update order in list
            setOrders((prev) =>
              prev.map((o) =>
                o.id === orderId
                  ? {
                      ...o,
                      status: 'CONFIRMED',
                      fulfillmentStatus: 'SPLIT_PENDING',
                      paymentStatus: 'COD_PENDING',
                    }
                  : o
              )
            );
            // Automatically open WhatsApp with customer message
            if ((res as any).customerWhatsApp?.waUrl) {
              window.open((res as any).customerWhatsApp.waUrl, '_blank');
            }
          } else {
            alert((res as any).error || 'تعذر تأكيد الطلب.');
          }
        } else if (smartAction.type === 'DISPATCH_DELIVERY') {
          const courier = selectedOrderDetails.order.deliveryJob?.courierCompany || 'مندوب رَواق';
          const res = await dispatchFinalDeliveryAction(orderId, courier);
          if (res.success) {
            alert('تم إطلاق رحلة التوصيل النهائي بنجاح!');
            refreshCurrentOrder();
          } else {
            alert((res as any).error || 'تعذر إطلاق التوصيل.');
          }
        } else if (smartAction.type === 'COMPLETE_DELIVERY') {
          const res = await completeOrderDeliveryAction(orderId);
          if (res.success) {
            alert('تم تأكيد تسليم الطلب النهائي للزبونة بنجاح!');
            refreshCurrentOrder();
          } else {
            alert((res as any).error || 'تعذر تأكيد التسليم.');
          }
        } else if (smartAction.type === 'SETTLE_COD') {
          const res = await quickSettleOrderCodAction(orderId);
          if (res.success) {
            alert('تم توريد النقد لخزينة رَواق واعتماد الفاتورة كـ PAID بنجاح!');
            refreshCurrentOrder();
          } else {
            alert((res as any).error || 'تعذر تسوية النقد.');
          }
        } else if (smartAction.type === 'PICKUP_PACKAGES' || smartAction.type === 'NOTIFY_SUPPLIERS') {
          // Scroll smoothly to suppliers section
          const el = document.getElementById('suppliers-section');
          el?.scrollIntoView({ behavior: 'smooth' });
        }
      } catch (err: any) {
        alert(err?.message || 'حدث خطأ أثناء تنفيذ الإجراء.');
      }
    });
  };

  const refreshCurrentOrder = async () => {
    if (!selectedId) return;
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const data = await getOrderFullDetailsAction(selectedId, clientOrigin);
    setSelectedOrderDetails(data);
  };

  // Handle Confirm Package Pickup
  const handleConfirmPackagePickup = async (packageCode: string) => {
    const courier = prompt('اسم المندوب أو الناقل الذي استلم الطرد:', 'مندوب رَواق');
    if (!courier) return;

    startTransition(async () => {
      const res = await confirmPackagePickupAction(packageCode, courier);
      if (res.success) {
        alert(`تم تأكيد استلام الطرد [${packageCode}] بنجاح!`);
        refreshCurrentOrder();
      } else {
        alert((res as any).error || 'تعذر تأكيد استلام الطرد.');
      }
    });
  };

  // Handle Supplier WhatsApp Link Generation
  const handleGenerateSupplierLink = async (supplierId: string, fulfillmentOrderId: string) => {
    const clientOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    startTransition(async () => {
      const res = await createSupplierSessionForOrderAction(
        supplierId,
        fulfillmentOrderId,
        clientOrigin
      );
      if (res.success) {
        setSupplierSessionModal(res);
        // الانتقال الفوري لواتساب المحل
        if ((res as any).whatsappUrl) {
          window.open((res as any).whatsappUrl, '_blank');
        }
      } else {
        alert((res as any).error || 'تعذر توليد رابط المحل.');
      }
    });
  };

  // Handle Delivery Manifest Open
  const handleOpenManifest = async (orderId: string) => {
    startTransition(async () => {
      const res = await getOrderDeliveryManifestAction(orderId);
      if (res.success) {
        setManifestModal(res.manifest);
      } else {
        alert(res.error || 'تعذر استخراج الكشف.');
      }
    });
  };

  // Handle Quick Delivery Save
  const handleSaveDeliveryQuickSettings = async () => {
    if (!selectedId) return;
    startTransition(async () => {
      const res = await updateOrderDeliveryQuickSettingsAction({
        orderId: selectedId,
        captainId: selectedCaptainId || undefined,
        courierCompany: courierCompanyInput || undefined,
        deliveryNotes: deliveryNotesInput || undefined,
      });
      if (res.success) {
        alert('تم حفظ إعدادات التوصيل بنجاح!');
        setIsDeliveryDrawerOpen(false);
        refreshCurrentOrder();
      } else {
        alert('تعذر حفظ إعدادات التوصيل.');
      }
    });
  };

  // Handle Mark Customer WhatsApp Sent
  const handleMarkWhatsAppSent = async () => {
    if (!selectedId) return;
    await markCustomerWhatsAppSentAction(selectedId);
    if (selectedOrderDetails) {
      setSelectedOrderDetails({
        ...selectedOrderDetails,
        order: {
          ...selectedOrderDetails.order,
          customerWhatsAppSentAt: new Date(),
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick KPI Cards */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              <span>رَواق | مركز إدارة الطلبات الموحد</span>
              <span className="text-xs bg-[#3F4832] text-white px-2.5 py-0.5 rounded-full font-bold">
                Unified Command Center
              </span>
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              إدارة الطلبات من لحظة الوصول إلى التجهيز، التوصيل، والتسوية المالية من شاشة واحدة
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-2xl border border-stone-200">
              <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-[#3F4832] shadow-xs border border-stone-200 flex items-center gap-1.5">
                <PackageIcon className="w-3.5 h-3.5" />
                <span>مركز الطلبات (نشط)</span>
              </div>
              <Link
                href="/admin/orders/shops"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-stone-600 hover:text-stone-900 transition flex items-center gap-1.5"
              >
                <Store className="w-3.5 h-3.5" />
                <span>متابعة المحلات</span>
              </Link>
            </div>
          </div>
        </div>

        {/* The KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Card 1: New Orders */}
          <button
            onClick={() => setActiveTab('NEW')}
            className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
              activeTab === 'NEW'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-400'
                : 'bg-white border-stone-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>طلبات جديدة</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-900 font-mono mt-2">
              {String(kpis.newCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-amber-700 mt-1 block">بانتظار التأكيد والاعتماد</span>
          </button>

          {/* Card 2: Telegram Notifications */}
          <button
            onClick={() => setActiveTab('TELEGRAM_FAILED')}
            className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
              activeTab === 'TELEGRAM_FAILED'
                ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400'
                : (kpis.telegramFailedCount || 0) > 0
                ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400 hover:border-rose-400'
                : 'bg-white border-stone-200 hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>إشعارات تيليجرام</span>
              <Send className="w-4 h-4 text-sky-500" />
            </div>
            <div className={`text-2xl font-black font-mono mt-2 ${(kpis.telegramFailedCount || 0) > 0 ? 'text-rose-700' : 'text-sky-900'}`}>
              {(kpis.telegramFailedCount || 0) > 0 ? `${kpis.telegramFailedCount}` : 'سليمة ✓'}
            </div>
            <span className={`text-[11px] mt-1 block ${(kpis.telegramFailedCount || 0) > 0 ? 'text-rose-700 font-bold' : 'text-sky-700'}`}>
              {(kpis.telegramFailedCount || 0) > 0 ? 'إشعارات تحتاج إعادة إرسال' : 'كل الإشعارات أُرسلت'}
            </span>
          </button>

          {/* Card 3: Needs Action */}
          <button
            onClick={() => setActiveTab('NEEDS_ACTION')}
            className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
              activeTab === 'NEEDS_ACTION'
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400'
                : 'bg-white border-stone-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>تحتاج تدخلك</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-900 font-mono mt-2">
              {String(kpis.needsActionCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-rose-700 mt-1 block">مشاكل ونواقص أو تعثر توصيل</span>
          </button>

          {/* Card 4: In Fulfillment */}
          <button
            onClick={() => setActiveTab('PREPARING')}
            className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
              activeTab === 'PREPARING'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400'
                : 'bg-white border-stone-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>قيد التجهيز</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-blue-900 font-mono mt-2">
              {String(kpis.preparingCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-blue-700 mt-1 block">لدى المحلات والتقسيم</span>
          </button>

          {/* Card 5: Ready for Delivery */}
          <button
            onClick={() => setActiveTab('DELIVERY')}
            className={`p-4 rounded-2xl border text-right transition shadow-xs flex flex-col justify-between ${
              activeTab === 'DELIVERY'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400'
                : 'bg-white border-stone-200 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>جاهزة للتوصيل</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-900 font-mono mt-2">
              {String(kpis.readyDeliveryCount).padStart(2, '0')}
            </div>
            <span className="text-[11px] text-emerald-700 mt-1 block">الطرود جاهزة أو مع المناديب</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Tab Filter Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'كافة الطلبات' },
            { id: 'NEW', label: 'الجديدة' },
            { id: 'TELEGRAM_FAILED', label: `تيليجرام متعثر ${(kpis.telegramFailedCount || 0) > 0 ? `(${kpis.telegramFailedCount})` : ''}` },
            { id: 'NEEDS_ACTION', label: 'تحتاج تدخلك' },
            { id: 'PREPARING', label: 'التجهيز' },
            { id: 'DELIVERY', label: 'التوصيل' },
            { id: 'COMPLETED', label: 'المكتملة' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث برقم الطلب، اسم العميلة، الهاتف..."
            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl pr-9 pl-3 py-2 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#3F4832] transition"
          />
        </div>
      </div>

      {/* 3. Main Split View: Orders List (Right) & Command Center (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Right Column: Orders Feed (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[85vh] overflow-y-auto pr-1">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center text-xs text-stone-500">
              لا توجد طلبات مطابقة لهذا الفلتر أو البحث.
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const isSelected = ord.id === selectedId;
              const smart = getSmartNextAction(ord);

              return (
                <div
                  key={ord.id}
                  onClick={() => setSelectedId(ord.id)}
                  className={`p-4 rounded-2xl border text-right cursor-pointer transition shadow-xs ${
                    isSelected
                      ? 'bg-stone-50 border-[#3F4832] ring-2 ring-[#3F4832]'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-black text-sm text-stone-900">
                        #{ord.reference}
                      </span>
                      {ord.customerWhatsAppSentAt && (
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" />
                          <span>واتساب</span>
                        </span>
                      )}
                      {ord.telegramStatus === 'SENT' ? (
                        <span className="text-[10px] bg-sky-50 text-sky-800 font-bold px-1.5 py-0.5 rounded border border-sky-200 flex items-center gap-0.5" title="Telegram أُرسل بنجاح">
                          <Check className="w-2.5 h-2.5 text-sky-600" />
                          <span>Telegram أُرسل</span>
                        </span>
                      ) : ord.telegramStatus === 'FAILED' ? (
                        <span className="text-[10px] bg-rose-50 text-rose-800 font-bold px-1.5 py-0.5 rounded border border-rose-200 flex items-center gap-0.5 animate-pulse" title="تعثر إرسال إشعار تيليجرام">
                          <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                          <span>إشعار فشل</span>
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs font-black text-[#3F4832] font-mono" dir="ltr">
                      {filsToDisplay(ord.totalAmount)}
                    </span>
                  </div>

                  <div className="text-xs text-stone-700 font-bold flex items-center justify-between">
                    <span>
                      {ord.customerName} ({ord.deliveryJob?.city || (ord as any).shippingZoneNameSnapshot || 'عمان'})
                    </span>
                    <span className="text-[11px] text-stone-500 font-normal">
                      {ord._count.items} أصناف • {ord.fulfillmentOrders?.length || 1} محل
                    </span>
                  </div>

                  {/* Smart Next Action Pill */}
                  {smart && (
                    <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <span
                        className={`font-bold px-2 py-0.5 rounded-md ${
                          smart.badgeColor === 'amber'
                            ? 'bg-amber-100 text-amber-900'
                            : smart.badgeColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-900'
                            : smart.badgeColor === 'blue'
                            ? 'bg-blue-100 text-blue-900'
                            : smart.badgeColor === 'purple'
                            ? 'bg-purple-100 text-purple-900'
                            : smart.badgeColor === 'rose'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {smart.badge}
                      </span>
                      <span className="text-stone-400 text-[10px] font-mono">
                        {new Date(ord.createdAt).toLocaleDateString('ar-JO')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Left / Main Column: Selected Order Command Center (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {!selectedOrderDetails || isLoadingDetails ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-xs text-stone-500 shadow-xs">
              <div className="w-8 h-8 border-2 border-stone-300 border-t-[#3F4832] rounded-full animate-spin mx-auto mb-3"></div>
              <span>جاري تحميل بيانات الطلب المحدّدة...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Order Master Card */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-stone-900 font-mono">
                        الطلب #{selectedOrderDetails.order.reference}
                      </h2>
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          smartAction?.badgeColor === 'amber'
                            ? 'bg-amber-100 text-amber-900'
                            : smartAction?.badgeColor === 'emerald'
                            ? 'bg-emerald-100 text-emerald-900'
                            : smartAction?.badgeColor === 'blue'
                            ? 'bg-blue-100 text-blue-900'
                            : smartAction?.badgeColor === 'purple'
                            ? 'bg-purple-100 text-purple-900'
                            : smartAction?.badgeColor === 'rose'
                            ? 'bg-rose-100 text-rose-900'
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        {smartAction?.badge}
                      </span>
                    </div>
                    <p className="text-xs text-stone-400 font-mono">
                      تاريخ الإنشاء:{' '}
                      {new Date(selectedOrderDetails.order.createdAt).toLocaleString('ar-JO')}
                    </p>
                  </div>

                  {!isCompletedOrder ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsDeliveryDrawerOpen(true)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 transition flex items-center gap-1.5"
                      >
                        <Settings className="w-3.5 h-3.5 text-stone-500" />
                        <span>إعدادات التوصيل</span>
                      </button>

                      <button
                        onClick={() => handleOpenManifest(selectedOrderDetails.order.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-stone-900 text-white hover:bg-stone-800 transition flex items-center gap-1.5"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>كشف التوصيل</span>
                      </button>

                      {!isDeliveredOrClosed && (
                        <button
                          onClick={() =>
                            setCancelPromptModal({
                              isOpen: true,
                              orderId: selectedOrderDetails.order.id,
                              orderReference: selectedOrderDetails.order.reference,
                              message: 'هل ترغب في إلغاء هذا الطلب كاملاً وعكس كافة قيوده المالية؟',
                            })
                          }
                          className="px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>إلغاء الطلب</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>مكتمل ومسوّى بالكامل</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Customer, City, Totals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl text-xs">
                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">العميلة</span>
                    <span className="font-bold text-stone-900 block mt-0.5">
                      {selectedOrderDetails.order.customerName}
                    </span>
                    <a
                      href={`tel:${selectedOrderDetails.order.customerPhone}`}
                      className="text-stone-600 font-mono text-[11px] hover:underline"
                      dir="ltr"
                    >
                      {selectedOrderDetails.order.customerPhone}
                    </a>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">وجهة التوصيل</span>
                    <span className="font-bold text-stone-900 block mt-0.5">
                      {selectedOrderDetails.order.deliveryJob?.city || selectedOrderDetails.order.shippingZoneNameSnapshot || 'عمان'}
                    </span>
                    <span className="text-stone-500 text-[10px] block truncate">
                      {selectedOrderDetails.order.deliveryJob?.addressDetails ||
                        selectedOrderDetails.order.notes ||
                        '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">الأصناف والمحلات</span>
                    <span className="font-bold text-stone-900 block mt-0.5">
                      {selectedOrderDetails.order.items.length} قطع
                    </span>
                    <span className="text-purple-700 font-bold text-[11px] block">
                      {selectedOrderDetails.order.fulfillmentOrders?.length || 1} محلات
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-stone-400 block font-medium">طريقة الدفع والإجمالي</span>
                    <span className="font-extrabold text-[#3F4832] font-mono text-sm block mt-0.5" dir="ltr">
                      {filsToDisplay(selectedOrderDetails.order.totalAmount)}
                    </span>
                    <span className="text-[10px] text-stone-500 block">
                      الدفع عند الاستلام (COD)
                    </span>
                  </div>
                </div>

                {/* THE SMART ACTION HERO CARD (الزر الرئيسي الذكي أو شريط الاكتمال) */}
                {isCompletedOrder ? (
                  <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 flex items-center justify-between text-emerald-950">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-emerald-950">
                          اكتملت دورة الطلب بنجاح (مكتمل ومسوّى بالكامل)
                        </h3>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          تم استلام الطرود وتسليمها للعميلة، وتحصيل النقد وتوريده بالكامل وإغلاق القيود المالية.
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl border border-emerald-200">
                      دورة الطلب مغلقة
                    </span>
                  </div>
                ) : (
                  smartAction && (
                    <div className="bg-gradient-to-br from-stone-900 to-[#2e3524] text-white p-5 rounded-2xl space-y-3 shadow-sm border border-stone-800">
                      <div className="flex items-center justify-between text-xs text-stone-300">
                        <span className="font-bold text-amber-400 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4" />
                          <span>الخطوة التالية الموصى بها</span>
                        </span>
                        <span className="font-mono text-[11px]">مرحلة الطلب: {smartAction.badge}</span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-white">{smartAction.title}</h3>
                        <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                          {smartAction.subtitle}
                        </p>
                      </div>

                      {smartAction.buttonText && (
                        <div className="pt-1">
                          <button
                            onClick={handleExecuteSmartAction}
                            disabled={isPending}
                            className={`w-full py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                              smartAction.buttonClass || 'bg-[#3F4832] text-white'
                            } disabled:opacity-50`}
                          >
                            {isPending ? (
                              <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4 rotate-180" />
                            )}
                            <span>{smartAction.buttonText}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* 4. Section 1: Customer WhatsApp Message Card (فقط للطلبات الجارية) */}
              {!isCompletedOrder && (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold text-stone-900">
                          رسالة واتساب المعتمدة للزبونة
                        </h3>
                        <p className="text-[11px] text-stone-400">
                          تتضمن تأكيد الطلب، التفاصيل، ورابط الفاتورة الإلكترونية الثابتة
                        </p>
                      </div>
                    </div>

                    {selectedOrderDetails.order.customerWhatsAppSentAt ? (
                      <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>تم توثيق الإرسال</span>
                      </span>
                    ) : (
                      <button
                        onClick={handleMarkWhatsAppSent}
                        className="text-[11px] text-stone-600 hover:text-stone-900 font-bold underline"
                      >
                        تحديد كـ "تم الإرسال"
                      </button>
                    )}
                  </div>

                  {/* Formatted message box */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-mono text-stone-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {selectedOrderDetails.customerWhatsApp?.text}
                  </div>

                  {/* Action buttons for Customer WhatsApp */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={selectedOrderDetails.customerWhatsApp?.waUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={handleMarkWhatsAppSent}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>فتح محادثة واتساب مع العميلة</span>
                    </a>

                    <button
                      onClick={() =>
                        copyToClipboard(selectedOrderDetails.customerWhatsApp?.text, 'msg')
                      }
                      className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      {copiedText ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedText ? 'تم النسخ!' : 'نسخ الرسالة'}</span>
                    </button>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          selectedOrderDetails.customerWhatsApp?.invoiceUrl,
                          'url'
                        )
                      }
                      className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      {copiedInvoiceUrl ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedInvoiceUrl ? 'تم نسخ الرابط!' : 'نسخ رابط الفاتورة فقط'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Telegram Admin Notification Card */}
              <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center text-base shrink-0 font-bold">
                      ✈️
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-900">
                        إشعار تيليجرام الإدارة (@rawaq_jo_bot)
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        تنبيه فوري للإدارة عند تسجيل الطلب الجديد
                      </p>
                    </div>
                  </div>

                  {selectedOrderDetails.order.telegramStatus === 'SENT' ? (
                    <span className="text-[11px] bg-emerald-50 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Telegram أُرسل بنجاح</span>
                    </span>
                  ) : selectedOrderDetails.order.telegramStatus === 'FAILED' ? (
                    <span className="text-[11px] bg-rose-50 text-rose-800 font-bold px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1 w-fit">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>إشعار فشل</span>
                    </span>
                  ) : (
                    <span className="text-[11px] bg-amber-50 text-amber-800 font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1 w-fit">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>قيد الإرسال / لم يُرسل</span>
                    </span>
                  )}
                </div>

                {selectedOrderDetails.order.telegramError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>سبب تعثر الإرسال:</span>
                    </div>
                    <p className="font-mono text-[11px]">{selectedOrderDetails.order.telegramError}</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                  <span className="text-stone-500 text-[11px]">
                    {selectedOrderDetails.order.telegramSentAt
                      ? `وقت الإرسال: ${new Date(selectedOrderDetails.order.telegramSentAt).toLocaleString('ar-JO')}`
                      : 'لم يتم توثيق وقت إرسال ناجح حتى الآن'}
                  </span>

                  <button
                    onClick={() => handleRetryTelegram(selectedOrderDetails.order.id)}
                    disabled={isRetryingTelegram}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isRetryingTelegram ? 'جاري الإرسال...' : 'إعادة إرسال إشعار Telegram الآن'}</span>
                  </button>
                </div>
              </div>

              {/* 5. Section 2: Shop Fulfillment Banner (انتقال لمركز متابعة المحلات والطرود - للطلبات الجارية فقط) */}
              {!isCompletedOrder && (
                <div id="suppliers-section" className="bg-gradient-to-r from-purple-50 via-stone-50 to-purple-50 rounded-3xl border border-purple-200/80 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
                      <Store className="w-5 h-5 text-purple-700" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-stone-900">
                          أوامر تجهيز المحلات والطرود
                        </h3>
                        <span className="text-xs font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                          {selectedOrderDetails.order.fulfillmentOrders?.length || 0} محلات
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        تم نقل إدارة وتجهيز طرود المحلات إلى قسم متابعة المحلات المخصص مع إمكانية استعراض كافة تفاصيل الطلبات هناك
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/orders/shops"
                    className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs shrink-0"
                  >
                    <Store className="w-4 h-4" />
                    <span>فتح متابعة المحلات والطرود 🏬</span>
                  </Link>
                </div>
              )}

              {/* 6. Section 3: Immutable Invoice Details (الفاتورة الثابتة) */}
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-stone-900">
                        الفاتورة المالية الثابتة (Immutable Invoice)
                      </h3>
                      <p className="text-[11px] text-stone-400">
                        نسخة رقمية موثقة غير قابلة للتعديل من قبل العميل
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`/invoice/view/${selectedOrderDetails.invoice?.secureToken || selectedOrderDetails.order.reference}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-stone-800 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-xl transition flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>معاينة الفاتورة</span>
                    </a>
                  </div>
                </div>

                {/* Shortage / Adjustment Notice Banner */}
                {selectedOrderDetails.order.hasAdjustment && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>تم إجراء تعديل على الطلب والفاتورة بناءً على التجهيز الفعلي</span>
                      </div>
                      {selectedOrderDetails.order.previousTotalAmount && (
                        <div className="font-mono text-[11px] text-amber-800">
                          الإجمالي السابق: {filsToDisplay(selectedOrderDetails.order.previousTotalAmount)}
                        </div>
                      )}
                    </div>
                    {selectedOrderDetails.order.adjustmentNotes && (
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        {selectedOrderDetails.order.adjustmentNotes}
                      </p>
                    )}
                  </div>
                )}

                {/* Items & Financial Table */}
                <div className="border border-stone-100 rounded-2xl overflow-hidden">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-50 border-b border-stone-100 text-stone-500 font-bold">
                      <tr>
                        <th className="p-3">الصنف والمواصفات</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-left">السعر</th>
                        <th className="p-3 text-left">الإجمالي</th>
                        {!isDeliveredOrClosed && (
                          <th className="p-3 text-center">إجراءات النواقص</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {selectedOrderDetails.order.items.map((item: any) => {
                        const isRemoved = item.isRemoved;
                        const hasShortage = !isRemoved && (
                          item.missingQuantity > 0 ||
                          item.fulfillmentItems?.some((fi: any) => fi.isOutOfStock)
                        );
                        const shortageReason = item.removalReason || item.fulfillmentItems?.find((fi: any) => fi.outOfStockReason)?.outOfStockReason;

                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors ${
                              isRemoved
                                ? 'bg-rose-50/40 text-stone-400'
                                : hasShortage
                                ? 'bg-amber-50/60'
                                : 'hover:bg-stone-50/50'
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`font-bold block ${
                                    isRemoved ? 'line-through text-stone-400' : 'text-stone-900'
                                  }`}
                                >
                                  {item.name}
                                </span>
                                {isRemoved && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                                    مستبعد: {item.removalReason || 'غير متوفر'}
                                  </span>
                                )}
                                {hasShortage && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                    ⚠️ تم الإبلاغ عن نقص ({item.missingQuantity || 1} قطعة)
                                  </span>
                                )}
                              </div>
                              {item.size && item.size !== 'افتراضي' && (
                                <div className="text-[11px] text-stone-500 mt-0.5">
                                  المقاس: {item.size}
                                </div>
                              )}
                              {hasShortage && shortageReason && (
                                <p className="text-[11px] text-amber-800 mt-1">
                                  سبب المحل: {shortageReason}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-center font-bold font-mono text-stone-700">
                              {isRemoved ? <span className="line-through">{item.quantity}</span> : item.quantity}
                            </td>
                            <td className="p-3 text-left font-mono text-stone-600" dir="ltr">
                              {filsToDisplay(item.unitPrice)}
                            </td>
                            <td className="p-3 text-left font-bold font-mono text-stone-900" dir="ltr">
                              {isRemoved ? (
                                <span className="line-through text-stone-400">0.00 د.أ</span>
                              ) : (
                                filsToDisplay(item.total)
                              )}
                            </td>
                            {!isDeliveredOrClosed && (
                              <td className="p-3 text-center">
                                {!isRemoved && hasShortage ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      disabled={isSubmittingAdjustment}
                                      onClick={() => handleRemoveShortageItem(item.id, item.name)}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition"
                                    >
                                      حذف وتعديل الفاتورة
                                    </button>
                                    <button
                                      type="button"
                                      disabled={isSubmittingAdjustment}
                                      onClick={() => {
                                        setReplacementModalItem(item);
                                        setReplacementQuantity(item.quantity);
                                        setSelectedReplacementVariant(null);
                                        setReplacementSearchResults([]);
                                        setReplacementSearchQuery('');
                                      }}
                                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-[#3F4832] text-white hover:bg-[#2d3424] shadow-xs transition"
                                    >
                                      استبدال ببديل
                                    </button>
                                  </div>
                                ) : isRemoved ? (
                                  <span className="text-[11px] text-stone-400 italic">تم الاستبعاد</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveShortageItem(item.id, item.name)}
                                    className="text-[10px] text-stone-400 hover:text-rose-600 transition"
                                  >
                                    حذف صنف
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Item Button */}
                {!isDeliveredOrClosed && (
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
                      تحديث الفاتورة وإشعار المحل يتم آلياً
                    </span>
                  </div>
                )}

                {/* Totals Breakdown */}
                <div className="bg-stone-50 p-4 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono" dir="ltr">
                      {filsToDisplay(
                        selectedOrderDetails.order.totalAmount -
                          selectedOrderDetails.order.shippingCost +
                          selectedOrderDetails.order.discountAmount
                      )}
                    </span>
                  </div>

                  {selectedOrderDetails.order.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>الخصومات المطبقة:</span>
                      <span className="font-mono" dir="ltr">
                        -{filsToDisplay(selectedOrderDetails.order.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-stone-600">
                    <span>رسوم التوصيل:</span>
                    <span className="font-mono" dir="ltr">
                      {filsToDisplay(selectedOrderDetails.order.shippingCost)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-stone-200 flex justify-between items-baseline">
                    <span className="font-extrabold text-stone-900 text-sm">
                      المبلغ الإجمالي النهائي:
                    </span>
                    <span className="font-black text-base text-[#3F4832] font-mono" dir="ltr">
                      {filsToDisplay(selectedOrderDetails.order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Delivery Quick Sheet / Drawer (نافذة جانبية لإعدادات التوصيل) */}
      {isDeliveryDrawerOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-5 animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#3F4832]" />
                <h3 className="font-extrabold text-base text-stone-900">
                  إعدادات التوصيل والمناديب السريعة
                </h3>
              </div>
              <button
                onClick={() => setIsDeliveryDrawerOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">إسناد المندوب (Captain):</label>
                <select
                  value={selectedCaptainId}
                  onChange={(e) => setSelectedCaptainId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3F4832]"
                >
                  <option value="">اختر مندوباً للطلب...</option>
                  {captains.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">شركة التوصيل أو الناقل:</label>
                <input
                  type="text"
                  value={courierCompanyInput}
                  onChange={(e) => setCourierCompanyInput(e.target.value)}
                  placeholder="مثال: مناديب رَواق، أرامكس، شركة التوصيل..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3F4832]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 block">ملاحظات التوصيل للمندوب:</label>
                <textarea
                  rows={3}
                  value={deliveryNotesInput}
                  onChange={(e) => setDeliveryNotesInput(e.target.value)}
                  placeholder="ملاحظات حول العنوان، وقت التسليم المفضل للزبونة..."
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3F4832]"
                />
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center gap-2">
                <button
                  onClick={handleSaveDeliveryQuickSettings}
                  disabled={isPending}
                  className="flex-1 bg-[#3F4832] hover:bg-[#2e3524] text-white font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
                >
                  {isPending ? 'جاري الحفظ...' : 'حفظ بيانات التوصيل'}
                </button>
                <button
                  onClick={() => setIsDeliveryDrawerOpen(false)}
                  className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Shop Temporary Link Modal */}
      {supplierSessionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-stone-900">
                رابط المحل المؤقت جاهز للمشاركة
              </h3>
              <button
                onClick={() => setSupplierSessionModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="text-stone-600 leading-relaxed">
                تم إنشاء رابط مؤمن لصالح المحل لمدة 72 ساعة. يمكنك فتح محادثة واتساب مع المحل مباشرة أو نسخ الرابط:
              </div>

              {supplierSessionModal.whatsappUrl && (
                <a
                  href={supplierSessionModal.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm"
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
                    value={supplierSessionModal.magicUrl}
                    className="text-xs font-mono text-stone-800 bg-transparent border-none flex-1 focus:outline-none select-all px-1"
                  />
                  <button
                    onClick={() => copyToClipboard(supplierSessionModal.magicUrl, 'url')}
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
                  {supplierSessionModal.whatsappMessage}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => copyToClipboard(supplierSessionModal.whatsappMessage, 'msg')}
                  className="flex-1 bg-stone-800 hover:bg-stone-900 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ نص الرسالة</span>
                </button>

                <a
                  href={supplierSessionModal.magicUrl}
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

      {/* 6. Delivery Manifest Modal */}
      {manifestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  كشف استلام وتسليم (Delivery Manifest)
                </h3>
                <span className="text-xs text-stone-500 font-mono">
                  طلب #{manifestModal.orderReference}
                </span>
              </div>
              <button
                onClick={() => setManifestModal(null)}
                className="text-stone-400 hover:text-stone-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Pickup Stops */}
              <div className="space-y-2">
                <div className="font-bold text-stone-700">1. محطات الاستلام من المحلات:</div>
                <div className="space-y-2">
                  {manifestModal.pickupStops.map((stop: any) => (
                    <div
                      key={stop.sequence}
                      className="bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900 text-sm">
                            {stop.sequence}. {stop.supplierName}
                          </span>
                          {stop.ownerName && (
                            <span className="text-[11px] text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded mr-2 font-medium">
                              المسؤول: {stop.ownerName}
                            </span>
                          )}
                        </div>
                        <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-200">
                          {stop.packages.length} طرد
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-600 text-[11px]">
                        <span>📞 {stop.contactPhone}</span>
                        <span>•</span>
                        <span>🏠 {stop.pickupLocation}</span>
                        {stop.mapLocationUrl && (
                          <>
                            <span>•</span>
                            <a
                              href={stop.mapLocationUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-bold underline"
                            >
                              موقع المحل على الخريطة 📍
                            </a>
                          </>
                        )}
                      </div>

                      <div className="pt-1 flex flex-wrap gap-1">
                        {stop.packages.map((pkg: any) => (
                          <span
                            key={pkg.packageCode}
                            className="bg-white px-2 py-0.5 rounded border border-stone-200 font-mono text-[11px]"
                          >
                            {pkg.packageCode}: {pkg.itemsSummary}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dropoff Destination */}
              <div className="space-y-2">
                <div className="font-bold text-stone-700">2. وجهة التسليم للزبونة:</div>
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900">
                      {manifestModal.dropoff.recipientName} ({manifestModal.dropoff.recipientPhone})
                    </span>
                    <span className="text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded font-extrabold">
                      {manifestModal.dropoff.isCodPrepaid
                        ? 'مدفوع مسبقاً (0 د.أ)'
                        : `تحصيل: ${(manifestModal.dropoff.codAmountFils / 1000).toFixed(2)} د.أ`}
                    </span>
                  </div>
                  <div className="text-stone-600 text-[11px]">
                    {manifestModal.dropoff.city} - {manifestModal.dropoff.area} (
                    {manifestModal.dropoff.addressDetails})
                  </div>
                </div>
              </div>

              {/* Formatted Text Box */}
              <div className="space-y-1.5">
                <div className="font-bold text-stone-700">نص الكشف المنسق لواتساب المندوب:</div>
                <div className="bg-stone-900 text-stone-100 p-3 rounded-xl text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {manifestModal.formattedWhatsAppText}
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => copyToClipboard(manifestModal.formattedWhatsAppText, 'msg')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <Copy className="w-4 h-4" />
                  <span>نسخ كشف التوصيل لواتساب</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Product Replacement Modal (نافذة استبدال صنف ناقص بمنتج بديل) */}
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
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <span className="text-stone-400 font-bold block text-[11px]">الصنف الحالي المستبدل</span>
                <div className="font-bold text-stone-800">
                  {replacementModalItem.name} {replacementModalItem.size ? `(${replacementModalItem.size})` : ''}
                </div>
                <div className="text-stone-500 font-mono">
                  سعر القطعة: {filsToDisplay(replacementModalItem.unitPrice)} • الكمية: {replacementModalItem.quantity}
                </div>
              </div>

              <div>
                <label className="font-bold text-stone-700 block mb-1">
                  البحث عن صنف بديل من الكتالوج:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={replacementSearchQuery}
                    onChange={(e) => handleSearchReplacements(e.target.value)}
                    placeholder="ابحث باسم المنتج البديل..."
                    className="flex-1 p-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#3F4832] text-xs"
                  />
                </div>
              </div>

              {/* Search Results */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-stone-100 rounded-xl p-2 bg-stone-50/50">
                {isSearchingReplacements && (
                  <p className="text-center text-stone-400 py-3">جارٍ البحث في الكتالوج...</p>
                )}
                {!isSearchingReplacements && replacementSearchResults.length === 0 && (
                  <p className="text-center text-stone-400 py-3">
                    {replacementSearchQuery.length >= 2 ? 'لا توجد منتجات مطابقة' : 'اكتب حرفين على الأقل للبحث'}
                  </p>
                )}
                {replacementSearchResults.map((prod) => {
                  const isSelected = selectedReplacementVariant?.variantId === prod.variantId;
                  return (
                    <div
                      key={prod.variantId}
                      onClick={() => setSelectedReplacementVariant(prod)}
                      className={`p-2.5 rounded-xl cursor-pointer border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-white border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-stone-900">{prod.productName}</div>
                        {prod.variantTitle && prod.variantTitle !== 'افتراضي' && (
                          <div className="text-stone-500 text-[11px]">
                            المقاس: {prod.variantTitle}
                          </div>
                        )}
                      </div>
                      <div className="text-left font-mono font-bold text-stone-900">
                        {filsToDisplay(prod.price)}
                      </div>
                    </div>
                  );
                })}
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
      {addItemModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#3F4832]/10 text-[#3F4832] flex items-center justify-center">
                  <PlusCircle className="w-5 h-5 text-[#3F4832]" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-stone-900">
                    إضافة منتج للطلب #{selectedOrderDetails.order.reference}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    سيتم تحديث الفاتورة والمجموع تلقائياً وإخطار المحل بتجهيز الصنف
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

      {/* 8. Cancel Order Modal (نافذة إلغاء الطلب كاملاً) */}
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

      {/* 9. Reward / Free Delivery Threshold Financial Safeguard Modal */}
      {rewardThresholdModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="font-extrabold text-stone-900 text-sm">
                    تنبيه مالي: فقدان استحقاق التوصيل المجاني
                  </h3>
                  <span className="text-[11px] text-stone-500 font-mono">
                    طلب #{rewardThresholdModal.orderReference}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setRewardThresholdModal(null)}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-amber-950 space-y-2">
                <p className="leading-relaxed">
                  حذف صنف <strong className="text-amber-900 font-bold">({rewardThresholdModal.itemName})</strong> سيخفض إجمالي المشتريات من{' '}
                  <strong className="font-mono">{filsToDisplay(rewardThresholdModal.currentSubtotal)}</strong> إلى{' '}
                  <strong className="font-mono text-rose-700">{filsToDisplay(rewardThresholdModal.futureSubtotal)}</strong>.
                </p>
                <p className="leading-relaxed text-[11px] text-amber-800 border-t border-amber-200/60 pt-2">
                  هذه القيمة أصبحت أقل من الحد الأدنى للحصول على{' '}
                  <strong className="font-semibold">{rewardThresholdModal.ruleName}</strong> وهو{' '}
                  <strong className="font-mono">{filsToDisplay(rewardThresholdModal.threshold)}</strong>.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 space-y-2 text-stone-700 text-[11px]">
                <div className="flex justify-between">
                  <span>رسوم التوصيل النظامية للمنطقة:</span>
                  <span className="font-mono font-bold">{filsToDisplay(rewardThresholdModal.shippingFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span>الإجمالي مع احتساب رسوم التوصيل (الوضع الآمن):</span>
                  <span className="font-mono font-black text-stone-900">
                    {filsToDisplay(rewardThresholdModal.futureSubtotal + rewardThresholdModal.shippingFee)}
                  </span>
                </div>
                <div className="flex justify-between text-amber-800">
                  <span>الإجمالي في حال استثناء العميل (إبقاء المجاني):</span>
                  <span className="font-mono font-bold">
                    {filsToDisplay(rewardThresholdModal.futureSubtotal)}
                  </span>
                </div>
              </div>

              <p className="text-stone-500 text-[11px] leading-relaxed">
                وفقاً لسياسة الأمان المالي لمنع الخسائر والثغرات، لا يمكن للعميل الاحتفاظ بالمكافأة إلا إذا منحت الإدارة موافقة استثنائية صريحة.
              </p>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={isSubmittingAdjustment}
                  onClick={() =>
                    executeRemoveShortageItem(
                      rewardThresholdModal.orderItemId,
                      rewardThresholdModal.itemName,
                      false
                    )
                  }
                  className="w-full bg-[#3F4832] hover:bg-[#2d3424] text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>إلغاء التوصيل المجاني واحتساب الرسوم (آمن - موصى به)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingAdjustment}
                  onClick={() =>
                    executeRemoveShortageItem(
                      rewardThresholdModal.orderItemId,
                      rewardThresholdModal.itemName,
                      true
                    )
                  }
                  className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  <span>الموافقة كإدارة على استمرار التوصيل المجاني استثناءً</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingAdjustment}
                  onClick={() => setRewardThresholdModal(null)}
                  className="w-full py-2 text-stone-500 hover:text-stone-800 font-medium text-xs text-center"
                >
                  إلغاء والتراجع
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
