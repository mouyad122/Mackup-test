'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  Search,
  Filter,
  RotateCcw,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  User,
  ShoppingBag,
  Store,
  Truck,
  DollarSign,
  FileSpreadsheet,
  Tag,
  KeyRound,
  ArrowLeft,
  ChevronDown,
} from 'lucide-react';
import OrderLifecycleTimelineModal from '@/components/OrderLifecycleTimelineModal';

export interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  employeeId: string | null;
  employeeName: string | null;
  actorType: string;
  actorId: string | null;
  actorNameSnapshot: string | null;
  category: string;
  severity: string;
  outcome: string;
  eventKey: string | null;
  requestId: string | null;
  correlationId: string | null;
  reason: string | null;
  changes: any;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  customerName?: string | null;
  amountFormatted?: string | null;
  itemsCount?: number | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
}

interface Props {
  logs: AuditLogItem[];
  employees: { id: string; name: string }[];
  activeView: string;
  activeCategory: string;
  activeShortcut: string;
  viewCounts: {
    all: number;
    needsAction: number;
    sensitive: number;
  };
  categoryCounts: Record<string, number>;
  stats: {
    todayTotal: number;
    todayCritical: number;
    todayDenied: number;
    totalMatching: number;
  };
  pagination: {
    page: number;
    totalPages: number;
    limit: number;
  };
}

// الأقسام السبعة الأساسية المعتمدة في رَواق
const CATEGORIES: {
  id: string;
  label: string;
  badge: string;
  icon: any;
  color: string;
  activeBg: string;
}[] = [
  {
    id: 'ORDERS',
    label: 'الطلبات',
    badge: 'طلب',
    icon: ShoppingBag,
    color: 'border-blue-200 text-blue-900 bg-blue-50',
    activeBg: 'bg-blue-900 text-white border-blue-900',
  },
  {
    id: 'SUPPLIERS',
    label: 'الموردون والمحلات',
    badge: 'محل',
    icon: Store,
    color: 'border-purple-200 text-purple-900 bg-purple-50',
    activeBg: 'bg-purple-900 text-white border-purple-900',
  },
  {
    id: 'DELIVERY',
    label: 'شركة التوصيل',
    badge: 'توصيل',
    icon: Truck,
    color: 'border-amber-200 text-amber-900 bg-amber-50',
    activeBg: 'bg-amber-900 text-white border-amber-900',
  },
  {
    id: 'ACCOUNTING',
    label: 'الماليات والتسويات',
    badge: 'مالي',
    icon: DollarSign,
    color: 'border-emerald-200 text-emerald-900 bg-emerald-50',
    activeBg: 'bg-emerald-900 text-white border-emerald-900',
  },
  {
    id: 'REPORTS',
    label: 'التقارير الرسمية',
    badge: 'تقرير',
    icon: FileSpreadsheet,
    color: 'border-teal-200 text-teal-900 bg-teal-50',
    activeBg: 'bg-teal-900 text-white border-teal-900',
  },
  {
    id: 'PRODUCTS',
    label: 'المنتجات والأسعار',
    badge: 'منتج',
    icon: Tag,
    color: 'border-indigo-200 text-indigo-900 bg-indigo-50',
    activeBg: 'bg-indigo-900 text-white border-indigo-900',
  },
  {
    id: 'SECURITY',
    label: 'الدخول والأمان والصلاحيات',
    badge: 'أمان',
    icon: KeyRound,
    color: 'border-rose-200 text-rose-900 bg-rose-50',
    activeBg: 'bg-rose-900 text-white border-rose-900',
  },
];

