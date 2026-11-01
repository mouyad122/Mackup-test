'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

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
}

interface Props {
  logs: AuditLogItem[];
  employees: { id: string; name: string }[];
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

const CATEGORY_MAP: Record<string, { label: string; badge: string; color: string }> = {
  ORDERS: { label: 'الطلبات والعملاء', badge: 'طلب', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  SUPPLIERS: { label: 'الموردون والتجهيز', badge: 'مورد', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  DELIVERY: { label: 'شركة التوصيل', badge: 'توصيل', color: 'bg-amber-50 text-amber-900 border-amber-200' },
  ACCOUNTING: { label: 'المحاسبة والتسويات', badge: 'مالي', color: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
  REPORTS: { label: 'التقارير الرسمية', badge: 'تقرير', color: 'bg-teal-50 text-teal-900 border-teal-200' },
  PRODUCTS: { label: 'المنتجات والتسعير', badge: 'منتج', color: 'bg-indigo-50 text-indigo-900 border-indigo-200' },
  SECURITY: { label: 'الأمن والإعدادات', badge: 'أمان', color: 'bg-rose-50 text-rose-900 border-rose-200' },
};

const ACTION_TITLES: Record<string, string> = {
  // الطلبات
  ORDER_CONFIRMED: 'تأكيد طلب عميل',
  ORDER_CANCELLED: 'إلغاء طلب عميل',
  ORDER_ITEM_ADJUSTED: 'تعديل منتج في طلب',
  ORDER_STATUS_UPDATED: 'تغيير حالة الطلب',
  UPDATE_ORDER_STATUS: 'تحديث حالة الطلب',
  INVOICE_CORRECTION_ISSUED: 'إصدار تصحيح فاتورة',
  ORDER_CREATED: 'إنشاء طلب جديد',
  
  // الموردون
  SUPPLIER_ACCESS_ISSUED: 'إصدار رابط وصول للمورد',
  SUPPLIER_ACCESS_REVOKED: 'إلغاء رابط المورد',
  SUPPLIER_ITEM_SHORTAGE_REPORTED: 'إبلاغ مورد عن نقص',
  SUPPLIER_ORDER_READY: 'تأكيد جاهزية طلب من المورد',
  PACKAGE_PICKUP_VERIFIED: 'توثيق استلام الطرد',
  SUPPLIER_CREATED: 'إضافة مورد جديد',
  SUPPLIER_UPDATED: 'تعديل بيانات مورد',
  SUPPLIER_DELETED: 'حذف مورد',

  // التوصيل
  DELIVERY_BATCH_CREATED: 'إنشاء طلبية توصيل مجمعة',
  DELIVERY_BATCH_UPDATED: 'تعديل طلبية التوصيل',
  DELIVERY_BATCH_APPROVED: 'اعتماد طلبية التوصيل',
  DELIVERY_BATCH_CANCELLED: 'إلغاء طلبية التوصيل',
  DELIVERY_BATCH_STATUS_UPDATED: 'تحديث مسار التوصيل',
  DELIVERY_CONFIRMED: 'تأكيد تسليم الطلب للعميل',
  ORDER_DELIVERY_COST_UPDATED: 'تعديل تكلفة شركة التوصيل',
  SHIPPING_ZONE_UPDATED: 'تعديل مناطق ورسوم الشحن',

  // المحاسبة
  COD_REMITTANCE_RECORDED: 'تسجيل توريد COD من شركة التوصيل',
  DELIVERY_BATCH_RECONCILED: 'تسوية ومقاصة طلبية توصيل',
  SUPPLIER_SETTLEMENT_APPROVED: 'اعتماد دفعة مالية للمحل',
  SUPPLIER_PAYMENT_RECORDED: 'تسجيل سند صرف لمورد',
  SETTLEMENT_REVERSED: 'عكس تسوية مالية',
  EXPENSE_CREATED: 'تسجيل مصروف تشغيلي',
  TAX_SETTINGS_UPDATED: 'تعديل إعدادات الضريبة',
  POS_CHECKOUT: 'إتمام عملية بيع نقطة بيع',
  POS_REFUND: 'استرداد بيع نقدي',

  // التقارير
  OFFICIAL_REPORT_ISSUED: 'إصدار تقرير رسمي معتمد',
  OFFICIAL_REPORT_APPROVED: 'اعتماد وختم تقرير رسمي',
  OFFICIAL_REPORT_VIEWED: 'معاينة تقرير رسمي',
  OFFICIAL_REPORT_DOWNLOADED: 'تنزيل نسخة تقرير',
  OFFICIAL_REPORT_SHARED: 'مشاركة رابط تقرير رسمي',
  OFFICIAL_REPORT_REVOKED: 'إلغاء أو استبدال تقرير رسمي',

  // المنتجات
  CREATE_PRODUCT: 'إضافة منتج جديد',
  UPDATE_PRODUCT: 'تعديل بيانات منتج',
  DELETE_PRODUCT: 'حذف منتج',
  PRODUCT_PRICING_UPDATED: 'تعديل أسعار المنتجات',
  INVENTORY_ADJUSTED: 'تسوية وجرد مخزون عيني',
  RETURN_INSPECTED: 'فحص وتقييم مرتجع',

  // الأمان
  SESSION_CREATED: 'تسجيل دخول ناجح',
  SESSION_REVOKED: 'إلغاء جلسة موظف',
  SESSIONS_REVOKED: 'إنهاء كافة الجلسات',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'محاولة وصول غير مصرح',
  PERMISSION_DENIED: 'رفض صلاحية وصول',
  EMPLOYEE_CREATED: 'إضافة موظف جديد',
  EMPLOYEE_UPDATED: 'تعديل بيانات موظف',
  EMPLOYEE_DELETED: 'حذف حساب موظف',
  EMPLOYEE_DEACTIVATED_INSTEAD_OF_DELETE: 'تعطيل حساب موظف لحماية السجلات',
  EMPLOYEE_STATUS_TOGGLED: 'تغيير حالة تفعيل موظف',
  PERMISSION_OVERRIDE_ADDED: 'منح استثناء صلاحية',
  FORCE_PASSWORD_CHANGE: 'إلزام تغيير كلمة المرور',
  SITE_SETTINGS_UPDATED: 'تعديل إعدادات المتجر',
};

export function AuditLogsClient({ logs, employees, stats, pagination }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  // Selected log for detailed inspection drawer
  const [activeLog, setActiveLog] = useState<AuditLogItem | null>(null);

  // Filter state
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || '');
  const [outcome, setOutcome] = useState(searchParams.get('outcome') || '');
  const [employeeId, setEmployeeId] = useState(searchParams.get('employeeId') || '');

  // Synchronize state if URL changes externally
  React.useEffect(() => {
    setQ(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setSeverity(searchParams.get('severity') || '');
    setOutcome(searchParams.get('outcome') || '');
    setEmployeeId(searchParams.get('employeeId') || '');
  }, [searchParams]);

  const updateFilters = (override: {
    q?: string;
    category?: string;
    severity?: string;
    outcome?: string;
    employeeId?: string;
  }) => {
    const nextQ = override.q !== undefined ? override.q : q;
    const nextCategory = override.category !== undefined ? override.category : category;
    const nextSeverity = override.severity !== undefined ? override.severity : severity;
    const nextOutcome = override.outcome !== undefined ? override.outcome : outcome;
    const nextEmployee = override.employeeId !== undefined ? override.employeeId : employeeId;

    const params = new URLSearchParams();
    if (nextQ.trim()) params.set('q', nextQ.trim());
    if (nextCategory) params.set('category', nextCategory);
    if (nextSeverity) params.set('severity', nextSeverity);
    if (nextOutcome) params.set('outcome', nextOutcome);
    if (nextEmployee) params.set('employeeId', nextEmployee);
    params.set('page', '1');

    startTransition(() => {
      router.push(`/admin/logs?${params.toString()}`);
    });
  };

  const applyFilters = () => {
    updateFilters({ q });
  };

  const clearFilters = () => {
    setQ('');
    setCategory('');
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
      return { href: `/admin/orders`, label: `الطلب (${item.correlationId || item.entityId.slice(0, 8)})` };
    }
    if (item.category === 'DELIVERY' || item.entityType === 'DeliveryBatch') {
      return { href: `/admin/settings?tab=batches`, label: `طلبية التوصيل (${correlation})` };
    }
    if (item.category === 'REPORTS') {
      return { href: `/admin/reconciliation?v=reports`, label: `مركز التقارير الرسمية` };
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

  return (
    <div className="space-y-6" dir="rtl">
      {/* ── Top Header ── */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600 animate-pulse" />
            <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
              رَواق | مركز الرقابة وسجلات التدقيق الموحد
            </h1>
          </div>
          <p className="mt-1 text-xs md:text-sm text-zinc-600 font-medium">
            تتبع شامل لكل عملية داخل المنصة · توثيق المنفذ، الوقت، التغييرات، والمطابقة التلقائية
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-mono font-bold text-zinc-700 border border-zinc-200">
            توقيت عمّان الرسمي (GMT+3)
          </span>
        </div>
      </header>

      {/* ── Top KPI Stat Cards ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <article
          onClick={() => clearFilters()}
          className="rounded-2xl border border-zinc-200/90 bg-white p-4 shadow-xs space-y-1 cursor-pointer hover:border-zinc-400 hover:shadow-sm transition-all"
          title="انقر لعرض كافة عمليات اليوم"
        >
          <span className="text-xs text-zinc-500 font-semibold block">عمليات اليوم المسجلة</span>
          <strong className="text-2xl font-extrabold text-zinc-900 font-mono block">
            {stats.todayTotal.toLocaleString()}
          </strong>
          <span className="text-[11px] text-zinc-400 block">منذ الساعة 00:00 بتوقيت الأردن</span>
        </article>

        <article
          onClick={() => updateFilters({ severity: 'CRITICAL', outcome: '', category: '' })}
          className={`rounded-2xl border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            severity === 'CRITICAL'
              ? 'border-amber-500 bg-amber-100 ring-2 ring-amber-400'
              : 'border-amber-200 bg-amber-50/60 hover:bg-amber-100/70'
          }`}
          title="انقر لتصفية العمليات الحساسة فوراً"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-900 font-bold">عمليات حساسة ومالية</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>
          <strong className="text-2xl font-extrabold text-amber-950 font-mono block">
            {stats.todayCritical}
          </strong>
          <span className="text-[11px] text-amber-800/80 block">تعديلات أسعار، تسويات، وصلاحيات</span>
        </article>

        <article
          onClick={() => updateFilters({ outcome: 'DENIED', severity: '', category: '' })}
          className={`rounded-2xl border p-4 shadow-xs space-y-1 cursor-pointer transition-all ${
            outcome === 'DENIED'
              ? 'border-red-500 bg-red-100 ring-2 ring-red-400'
              : 'border-red-200 bg-red-50/60 hover:bg-red-100/70'
          }`}
          title="انقر لتصفية المحاولات المرفوضة فوراً"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-red-900 font-bold">محاولات مرفوضة</span>
            <span className="h-2 w-2 rounded-full bg-red-500" />
          </div>
          <strong className="text-2xl font-extrabold text-red-950 font-mono block">
            {stats.todayDenied}
          </strong>
          <span className="text-[11px] text-red-800/80 block">صلاحيات غير مصرحة أو روابط منتهية</span>
        </article>

        <article className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-900 font-bold">سلامة وموثوقية السجل</span>
            <span className="text-xs font-bold text-emerald-700 font-mono">100% ACID</span>
          </div>
          <strong className="text-lg font-bold text-emerald-950 block mt-1">
            سجل محمي وسليم
          </strong>
          <span className="text-[11px] text-emerald-800/80 block">توثيق ذري غير قابل للتعديل</span>
        </article>
      </section>

      {/* ── Multi-Filter Control Panel ── */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search box */}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold text-zinc-700 block mb-1">
              البحث الذكي (رقم الطلب، الفاتورة، التقرير، الموظف)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                placeholder="مثال: #1048، RPT-2026، تسوية..."
                className="w-full rounded-xl border border-zinc-300 p-2 text-xs md:text-sm focus:border-emerald-700 focus:outline-none"
              />
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-xl bg-[#2d3623] px-3 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors"
                title="تطبيق البحث"
              >
                بحث
              </button>
            </div>
          </div>

          {/* Department Pillar */}
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">القسم التشغيلي</label>
            <select
              value={category}
              onChange={e => {
                setCategory(e.target.value);
                updateFilters({ category: e.target.value });
              }}
              className="w-full rounded-xl border border-zinc-300 p-2 text-xs bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="">كافة الأقسام الـ 7</option>
              <option value="ORDERS">الطلبات والعملاء</option>
              <option value="SUPPLIERS">الموردون والتجهيز</option>
              <option value="DELIVERY">شركة التوصيل والطلبيات</option>
              <option value="ACCOUNTING">المحاسبة والتسويات وCOD</option>
              <option value="REPORTS">التقارير الرسمية والاعتمادات</option>
              <option value="PRODUCTS">المنتجات والتسعير</option>
              <option value="SECURITY">الأمن والإعدادات والصلاحيات</option>
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">درجة الأهمية والخطورة</label>
            <select
              value={severity}
              onChange={e => {
                setSeverity(e.target.value);
                updateFilters({ severity: e.target.value });
              }}
              className="w-full rounded-xl border border-zinc-300 p-2 text-xs bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="">كافة الدرجات</option>
              <option value="CRITICAL">حرجة (مالية / أمنية / إلغاء)</option>
              <option value="HIGH">مهمة (تعديلات وتجهيز)</option>
              <option value="NORMAL">روتينية وتشغيلية</option>
            </select>
          </div>

          {/* Outcome */}
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">نتيجة العملية</label>
            <select
              value={outcome}
              onChange={e => {
                setOutcome(e.target.value);
                updateFilters({ outcome: e.target.value });
              }}
              className="w-full rounded-xl border border-zinc-300 p-2 text-xs bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="">كافة النتائج</option>
              <option value="SUCCESS">ناجحة ومعتمدة</option>
              <option value="DENIED">مرفوضة لعدم الصلاحية</option>
              <option value="FAILED">فشلت أثناء التنفيذ</option>
            </select>
          </div>

          {/* Employee */}
          <div>
            <label className="text-xs font-bold text-zinc-700 block mb-1">الموظف / المسؤول</label>
            <select
              value={employeeId}
              onChange={e => {
                setEmployeeId(e.target.value);
                updateFilters({ employeeId: e.target.value });
              }}
              className="w-full rounded-xl border border-zinc-300 p-2 text-xs bg-white focus:border-emerald-700 focus:outline-none"
            >
              <option value="">كافة الموظفين</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(q || category || severity || outcome || employeeId) && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100">
            <span className="text-[11px] font-bold text-zinc-500">الفلاتر المطبقة حالياً:</span>
            {q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700 font-mono">
                بحث: &quot;{q}&quot;
                <button type="button" onClick={() => { setQ(''); updateFilters({ q: '' }); }} className="text-zinc-400 hover:text-zinc-700">✕</button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs text-emerald-900 font-bold">
                القسم: {CATEGORY_MAP[category]?.label || category}
                <button type="button" onClick={() => { setCategory(''); updateFilters({ category: '' }); }} className="text-emerald-700 hover:text-emerald-950">✕</button>
              </span>
            )}
            {severity && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs text-amber-900 font-bold">
                الدرجة: {severity === 'CRITICAL' ? 'حرجة' : severity === 'HIGH' ? 'مهمة' : 'روتينية'}
                <button type="button" onClick={() => { setSeverity(''); updateFilters({ severity: '' }); }} className="text-amber-700 hover:text-amber-950">✕</button>
              </span>
            )}
            {outcome && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs text-rose-900 font-bold">
                النتيجة: {outcome === 'SUCCESS' ? 'ناجحة' : outcome === 'DENIED' ? 'مرفوضة' : 'فشلت'}
                <button type="button" onClick={() => { setOutcome(''); updateFilters({ outcome: '' }); }} className="text-rose-700 hover:text-rose-950">✕</button>
              </span>
            )}
            {employeeId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs text-blue-900 font-bold">
                الموظف: {employees.find(e => e.id === employeeId)?.name || employeeId}
                <button type="button" onClick={() => { setEmployeeId(''); updateFilters({ employeeId: '' }); }} className="text-blue-700 hover:text-blue-950">✕</button>
              </span>
            )}
          </div>
        )}

        {/* Buttons and Count */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-zinc-100">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-medium">
              يظهر حالياً <strong className="text-zinc-900">{logs.length}</strong> من إجمالي <strong className="text-zinc-900">{stats.totalMatching}</strong> عملية مطابقة.
            </span>
            {isPending && (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold animate-pulse">
                <span className="h-2 w-2 rounded-full bg-emerald-600 animate-ping" />
                جاري تحديث النتائج...
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyFilters}
              className="rounded-xl bg-[#2d3623] px-5 py-2 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors shadow-xs"
            >
              تطبيق التصفية
            </button>
            <button
              onClick={clearFilters}
              className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              إعادة ضبط
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Logs Feed ── */}
      <section className="space-y-3">
        {logs.map(log => {
          const categoryMeta = CATEGORY_MAP[log.category] || CATEGORY_MAP.SECURITY;
          const actionTitle = ACTION_TITLES[log.action] || log.action;
          const isCritical = log.severity === 'CRITICAL';
          const isHigh = log.severity === 'HIGH';
          const isDenied = log.outcome === 'DENIED';

          const actorDisplayName =
            log.actorNameSnapshot ||
            log.employeeName ||
            (log.actorType === 'SUPPLIER' ? 'مورد شريك' : log.actorType === 'COURIER' ? 'شركة التوصيل' : 'النظام الآلي');

          return (
            <article
              key={log.id}
              onClick={() => setActiveLog(log)}
              className={`rounded-2xl border bg-white p-4 transition-all cursor-pointer hover:shadow-md ${
                isDenied
                  ? 'border-red-300 bg-red-50/20'
                  : isCritical
                  ? 'border-amber-300 hover:border-amber-400'
                  : 'border-zinc-200 hover:border-zinc-300'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                {/* Right side: title and details */}
                <div className="space-y-1.5 flex-1 min-w-[280px]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded">
                      AUD-{log.id.slice(0, 8)}
                    </span>

                    <h2 className="font-extrabold text-sm md:text-base text-zinc-900">
                      {actionTitle}
                    </h2>

                    {/* Department badge */}
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>

                    {/* Severity badge */}
                    {isCritical && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
                        حرجة
                      </span>
                    )}
                    {isHigh && !isCritical && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900 border border-amber-200">
                        مهمة
                      </span>
                    )}

                    {/* Outcome badge */}
                    {isDenied && (
                      <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        محاولة مرفوضة
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-600 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      المنفذ: <strong className="text-zinc-800">{actorDisplayName}</strong> ({log.actorType})
                    </span>
                    {log.correlationId && (
                      <span className="font-mono bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700 font-bold">
                        مرجع: {log.correlationId}
                      </span>
                    )}
                    {log.reason && (
                      <span className="text-zinc-500 italic line-clamp-1">
                        السبب: {log.reason}
                      </span>
                    )}
                  </p>
                </div>

                {/* Left side: Time and action button */}
                <div className="flex items-center gap-3">
                  <div className="text-left font-mono">
                    <div className="text-xs font-bold text-zinc-800">
                      {new Intl.DateTimeFormat('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        timeZone: 'Asia/Amman',
                      }).format(new Date(log.createdAt))}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {new Intl.DateTimeFormat('en-GB', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        timeZone: 'Asia/Amman',
                      }).format(new Date(log.createdAt))}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                  >
                    التفاصيل
                  </button>
                </div>
              </div>
            </article>
          );
        })}

        {logs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center text-zinc-500">
            <p className="text-sm font-semibold">لا توجد عمليات تدقيق تطابق محددات البحث والفترة المختارة.</p>
            <p className="text-xs text-zinc-400 mt-1">تأكد من ضبط الفلاتر أو اضغط على «إعادة ضبط» لاستعراض كل السجلات.</p>
          </div>
        )}
      </section>

      {/* ── Pagination Controls ── */}
      {pagination.totalPages > 1 && (
        <footer className="flex items-center justify-between border-t border-zinc-200 pt-4 text-xs font-semibold">
          <button
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-zinc-700 disabled:opacity-40 hover:bg-zinc-50"
          >
            ← الصفحة السابقة
          </button>

          <span className="text-zinc-600 font-mono">
            صفحة {pagination.page} من {pagination.totalPages}
          </span>

          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-zinc-700 disabled:opacity-40 hover:bg-zinc-50"
          >
            الصفحة التالية →
          </button>
        </footer>
      )}

      {/* ── Detailed Event Inspection Modal / Drawer ── */}
      {activeLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-zinc-200 space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                    AUD-{activeLog.id}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold border ${CATEGORY_MAP[activeLog.category]?.color}`}>
                    {CATEGORY_MAP[activeLog.category]?.label}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-700">
                    {activeLog.severity}
                  </span>
                </div>
                <h3 className="text-xl font-black text-zinc-900 mt-2">
                  {ACTION_TITLES[activeLog.action] || activeLog.action}
                </h3>
              </div>
              <button
                onClick={() => setActiveLog(null)}
                className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>

            {/* Quick Context Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-zinc-500 block mb-0.5 font-semibold">المنفذ</span>
                <strong className="text-zinc-900 text-sm block">
                  {activeLog.actorNameSnapshot || activeLog.employeeName || activeLog.actorType}
                </strong>
                <span className="text-[10px] text-zinc-400">صفة: {activeLog.actorType}</span>
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-zinc-500 block mb-0.5 font-semibold">توقيت الأردن</span>
                <strong className="text-zinc-900 font-mono text-sm block">
                  {new Intl.DateTimeFormat('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    timeZone: 'Asia/Amman',
                  }).format(new Date(activeLog.createdAt))}
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {new Intl.DateTimeFormat('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    timeZone: 'Asia/Amman',
                  }).format(new Date(activeLog.createdAt))}
                </span>
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-zinc-500 block mb-0.5 font-semibold">الكيان والمرجع</span>
                <strong className="text-zinc-900 font-mono text-sm block line-clamp-1" title={activeLog.correlationId || activeLog.entityId}>
                  {activeLog.correlationId || activeLog.entityId.slice(0, 14)}
                </strong>
                <span className="text-[10px] text-zinc-400">نوع الكيان: {activeLog.entityType}</span>
              </div>

              <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <span className="text-zinc-500 block mb-0.5 font-semibold">نتيجة العملية</span>
                <strong className={`text-sm block font-bold ${
                  activeLog.outcome === 'SUCCESS' ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  {activeLog.outcome === 'SUCCESS' ? 'ناجحة ومعتمدة' : activeLog.outcome === 'DENIED' ? 'مرفوضة لعدم الصلاحية' : 'فشلت'}
                </strong>
                <span className="text-[10px] text-zinc-400 font-mono">IP: {activeLog.ipAddress || 'محلي'}</span>
              </div>
            </div>

            {/* Reason or context note if present */}
            {activeLog.reason && (
              <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 text-xs text-amber-950">
                <strong className="font-bold block mb-0.5">سبب أو مبرر التعديل:</strong>
                <p>{activeLog.reason}</p>
              </div>
            )}

            {/* Visual Before / After changes */}
            {activeLog.changes && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-800">تفاصيل الفروقات والتغييرات المسجلة:</h4>
                <div className="overflow-x-auto rounded-xl border border-zinc-200">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-zinc-100 border-b border-zinc-200 text-zinc-700 font-bold">
                      <tr>
                        <th className="p-2.5">الحقل / البيان</th>
                        <th className="p-2.5 bg-red-50 text-red-900">القيمة السابقة (قبل)</th>
                        <th className="p-2.5 bg-emerald-50 text-emerald-900">القيمة الجديدة (بعد)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {activeLog.changes.before || activeLog.changes.after ? (
                        Object.keys({ ...(activeLog.changes.before || {}), ...(activeLog.changes.after || {}) }).map(key => (
                          <tr key={key}>
                            <td className="p-2.5 font-semibold text-zinc-800 border-r border-zinc-100">{key}</td>
                            <td className="p-2.5 font-mono text-red-800 bg-red-50/30">
                              {JSON.stringify(activeLog.changes.before?.[key] ?? '—')}
                            </td>
                            <td className="p-2.5 font-mono text-emerald-900 bg-emerald-50/30">
                              {JSON.stringify(activeLog.changes.after?.[key] ?? '—')}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="p-3 font-mono text-xs text-zinc-700">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(activeLog.changes, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sanitized Details View */}
            {activeLog.details && !activeLog.changes && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-zinc-800">بيانات العملية الإضافية:</h4>
                <pre className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-[11px] font-mono text-zinc-700 overflow-x-auto max-h-48 whitespace-pre-wrap">
                  {typeof activeLog.details === 'string' ? activeLog.details : JSON.stringify(activeLog.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Linked Resource Jump Button */}
            {getLinkedResource(activeLog) && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
                <span className="text-emerald-950 font-medium">
                  العملية مرتبطة بـ <strong>{getLinkedResource(activeLog)?.label}</strong>. يمكنك الانتقال للسجل الأصلي:
                </span>
                <Link
                  href={getLinkedResource(activeLog)!.href}
                  className="rounded-xl bg-emerald-950 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors shadow-xs"
                >
                  فتح السجل الأصلي ↗
                </Link>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                className="rounded-xl bg-zinc-100 px-5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-200"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