const ACTION_NARRATIVE_TITLES: Record<string, string> = {
  // الطلبات
  ORDER_CONFIRMED: 'تم تأكيد طلب',
  ORDER_CANCELLED: 'تم إلغاء طلب',
  ORDER_CREATED: 'تم إنشاء طلب جديد',
  ORDER_ITEM_ADJUSTED: 'تم تعديل صنف في طلب',
  ORDER_STATUS_UPDATED: 'تحديث حالة مسار الطلب',
  UPDATE_ORDER_STATUS: 'تحديث حالة الطلب',
  INVOICE_ISSUED: 'إصدار فاتورة إلكترونية معتمدة',
  INVOICE_CORRECTION_ISSUED: 'إصدار تصحيح للفاتورة',

  // الموردون والمحلات
  SUPPLIER_ACCESS_ISSUED: 'إصدار رابط وصول للمحل',
  SUPPLIER_ACCESS_REVOKED: 'إلغاء رابط المحل',
  SUPPLIER_ITEM_SHORTAGE_REPORTED: 'بلاغ نقص من المورد',
  SUPPLIER_ORDER_READY: 'تأكيد جاهزية طلب من المحل',
  PACKAGE_PICKUP_VERIFIED: 'توثيق استلام طرد من المحل',
  SUPPLIER_CREATED: 'إضافة محل / مورد جديد',
  SUPPLIER_UPDATED: 'تعديل بيانات المحل',
  SUPPLIER_DELETED: 'حذف بيانات مورد',

  // شركة التوصيل
  DELIVERY_BATCH_CREATED: 'إنشاء طلبية توصيل مجمعة',
  DELIVERY_BATCH_UPDATED: 'تعديل كشف التوصيل',
  DELIVERY_BATCH_APPROVED: 'اعتماد كشف التوصيل',
  DELIVERY_BATCH_CANCELLED: 'إلغاء كشف التوصيل',
  DELIVERY_BATCH_STATUS_UPDATED: 'تحديث مسار كشف التوصيل',
  DELIVERY_CONFIRMED: 'تم تسليم الطلب للزبونة',
  ORDER_DELIVERY_COST_UPDATED: 'تعديل تكلفة شركة التوصيل',
  SHIPPING_ZONE_UPDATED: 'تعديل مناطق الشحن ورسوم التوصيل',

  // الماليات والتسويات
  COD_REMITTANCE_RECORDED: 'تسجيل توريد مالي COD',
  DELIVERY_BATCH_RECONCILED: 'تسوية ومقاصة طلبية توصيل',
  SUPPLIER_SETTLEMENT_APPROVED: 'اعتماد دفعة مالية للمحل',
  SUPPLIER_PAYMENT_RECORDED: 'تسجيل سند صرف للمحل',
  SETTLEMENT_REVERSED: 'عكس تسوية مالية',
  EXPENSE_CREATED: 'تسجيل مصروف تشغيلي',
  TAX_SETTINGS_UPDATED: 'تعديل إعدادات الضريبة',
  POS_CHECKOUT: 'إتمام عملية بيع نقطة بيع',
  POS_REFUND: 'استرداد بيع نقدي',

  // التقارير الرسمية
  OFFICIAL_REPORT_ISSUED: 'إصدار تقرير رسمي معتمد',
  OFFICIAL_REPORT_APPROVED: 'اعتماد وختم تقرير رسمي',
  OFFICIAL_REPORT_VIEWED: 'معاينة تقرير رسمي',
  OFFICIAL_REPORT_DOWNLOADED: 'تنزيل نسخة تقرير رسمي',
  OFFICIAL_REPORT_SHARED: 'مشاركة رابط تقرير رسمي',
  OFFICIAL_REPORT_REVOKED: 'إلغاء أو استبدال تقرير رسمي',

  // المنتجات والأسعار
  CREATE_PRODUCT: 'إضافة منتج جديد',
  UPDATE_PRODUCT: 'تعديل بيانات منتج',
  DELETE_PRODUCT: 'حذف منتج',
  PRODUCT_PRICING_UPDATED: 'تعديل أسعار المنتجات',
  INVENTORY_ADJUSTED: 'تسوية وجرد مخزون عيني',
  RETURN_INSPECTED: 'فحص وتقييم مرتجع',

  // الدخول والأمان والصلاحيات
  SESSION_CREATED: 'تسجيل دخول ناجح',
  SESSION_REVOKED: 'إنهاء جلسة مستخدم',
  SESSIONS_REVOKED: 'إنهاء كافة الجلسات النشطة',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'محاولة وصول غير مصرح',
  PERMISSION_DENIED: 'رفض صلاحية وصول',
  EMPLOYEE_CREATED: 'إضافة حساب موظف جديد',
  EMPLOYEE_UPDATED: 'تعديل بيانات موظف',
  EMPLOYEE_DELETED: 'حذف حساب موظف',
  EMPLOYEE_DEACTIVATED_INSTEAD_OF_DELETE: 'تعطيل حساب موظف لحماية السجلات',
  EMPLOYEE_STATUS_TOGGLED: 'تغيير حالة تفعيل موظف',
  PERMISSION_OVERRIDE_ADDED: 'منح استثناء صلاحية',
  FORCE_PASSWORD_CHANGE: 'إلزام تغيير كلمة المرور',
  SITE_SETTINGS_UPDATED: 'تعديل إعدادات المتجر العامة',
};

const STATUS_LABELS_AR: Record<string, string> = {
  PENDING: 'بانتظار المراجعة',
  CONFIRMED: 'مؤكد',
  PROCESSING: 'قيد التجهيز',
  READY_FOR_PICKUP: 'جاهز للاستلام',
  OUT_FOR_DELIVERY: 'في الطريق للتسليم',
  SHIPPED: 'تم الشحن',
  DELIVERED: 'تم التسليم',
  CANCELLED: 'ملغي',
  RETURNED: 'مرتجع',
  REFUNDED: 'مسترد',
  DRAFT: 'مسودة',
  APPROVED: 'معتمد',
  RECONCILED: 'تمت التسوية',
};

export function AuditLogsClient({
  logs,
  employees,
  activeView,
  activeCategory,
  activeShortcut,
  viewCounts,
  categoryCounts,
  stats,
  pagination,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Selected log for detailed 4-group inspection modal
  const [activeLog, setActiveLog] = useState<AuditLogItem | null>(null);

  // Selected order reference for lifecycle timeline modal
  const [timelineOrderRef, setTimelineOrderRef] = useState<string | null>(null);

  // Filter state
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || '');
  const [outcome, setOutcome] = useState(searchParams.get('outcome') || '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') || '');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  React.useEffect(() => {
    setQ(searchParams.get('q') || '');
    setSeverity(searchParams.get('severity') || '');
    setOutcome(searchParams.get('outcome') || '');
    setEmployeeId(searchParams.get('employeeId') || '');
  }, [searchParams]);

  const updateFilters = (override: {
    view?: string;
    category?: string;
    shortcut?: string;
    q?: string;
    severity?: string;
    outcome?: string;
    employeeId?: string;
  }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (override.view !== undefined) {
      if (override.view === 'all') params.delete('view');
      else params.set('view', override.view);
    }

    if (override.category !== undefined) {
      if (!override.category) params.delete('category');
      else params.set('category', override.category);
    }

    if (override.shortcut !== undefined) {
      if (!override.shortcut) params.delete('shortcut');
      else params.set('shortcut', override.shortcut);
    }

    if (override.q !== undefined) {
      if (!override.q.trim()) params.delete('q');
      else params.set('q', override.q.trim());
    }

    if (override.severity !== undefined) {
      if (!override.severity) params.delete('severity');
      else params.set('severity', override.severity);
    }

    if (override.outcome !== undefined) {
      if (!override.outcome) params.delete('outcome');
      else params.set('outcome', override.outcome);
    }

    if (override.employeeId !== undefined) {
      if (!override.employeeId) params.delete('employeeId');
      else params.set('employeeId', override.employeeId);
    }

    params.set('page', '1');

    startTransition(() => {
      router.push(`/admin/logs?${params.toString()}`);
    });
  };

  const applySearch = () => {
    updateFilters({ q });
  };

  const clearAllFilters = () => {
    setQ('');
    setSeverity('');
    setOutcome('');
    setEmployeeId('');
    startTransition(() => {
      router.push('/admin/logs');
    });
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    startTransition(() => {
      router.push(`/admin/logs?${params.toString()}`);
    });
  };

  // Helper to resolve linked destination
  const getLinkedResource = (item: AuditLogItem) => {
    const correlation = item.correlationId || item.entityId;
    if (item.category === 'ORDERS' || item.entityType.toLowerCase() === 'order') {
      return { href: `/admin/orders`, label: `الطلب (${correlation.slice(0, 10)})` };
    }
    if (item.category === 'DELIVERY' || item.entityType === 'DeliveryBatch') {
      return { href: `/admin/settings?tab=batches`, label: `كشف التوصيل (${correlation.slice(0, 10)})` };
    }
    if (item.category === 'REPORTS') {
      return { href: `/admin/reports`, label: `مركز التقارير الرسمية` };
    }
    if (item.category === 'ACCOUNTING') {
      return { href: `/admin/reconciliation`, label: `مركز الجرد والتسويات` };
    }
    if (item.category === 'SUPPLIERS') {
      return { href: `/admin/orders/shops`, label: `متابعة المحلات والطرود` };
    }
    if (item.category === 'PRODUCTS') {
      return { href: `/admin/products`, label: `المنتجات والأسعار` };
    }
    if (item.entityType === 'Employee') {
      return { href: `/admin/employees`, label: `إدارة الموظفين` };
    }
    return null;
  };

  // استخراج الكيان والجهة المرتبطة بصيغة سردية واضحة
  const formatEntitySubtitle = (item: AuditLogItem) => {
    const ref = item.correlationId || item.entityId;
    if (item.category === 'ORDERS' || item.entityType.toLowerCase() === 'order') {
      const orderRef = ref.startsWith('#') ? ref : `#${ref}`;
      if (item.customerName) {
        return `الطلب ${orderRef} — العميلة: ${item.customerName}`;
      }
      return `الطلب ${orderRef}`;
    }

    if (item.category === 'DELIVERY' || item.entityType === 'DeliveryBatch') {
      if (item.amountFormatted) {
        return `شركة التوصيل — ${item.amountFormatted} د.أ`;
      }
      return `شركة التوصيل — كشف ${ref}`;
    }

    if (item.category === 'SUPPLIERS' || item.entityType === 'Supplier') {
      const shopName =
        item.changes?.shopName ||
        item.details?.shopName ||
        item.details?.supplierName ||
        item.actorNameSnapshot;
      if (shopName) {
        return `المحل: ${shopName} — ${ref}`;
      }
      return `المحل / المورد: ${ref}`;
    }

    if (item.category === 'ACCOUNTING') {
      if (item.amountFormatted) {
        return `المعاملة المالية (${ref}) — المبلغ: ${item.amountFormatted} د.أ`;
      }
      return `سند مالي: ${ref}`;
    }

    if (item.category === 'REPORTS') {
      return `تقرير رسمي: ${ref}`;
    }

    if (item.category === 'PRODUCTS') {
      const prodTitle = item.changes?.title || item.details?.title || ref;
      return `المنتج: ${prodTitle}`;
    }

    if (item.category === 'SECURITY') {
      return `حساب / جلسة: ${item.employeeName || item.actorNameSnapshot || ref}`;
    }

    return `المرجع: ${ref}`;
  };

  // استخراج المنفذ بصيغة سردية واضحة
  const formatActorNarrative = (item: AuditLogItem) => {
    const name = item.actorNameSnapshot || item.employeeName || 'غير محدد';
    if (item.actorType === 'ADMIN') {
      return `بواسطة: ${name} — موظف إداري`;
    }
    if (item.actorType === 'SUPPLIER') {
      return `بواسطة: جلسة المحل (${name})`;
    }
    if (item.actorType === 'COURIER') {
      return `بواسطة: مندوب / شركة التوصيل (${name})`;
    }
    if (item.actorType === 'SYSTEM') {
      return `بواسطة: النظام الآلي لرَواق`;
    }
    return `بواسطة: ${name}`;
  };

  return (
    <div className="space-y-6 font-sans" dir="rtl">
      {/* ── 1. Top Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-600">
              <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
              مركز النشاط والتدقيق
            </h1>
          </div>
          <p className="mt-1 text-xs md:text-sm text-stone-600 font-medium">
            متابعة العمليات والإجراءات داخل رَواق · سجل موثق ذرياً وغير قابل للتعديل
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-3.5 py-1 text-xs font-mono font-bold text-stone-700 border border-stone-200">
            توقيت عمّان الرسمي (GMT+3)
          </span>
        </div>
      </header>

      {/* ── 2. Top 3 Views Pills ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => updateFilters({ view: 'all' })}
          className={`flex items-center justify-between rounded-2xl p-4 border text-right transition-all cursor-pointer ${
            activeView === 'all'
              ? 'border-[#2d3623] bg-[#2d3623] text-white shadow-md'
              : 'border-stone-200 bg-white text-stone-800 hover:border-stone-300 hover:bg-stone-50/80 shadow-xs'
          }`}
        >
          <div>
            <span className={`text-xs font-bold block ${activeView === 'all' ? 'text-stone-200' : 'text-stone-500'}`}>
              كل العمليات
            </span>
            <strong className="text-lg md:text-xl font-extrabold block mt-0.5">
              عرض شامل
            </strong>
          </div>
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold border ${
              activeView === 'all'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {viewCounts.all.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateFilters({ view: 'needs_action' })}
          className={`flex items-center justify-between rounded-2xl p-4 border text-right transition-all cursor-pointer ${
            activeView === 'needs_action'
              ? 'border-rose-700 bg-rose-700 text-white shadow-md'
              : 'border-rose-200 bg-rose-50/50 text-rose-950 hover:border-rose-300 hover:bg-rose-100/60 shadow-xs'
          }`}
        >
          <div>
            <span className={`text-xs font-bold block ${activeView === 'needs_action' ? 'text-rose-100' : 'text-rose-700'}`}>
              تحتاج متابعة
            </span>
            <strong className="text-lg md:text-xl font-extrabold block mt-0.5">
              الأخطاء والفشل
            </strong>
          </div>
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold border ${
              activeView === 'needs_action'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-rose-100 text-rose-800 border-rose-200'
            }`}
          >
            {viewCounts.needsAction.toLocaleString()}
          </span>
        </button>

        <button
          type="button"
          onClick={() => updateFilters({ view: 'sensitive' })}
          className={`flex items-center justify-between rounded-2xl p-4 border text-right transition-all cursor-pointer ${
            activeView === 'sensitive'
              ? 'border-amber-700 bg-amber-700 text-white shadow-md'
              : 'border-amber-200 bg-amber-50/50 text-amber-950 hover:border-amber-300 hover:bg-amber-100/60 shadow-xs'
          }`}
        >
          <div>
            <span className={`text-xs font-bold block ${activeView === 'sensitive' ? 'text-amber-100' : 'text-amber-700'}`}>
              عمليات حساسة
            </span>
            <strong className="text-lg md:text-xl font-extrabold block mt-0.5">
              المالية والأمان
            </strong>
          </div>
          <span
            className={`rounded-full px-3 py-1 font-mono text-xs font-bold border ${
              activeView === 'sensitive'
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            {viewCounts.sensitive.toLocaleString()}
          </span>
        </button>
      </section>

      {/* ── 3. Search and Quick Shortcuts ── */}
      <section className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search input bar */}
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="absolute inset-inline-start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
              placeholder="البحث في السجلات: رقم الطلب، اسم العميلة، اسم الموظف، اسم المحل، رقم الفاتورة..."
              className="w-full rounded-2xl border border-stone-300 bg-stone-50/50 py-2.5 ps-10 pe-4 text-xs md:text-sm text-stone-900 placeholder-stone-400 focus:border-[#2d3623] focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={applySearch}
              className="flex-1 sm:flex-none rounded-2xl bg-[#2d3623] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors shadow-xs"
            >
              بحث في السجلات
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`rounded-2xl border px-3.5 py-2.5 text-xs font-bold transition-colors flex items-center gap-1.5 ${
                showAdvancedFilters || severity || outcome || employeeId
                  ? 'border-emerald-700 bg-emerald-50 text-emerald-950'
                  : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
              }`}
              title="تصفية متقدمة"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>فلاتر</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
            {(q || activeCategory || activeShortcut || severity || outcome || employeeId) && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="rounded-2xl border border-stone-200 p-2.5 text-stone-500 hover:bg-stone-100 transition-colors"
                title="إعادة ضبط الكل"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Shortcuts Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
          <span className="text-xs font-bold text-stone-500 ms-1">اختصارات سريعة:</span>
          <button
            type="button"
            onClick={() => updateFilters({ shortcut: activeShortcut === 'cancellations_today' ? '' : 'cancellations_today' })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              activeShortcut === 'cancellations_today'
                ? 'bg-rose-900 text-white border-rose-900 shadow-xs'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
          >
            🚫 إلغاءات اليوم
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ shortcut: activeShortcut === 'price_changes' ? '' : 'price_changes' })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              activeShortcut === 'price_changes'
                ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            🏷️ تعديلات الأسعار
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ shortcut: activeShortcut === 'financial_payouts' ? '' : 'financial_payouts' })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              activeShortcut === 'financial_payouts'
                ? 'bg-emerald-900 text-white border-emerald-900 shadow-xs'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            💵 الدفعات المالية
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ shortcut: activeShortcut === 'failed_ops' ? '' : 'failed_ops' })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              activeShortcut === 'failed_ops'
                ? 'bg-red-900 text-white border-red-900 shadow-xs'
                : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100'
            }`}
          >
            ⚠️ العمليات الفاشلة
          </button>
          <button
            type="button"
            onClick={() => updateFilters({ shortcut: activeShortcut === 'permissions' ? '' : 'permissions' })}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all border ${
              activeShortcut === 'permissions'
                ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            🔑 تغييرات الصلاحيات
          </button>
        </div>

        {/* Collapsible Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-stone-100 animate-in fade-in duration-150">
            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">الموظف / المسؤول</label>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  updateFilters({ employeeId: e.target.value });
                }}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs bg-white focus:border-[#2d3623] focus:outline-none"
              >
                <option value="">كافة الموظفين</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">درجة الأهمية</label>
              <select
                value={severity}
                onChange={(e) => {
                  setSeverity(e.target.value);
                  updateFilters({ severity: e.target.value });
                }}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs bg-white focus:border-[#2d3623] focus:outline-none"
              >
                <option value="">كافة الدرجات</option>
                <option value="CRITICAL">حرجة (إلغاءات، مبالغ، صلاحيات)</option>
                <option value="HIGH">مهمة (تعديلات، إبلاغ نقص)</option>
                <option value="NORMAL">روتينية (تحديثات تشغيلية)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-700 block mb-1">نتيجة العملية</label>
              <select
                value={outcome}
                onChange={(e) => {
                  setOutcome(e.target.value);
                  updateFilters({ outcome: e.target.value });
                }}
                className="w-full rounded-xl border border-stone-300 p-2 text-xs bg-white focus:border-[#2d3623] focus:outline-none"
              >
                <option value="">كافة النتائج</option>
                <option value="SUCCESS">ناجحة ومعتمدة</option>
                <option value="DENIED">مرفوضة لعدم الصلاحية</option>
                <option value="FAILED">فشلت أثناء التنفيذ</option>
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. The 7 Core Category Navigation Pills ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-600">الأقسام السبعة المعتمدة في رَواق:</span>
          {activeCategory && (
            <button
              type="button"
              onClick={() => updateFilters({ category: '' })}
              className="text-xs font-bold text-emerald-800 hover:underline"
            >
              عرض كافة الأقسام
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => updateFilters({ category: '' })}
            className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border ${
              !activeCategory
                ? 'bg-[#2d3623] text-white border-[#2d3623] shadow-xs'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            <span>جميع السجلات</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                !activeCategory ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
              }`}
            >
              {logs.length}
            </span>
          </button>

          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            const count = categoryCounts[cat.id] || 0;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => updateFilters({ category: isSelected ? '' : cat.id })}
                className={`shrink-0 flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all border ${
                  isSelected ? cat.activeBg + ' shadow-xs' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 5. Main Feed of Story-Driven Log Cards ── */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-1">
          <span>
            يظهر حالياً <strong className="text-stone-900">{logs.length}</strong> سجل من إجمالي{' '}
            <strong className="text-stone-900">{stats.totalMatching}</strong> عملية مطابقة.
          </span>
          {isPending && (
            <span className="flex items-center gap-1.5 text-emerald-800 font-bold animate-pulse">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
              جاري تحديث السجلات...
            </span>
          )}
        </div>

        {logs.map((log) => {
          const categoryMeta = CATEGORIES.find((c) => c.id === log.category) || CATEGORIES[6];
          const actionTitle = ACTION_NARRATIVE_TITLES[log.action] || log.action;
          const entitySubtitle = formatEntitySubtitle(log);
          const actorNarrative = formatActorNarrative(log);
          const isCritical = log.severity === 'CRITICAL';
          const isHigh = log.severity === 'HIGH';
          const isDenied = log.outcome === 'DENIED';
          const isFailed = log.outcome === 'FAILED';

          const timeFormatted = new Intl.DateTimeFormat('ar-JO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: 'Asia/Amman',
          }).format(new Date(log.createdAt));

          const dateFormatted = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Asia/Amman',
          }).format(new Date(log.createdAt));

          const isOrder = log.category === 'ORDERS' || log.entityType.toLowerCase() === 'order';
          const orderTargetRef = log.correlationId || (isOrder ? log.entityId : null);

          return (
            <article
              key={log.id}
              className={`rounded-3xl border bg-white p-5 transition-all shadow-xs hover:shadow-md ${
                isDenied || isFailed
                  ? 'border-rose-300 bg-rose-50/20'
                  : isCritical
                  ? 'border-amber-300 bg-amber-50/10'
                  : 'border-stone-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                {/* Right: Narrative Story */}
                <div className="space-y-2 flex-1">
                  {/* Action Title and Time Row */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-base md:text-lg font-black text-stone-900 tracking-tight">
                      {actionTitle}
                    </h2>

                    <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                      {timeFormatted}
                    </span>

                    {/* Category badge */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>

                    {/* Outcome status */}
                    {isDenied ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        <XCircle className="w-3 h-3" />
                        محاولة مرفوضة
                      </span>
                    ) : isFailed ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        <AlertTriangle className="w-3 h-3" />
                        فشلت العملية
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        نجحت العملية
                      </span>
                    )}

                    {isCritical && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-300">
                        عملية حساسة
                      </span>
                    )}
                  </div>

                  {/* Entity Subtitle */}
                  <div className="text-sm font-bold text-stone-800 flex flex-wrap items-center gap-2">
                    <span>{entitySubtitle}</span>
                    {log.amountFormatted && (
                      <span className="font-mono text-xs font-black bg-emerald-100 text-emerald-950 px-2 py-0.5 rounded-md border border-emerald-300">
                        {log.amountFormatted} د.أ
                      </span>
                    )}
                  </div>

                  {/* Actor details */}
                  <div className="text-xs text-stone-600 font-medium">
                    {actorNarrative}
                  </div>

                  {/* State transition if exists */}
                  {(log.statusBefore || log.statusAfter) && (
                    <div className="inline-flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-800 border border-stone-200">
                      <span className="text-stone-500">من:</span>
                      <strong className="text-rose-900">
                        {STATUS_LABELS_AR[log.statusBefore || ''] || log.statusBefore || '—'}
                      </strong>
                      <span className="text-stone-400">← إلى:</span>
                      <strong className="text-emerald-900">
                        {STATUS_LABELS_AR[log.statusAfter || ''] || log.statusAfter || '—'}
                      </strong>
                    </div>
                  )}

                  {/* Reason if exists */}
                  {log.reason && (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 px-3 py-1.5 text-xs text-amber-950 font-medium max-w-2xl">
                      <strong className="font-bold">السبب:</strong> {log.reason}
                    </div>
                  )}

                  {/* Items count if exists */}
                  {log.itemsCount !== null && log.itemsCount !== undefined && (
                    <div className="text-xs text-stone-500">
                      عدد الأصناف المشمولة: <strong className="text-stone-800 font-mono">{log.itemsCount}</strong> صنف
                    </div>
                  )}
                </div>

                {/* Left: Action Buttons and Metadata */}
                <div className="flex md:flex-col items-end justify-between gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
                  <div className="text-left font-mono text-xs text-stone-400">
                    <div>{dateFormatted}</div>
                    <div className="text-[10px] text-stone-400">AUD-{log.id.slice(0, 8)}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isOrder && orderTargetRef && (
                      <button
                        type="button"
                        onClick={() => setTimelineOrderRef(orderTargetRef)}
                        className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-1 shadow-2xs"
                        title="عرض تاريخ ودورة حياة الطلب"
                      >
                        <Clock className="w-3.5 h-3.5 text-stone-500" />
                        <span>تاريخ الطلب 🕒</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveLog(log)}
                      className="rounded-xl bg-[#2d3623] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <span>عرض التفاصيل الكاملة</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {logs.length === 0 && (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500 space-y-2">
            <p className="text-base font-bold text-stone-800">لا توجد عمليات تدقيق تطابق محددات البحث والفترة المختارة.</p>
            <p className="text-xs text-stone-400">
              تأكد من تعديل الفلاتر أو اضغط على «إعادة ضبط» لاستعراض كل السجلات.
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              إعادة ضبط الفلاتر
            </button>
          </div>
        )}
      </section>

      {/* ── 6. Pagination Controls ── */}
      {pagination.totalPages > 1 && (
        <footer className="flex items-center justify-between border-t border-stone-200 pt-4 text-xs font-bold">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-stone-700 disabled:opacity-40 hover:bg-stone-50 transition-colors"
          >
            ← الصفحة السابقة
          </button>

          <span className="text-stone-600 font-mono">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>

          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
            className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-stone-700 disabled:opacity-40 hover:bg-stone-50 transition-colors"
          >
            الصفحة التالية →
          </button>
        </footer>
      )}

      {/* ── 7. Detailed 4-Group Inspection Modal ── */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs font-sans">
          <div className="relative max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-stone-200 space-y-6 animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-500 bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-200">
                    AUD-{activeLog.id}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${CATEGORIES.find(c => c.id === activeLog.category)?.color}`}>
                    {CATEGORIES.find(c => c.id === activeLog.category)?.label}
                  </span>
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-bold text-stone-700">
                    {activeLog.severity}
                  </span>
                </div>
                <h3 className="text-xl font-black text-stone-900 mt-2">
                  {ACTION_NARRATIVE_TITLES[activeLog.action] || activeLog.action}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* أ. تفاصيل العملية */}
            <section className="space-y-2.5">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center text-[11px] font-bold">أ</span>
                تفاصيل العملية
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">اسم الإجراء</span>
                  <strong className="text-stone-900 block font-bold">
                    {ACTION_NARRATIVE_TITLES[activeLog.action] || activeLog.action}
                  </strong>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">حالة العملية</span>
                  <strong className={`block font-bold ${activeLog.outcome === 'SUCCESS' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {activeLog.outcome === 'SUCCESS' ? 'نجحت العملية' : activeLog.outcome === 'DENIED' ? 'مرفوضة لعدم الصلاحية' : 'فشلت'}
                  </strong>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">التاريخ والوقت</span>
                  <strong className="text-stone-900 font-mono block">
                    {new Intl.DateTimeFormat('ar-JO', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      timeZone: 'Asia/Amman',
                    }).format(new Date(activeLog.createdAt))}
                  </strong>
                </div>
              </div>
            </section>

            {/* ب. الجهة المسؤولة */}
            <section className="space-y-2.5">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center text-[11px] font-bold">ب</span>
                الجهة المسؤولة
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">منفّذ العملية</span>
                  <strong className="text-stone-900 block font-bold text-sm">
                    {activeLog.actorNameSnapshot || activeLog.employeeName || activeLog.actorType}
                  </strong>
                  <span className="text-[10px] text-stone-400">الصفة: {activeLog.actorType}</span>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">نوع الجلسة</span>
                  <strong className="text-stone-900 block font-bold">
                    {activeLog.actorType === 'ADMIN' ? 'موظف رَواق' : activeLog.actorType === 'SUPPLIER' ? 'جلسة مورد' : activeLog.actorType === 'COURIER' ? 'شركة التوصيل' : 'النظام التلقائي'}
                  </strong>
                </div>
                <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
                  <span className="text-stone-500 block mb-0.5 font-semibold">عنوان IP والشبكة</span>
                  <strong className="text-stone-900 font-mono block">
                    {activeLog.ipAddress || 'خادم داخلي'}
                  </strong>
                </div>
              </div>
            </section>

            {/* ج. التغييرات (Before & After) */}
            <section className="space-y-2.5">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center text-[11px] font-bold">ج</span>
                التغييرات والمطابقة
              </h4>

              {activeLog.reason && (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-950 font-medium">
                  <strong className="block font-bold mb-0.5">السبب أو المبرر المعتمد:</strong>
                  {activeLog.reason}
                </div>
              )}

              {/* Before and After Table */}
              {activeLog.changes ? (
                <div className="overflow-x-auto rounded-2xl border border-stone-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-stone-100 border-b border-stone-200 text-stone-700 font-bold">
                      <tr>
                        <th className="p-3">الحقل / البيان</th>
                        <th className="p-3 bg-red-50 text-red-900">القيمة السابقة (قبل)</th>
                        <th className="p-3 bg-emerald-50 text-emerald-900">القيمة الجديدة (بعد)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white">
                      {activeLog.changes.status ? (
                        <tr>
                          <td className="p-3 font-bold text-stone-800">حالة المسار (Status)</td>
                          <td className="p-3 font-mono text-red-800 bg-red-50/30">
                            {STATUS_LABELS_AR[activeLog.changes.status.before] || activeLog.changes.status.before || '—'}
                          </td>
                          <td className="p-3 font-mono text-emerald-900 bg-emerald-50/30 font-bold">
                            {STATUS_LABELS_AR[activeLog.changes.status.after] || activeLog.changes.status.after || '—'}
                          </td>
                        </tr>
                      ) : null}

                      {activeLog.changes.before || activeLog.changes.after ? (
                        Object.keys({ ...(activeLog.changes.before || {}), ...(activeLog.changes.after || {}) }).map((key) => (
                          <tr key={key}>
                            <td className="p-3 font-semibold text-stone-800 border-r border-stone-100">{key}</td>
                            <td className="p-3 font-mono text-red-800 bg-red-50/30">
                              {JSON.stringify(activeLog.changes.before?.[key] ?? '—')}
                            </td>
                            <td className="p-3 font-mono text-emerald-900 bg-emerald-50/30 font-bold">
                              {JSON.stringify(activeLog.changes.after?.[key] ?? '—')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-3 font-mono text-xs text-stone-700">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(activeLog.changes, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : activeLog.details ? (
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-xs font-mono text-stone-700 max-h-48 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(activeLog.details, null, 2)}</pre>
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">لا توجد فروقات حقول مفصلة مسجلة في هذا السجل.</p>
              )}
            </section>

            {/* د. المراجع والأدلة */}
            <section className="space-y-2.5 pt-2 border-t border-stone-100">
              <h4 className="text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center text-[11px] font-bold">د</span>
                المراجع والأدلة والروابط
              </h4>

              <div className="flex flex-wrap items-center gap-3">
                {/* Order Lifecycle timeline button if order */}
                {(activeLog.category === 'ORDERS' || activeLog.entityType.toLowerCase() === 'order') && (
                  <button
                    type="button"
                    onClick={() => {
                      setTimelineOrderRef(activeLog.correlationId || activeLog.entityId);
                    }}
                    className="rounded-2xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>عرض التسلسل الزمني الكامل للطلب 🕒</span>
                  </button>
                )}

                {/* Direct resource link */}
                {getLinkedResource(activeLog) && (
                  <Link
                    href={getLinkedResource(activeLog)!.href}
                    className="rounded-2xl bg-[#2d3623] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>فتح السجل الأصلي ({getLinkedResource(activeLog)?.label}) ↗</span>
                  </Link>
                )}
              </div>
            </section>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="rounded-2xl bg-stone-100 px-6 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 8. Reusable Order Lifecycle Timeline Modal ── */}
      {timelineOrderRef && (
        <OrderLifecycleTimelineModal
          orderReferenceOrId={timelineOrderRef}
          isOpen={!!timelineOrderRef}
          onClose={() => setTimelineOrderRef(null)}
        />
      )}
    </div>
  );
}
