'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { filsToDisplay } from '@/lib/money';
import { ReconciliationPrintReport } from '../reconciliation/ReconciliationPrintReport';
import { PrintButton } from '../reconciliation/PrintButton';
import { issueAndArchiveReportAction, getArchivedReportsAction } from '@/actions/reports';
import { cancelDeliveryBatchSettlementAction } from '@/actions/reconciliation';
import Link from 'next/link';

interface Props {
  initialDepartment?: string;
  initialReport?: any;
  deliveryCompanies: string[];
  suppliers: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  currentEmployee?: { name: string; role: string };
}

const DEPARTMENTS = [
  { id: 'DELIVERY', label: '🚚 شركات التوصيل واللوجستيات', view: 'delivery', desc: 'شحنات الناقل، تحصيلات COD، رسوم التوصيل، والتوريدات' },
  { id: 'SUPPLIER', label: '🏬 المحلات الشريكة والمتاجر', view: 'shops', desc: 'الأصناف المباعة، استحقاقات التكلفة، الدفعات، والأرصدة' },
  { id: 'EXPENSES', label: '💼 المصروفات التشغيلية', view: 'expenses', desc: 'سندات الصرف، بنود التشغيل، النثريات، والرواتب' },
  { id: 'DIFFERENCES', label: '⚠️ الفروقات والمطابقة المالية', view: 'differences', desc: 'الفروقات المسجلة على الشركات والمحلات وحالات المعالجة' },
  { id: 'SETTLEMENTS', label: '⚖️ التسويات والتوريدات النقدية', view: 'settlements', desc: 'توريدات نقد COD وسندات صرف مستحقات المحلات المعتمدة' },
  { id: 'FINANCIAL_SUMMARY', label: '📊 التقرير المالي الشامل (P&L)', view: 'financial', desc: 'قائمة الأرباح والخسائر الشاملة وهوامش الربح التشغيلية' },
];

const DEPT_URL_MAP: Record<string, string> = {
  DELIVERY: 'delivery',
  SUPPLIER: 'shops',
  EXPENSES: 'expenses',
  DIFFERENCES: 'differences',
  SETTLEMENTS: 'settlements',
  FINANCIAL_SUMMARY: 'financial',
};

const URL_DEPT_MAP: Record<string, string> = {
  delivery: 'DELIVERY',
  shops: 'SUPPLIER',
  suppliers: 'SUPPLIER',
  expenses: 'EXPENSES',
  differences: 'DIFFERENCES',
  settlements: 'SETTLEMENTS',
  financial: 'FINANCIAL_SUMMARY',
};

export function ReportsManager({
  initialDepartment = 'DELIVERY',
  initialReport,
  deliveryCompanies,
  suppliers,
  categories,
  currentEmployee,
}: Props) {
  // Main view mode: 'generator' or 'archive'
  const [activeMode, setActiveMode] = useState<'generator' | 'archive'>('generator');

  const [department, setDepartment] = useState(
    URL_DEPT_MAP[initialDepartment.toLowerCase()] || initialDepartment
  );
  const [reportData, setReportData] = useState<any>(initialReport || null);
  const [isPending, startTransition] = useTransition();

  // Filters state
  const [isDetailed, setIsDetailed] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [courierCompany, setCourierCompany] = useState('');
  const [batchRef, setBatchRef] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [itemStatus, setItemStatus] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [diffStatus, setDiffStatus] = useState('');
  const [settlementEntityType, setSettlementEntityType] = useState('ALL');
  const [deliveryScope, setDeliveryScope] = useState<'DELIVERED' | 'UNDELIVERED' | 'ALL'>('DELIVERED');
  const [activePreset, setActivePreset] = useState<string>('all');

  // Archiving feedback
  const [archiveSuccessRef, setArchiveSuccessRef] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  // Archive view state
  const [archivedReports, setArchivedReports] = useState<any[]>([]);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveDeptFilter, setArchiveDeptFilter] = useState('ALL');
  const [selectedArchivedReport, setSelectedArchivedReport] = useState<any | null>(null);
  const [loadingArchive, setLoadingArchive] = useState(false);

  // Handle Preset Time Selection
  const applyPreset = (preset: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    setActivePreset(preset);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let newFrom = '';
    let newTo = '';

    if (preset === 'today') {
      const todayStr = toYMD(now);
      newFrom = todayStr;
      newTo = todayStr;
    } else if (preset === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toYMD(y);
      newFrom = yStr;
      newTo = yStr;
    } else if (preset === 'week') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      newFrom = toYMD(w);
      newTo = toYMD(now);
    } else if (preset === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      newFrom = toYMD(m);
      newTo = toYMD(now);
    }

    setFrom(newFrom);
    setTo(newTo);
    setTimeout(() => handleFetchReport(isDetailed, department, newFrom, newTo), 50);
  };

  // Switch department
  const switchDepartment = (deptKey: string) => {
    setDepartment(deptKey);
    setArchiveSuccessRef(null);
    const viewParam = DEPT_URL_MAP[deptKey] || 'delivery';
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.pathname.includes('/reconciliation')) {
        url.searchParams.set('v', 'reports');
        url.searchParams.set('dept', viewParam);
      } else {
        url.searchParams.set('v', viewParam);
      }
      window.history.replaceState(null, '', url.toString());
    }
    setTimeout(() => handleFetchReport(isDetailed, deptKey), 50);
  };

  // Handle report generation
  const handleFetchReport = (
    detailed: boolean,
    overrideDept?: string,
    overrideFrom?: string,
    overrideTo?: string,
    overrideScope?: 'DELIVERED' | 'UNDELIVERED' | 'ALL',
    overrideSupplierId?: string,
    overrideItemStatus?: string
  ) => {
    setIsDetailed(detailed);
    setArchiveSuccessRef(null);
    const targetDept = overrideDept || department;
    const fromVal = overrideFrom !== undefined ? overrideFrom : from;
    const toVal = overrideTo !== undefined ? overrideTo : to;
    const scopeVal = overrideScope !== undefined ? overrideScope : deliveryScope;
    const supplierIdVal = overrideSupplierId !== undefined ? overrideSupplierId : supplierId;
    const itemStatusVal = overrideItemStatus !== undefined ? overrideItemStatus : itemStatus;

    if (typeof window !== 'undefined' && targetDept === 'SUPPLIER') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', 'shops');
      if (supplierIdVal) url.searchParams.set('supplierId', supplierIdVal);
      else url.searchParams.delete('supplierId');
      if (itemStatusVal) url.searchParams.set('itemStatus', itemStatusVal);
      else url.searchParams.delete('itemStatus');
      window.history.replaceState(null, '', url.toString());
    }

    startTransition(async () => {
      const params = new URLSearchParams({
        dept: targetDept,
        detailed: detailed ? 'true' : 'false',
        ...(fromVal ? { from: fromVal } : {}),
        ...(toVal ? { to: toVal } : {}),
        ...(targetDept === 'DELIVERY' && courierCompany ? { courierCompany } : {}),
        ...(targetDept === 'DELIVERY' && batchRef ? { batchRef } : {}),
        ...(targetDept === 'DELIVERY' && deliveryStatus ? { status: deliveryStatus } : {}),
        ...(targetDept === 'DELIVERY' ? { scope: scopeVal } : {}),
        ...(targetDept === 'SUPPLIER' && supplierIdVal ? { supplierId: supplierIdVal } : {}),
        ...(targetDept === 'SUPPLIER' && itemStatusVal ? { itemStatus: itemStatusVal } : {}),
        ...(targetDept === 'EXPENSES' && expenseCategory ? { category: expenseCategory } : {}),
        ...(targetDept === 'DIFFERENCES' && diffStatus ? { status: diffStatus } : {}),
        ...(targetDept === 'SETTLEMENTS' && settlementEntityType !== 'ALL' ? { entityType: settlementEntityType } : {}),
      });

      try {
        const res = await fetch(`/api/reports/segregated?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data);
        } else {
          alert('تعذر جلب بيانات التقرير.');
        }
      } catch {
        alert('حدث خطأ في الاتصال بالخادم أثناء توليد التقرير.');
      }
    });
  };

  // Immediate fetch on mount if no initial report was rendered
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const deptParam = url.searchParams.get('dept');
      const vParam = url.searchParams.get('v');
      let targetDept = department;

      if (deptParam && URL_DEPT_MAP[deptParam.toLowerCase()]) {
        targetDept = URL_DEPT_MAP[deptParam.toLowerCase()]!;
        setDepartment(targetDept);
      } else if (vParam && vParam !== 'reports' && URL_DEPT_MAP[vParam.toLowerCase()]) {
        targetDept = URL_DEPT_MAP[vParam.toLowerCase()]!;
        setDepartment(targetDept);
      }

      const urlSupplierId = url.searchParams.get('supplierId') || '';
      const urlItemStatus = url.searchParams.get('itemStatus') || url.searchParams.get('status') || '';
      if (urlSupplierId) setSupplierId(urlSupplierId);
      if (urlItemStatus) setItemStatus(urlItemStatus);

      if (!reportData) {
        handleFetchReport(isDetailed, targetDept, undefined, undefined, undefined, urlSupplierId, urlItemStatus);
      }
    }
  }, []);

  // Fetch archived reports
  const loadArchive = async () => {
    setLoadingArchive(true);
    try {
      const data = await getArchivedReportsAction({
        department: archiveDeptFilter,
        search: archiveSearch,
      });
      setArchivedReports(data);
    } catch {
      alert('تعذر تحميل سجل التقارير المعتمدة');
    } finally {
      setLoadingArchive(false);
    }
  };

  useEffect(() => {
    if (activeMode === 'archive') {
      loadArchive();
    }
  }, [activeMode, archiveDeptFilter, archiveSearch]);

  // Handle Official Issue & Archive Action
  const handleIssueAndArchive = async () => {
    if (!reportData) return;

    const confirmed = window.confirm(
      `هل تؤكد اعتماد وأرشفة "${reportData.reportTitle}" رسمياً بهوية رَواق والختم المعتمد؟\n\nسيتم تجميد التقرير في الأرشيف برقم مرجعي رسمي ولن يقبل التعديل.`
    );
    if (!confirmed) return;

    setIsArchiving(true);
    try {
      let targetEntityName = 'رَواق';
      if (department === 'DELIVERY') targetEntityName = courierCompany || 'كافة شركات التوصيل';
      if (department === 'SUPPLIER') {
        const sup = suppliers.find((s) => s.id === supplierId);
        targetEntityName = sup ? sup.name : 'كافة المحلات الشريكة';
      }
      if (department === 'EXPENSES') targetEntityName = 'قسم المصروفات التشغيلية';
      if (department === 'DIFFERENCES') targetEntityName = 'إدارة المطابقة والفروقات';
      if (department === 'SETTLEMENTS') targetEntityName = 'قسم التسويات والتوريدات';
      if (department === 'FINANCIAL_SUMMARY') targetEntityName = 'المركز المالي الشامل';

      const res = await issueAndArchiveReportAction({
        department: department as any,
        reportTitle: reportData.reportTitle,
        targetEntityName,
        periodFrom: from || undefined,
        periodTo: to || undefined,
        isDetailed,
        summaryPayload: reportData.summary || reportData.data || {},
        dataPayload: {
          columns: reportData.columns || [],
          rows: reportData.rows || [],
          metadata: {
            filtersApplied: reportData.filtersApplied,
            payments: reportData.payments,
            settlements: reportData.settlements,
            ordersGrouped: reportData.ordersGrouped,
          },
        },
        filterPayload: reportData.filtersApplied,
      });

      if (res.success) {
        setArchiveSuccessRef(res.reference);
        alert(`تم اعتماد وأرشفة التقرير رسمياً بنجاح!\nالرقم المرجعي الرسمي: ${res.reference}`);
      }
    } catch (err: any) {
      alert(`فشل اعتماد التقرير: ${err?.message || 'خطأ غير معروف'}`);
    } finally {
      setIsArchiving(false);
    }
  };

  // CSV Export
  const handleExportCSV = (dataToExport?: any) => {
    const target = dataToExport || reportData;
    if (!target || !target.rows) return;
    const header = target.columns.join(',');
    const rows = target.rows.map((row: string[]) =>
      row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [header, ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${target.reportTitle || 'تقرير'}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to extract summaries for preview
  const getSummariesList = (dept: string, summary: any, data: any) => {
    if (!summary && !data) return [];

    switch (dept) {
      case 'DELIVERY':
        return [
          { label: 'إجمالي طلبيات التجميع (Batches)', value: summary?.totalBatches?.toString() || '0' },
          { label: 'إجمالي عدد الطلبات', value: `${summary?.totalOrders || 0} طلب (${summary?.deliverySuccessRate || '100%'} تسليم)` },
          { label: 'مجموع أسعار الطلبيات الإجمالي', value: `${filsToDisplay(summary?.totalOrdersPriceFils || summary?.totalCodExpectedFils || 0)} د.أ` },
          { label: 'مجموع سعر التوصيل الإجمالي (سعر التكلفة)', value: `${filsToDisplay(summary?.totalCarrierCostFils || 0)} د.أ` },
          { label: 'صافي المبلغ المطلوب (سعر الطلبيات - التوصيل)', value: `${filsToDisplay(summary?.totalNetRequiredFils ?? (summary?.totalNetRemittanceFils || 0))} د.أ` },
          { label: 'المسدد بالتسويات المعتمدة', value: `${filsToDisplay(summary?.totalSettledFils ?? (summary?.totalCodSettledToRawaqFils || 0))} د.أ` },
          { label: 'المتبقي بذمة شركة التوصيل', value: `${filsToDisplay(summary?.totalRemainingFils ?? (summary?.totalCodUnremittedFils || 0))} د.أ` },
        ];
      case 'SUPPLIER':
        return [
          { label: 'المحل التجاري الشريك', value: summary?.supplierName || 'كافة المحلات' },
          { label: 'القطع الموردة المباعة', value: summary?.totalQuantitySupplied?.toString() || '0' },
          { label: 'المستحق المحاسبي العام للمحل', value: filsToDisplay(summary?.totalAccountingObligationFils || 0) },
          { label: 'المبلغ القابل للصرف حالياً', value: filsToDisplay(summary?.eligiblePayoutFils || 0) },
          { label: 'إجمالي المسدد للمحل سابقاً', value: filsToDisplay(summary?.totalPaidFils || 0) },
          { label: 'صافي الرصيد المتبقي بذمة رَواق', value: filsToDisplay(summary?.remainingBalanceFils || 0) },
        ];
      case 'EXPENSES':
        return [
          { label: 'عدد سندات المصروف', value: summary?.totalCount?.toString() || '0' },
          { label: 'إجمالي المصروفات التشغيلية', value: `${filsToDisplay(summary?.totalAmountFils || 0)} د.أ` },
        ];
      case 'DIFFERENCES':
        return [
          { label: 'إجمالي الفروقات المسجلة', value: summary?.totalCount?.toString() || '0' },
          { label: 'فروقات معلقة بانتظار الحل', value: summary?.openCount?.toString() || '0' },
          { label: 'فروقات تمت تسويتها', value: summary?.resolvedCount?.toString() || '0' },
          { label: 'إجمالي مبالغ الفروقات', value: `${filsToDisplay(summary?.totalDifferenceFils || 0)} د.أ` },
          { label: 'صافي الفروقات المعلقة', value: `${filsToDisplay(summary?.openDifferenceFils || 0)} د.أ` },
        ];
      case 'SETTLEMENTS':
        return [
          { label: 'عدد عمليات التسوية', value: summary?.totalCount?.toString() || '0' },
          { label: 'إجمالي توريدات COD الواردة (+)', value: `${filsToDisplay(summary?.totalCodRemittedFils || 0)} د.أ` },
          { label: 'إجمالي مدفوعات المحلات الصادرة (-)', value: `${filsToDisplay(summary?.totalSupplierPaidFils || 0)} د.أ` },
          { label: 'صافي التدفق النقدي الناتج', value: `${filsToDisplay(summary?.netCashFlowFils || 0)} د.أ` },
        ];
      case 'FINANCIAL_SUMMARY':
        return [
          { label: 'صافي مبيعات المنتجات', value: `${filsToDisplay(data?.netProductSalesFils || 0)} د.أ` },
          { label: 'تكلفة البضاعة المباعة', value: `${filsToDisplay(data?.productCostsFils || 0)} د.أ` },
          { label: 'مجمل ربح المنتجات', value: `${filsToDisplay(data?.grossCommercialProfitFils || (data?.netProductSalesFils - data?.productCostsFils) || 0)} د.أ` },
          { label: 'صافي ربح / هامش التوصيل', value: `${filsToDisplay(data?.deliveryNetProfitFils || 0)} د.أ` },
          { label: 'المصروفات التشغيلية المعتمدة', value: `${filsToDisplay(data?.operatingExpensesFils || 0)} د.أ` },
          { label: 'صافي الربح التشغيلي النهائي', value: `${filsToDisplay(data?.netOperatingProfitFils || 0)} د.أ` },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Top View Mode Switch: Generator vs Archive ── */}
      <div className="no-print bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-emerald-950 flex items-center gap-2">
            <span>🏛️ مركز إصدار وأرشفة التقارير الرسمية لرَواق</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono">
              OFFICIAL HUB
            </span>
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            إصدار تقارير محاسبية معزولة بهوية رَواق والختم المعتمد، وتجميد الوثائق الرسمية في الأرشيف الدائم غير القابل للتعديل.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-zinc-100 p-1.5 rounded-xl border border-zinc-200">
          <button
            onClick={() => {
              setActiveMode('generator');
              setSelectedArchivedReport(null);
            }}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeMode === 'generator' && !selectedArchivedReport
                ? 'bg-emerald-950 text-amber-300 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            ⚡ إصدار وتوليد تقرير جديد
          </button>
          <button
            onClick={() => setActiveMode('archive')}
            className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
              activeMode === 'archive'
                ? 'bg-emerald-950 text-amber-300 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            🗄️ أرشيف التقارير المعتمدة والمجمدة
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODE 1: GENERATOR (إصدار تقرير جديد)
         ───────────────────────────────────────────────────────────── */}
      {activeMode === 'generator' && (
        <>
          {/* Success Banner if just archived */}
          {archiveSuccessRef && (
            <div className="no-print rounded-2xl border-2 border-emerald-500 bg-emerald-50 p-4 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                  <h4 className="text-sm font-black text-emerald-950">
                    تم اعتماد وتجميد التقرير بنجاح برقم مرجعي رسمي:
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-mono font-bold bg-white px-2.5 py-0.5 rounded-md border border-emerald-300 text-emerald-900">
                      {archiveSuccessRef}
                    </span>
                    <span className="text-xs text-emerald-800">
                      الوثيقة محفوظة في الأرشيف مع الختم الرسمي وتوقيع المسؤول المعتمد.
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/verify/report/${archiveSuccessRef}`}
                  target="_blank"
                  className="rounded-xl border border-emerald-600 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                >
                  🔗 فتح صفحة التحقق
                </Link>
                <button
                  onClick={() => setActiveMode('archive')}
                  className="rounded-xl bg-emerald-900 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-emerald-950"
                >
                  عرض في الأرشيف
                </button>
              </div>
            </div>
          )}

          {/* Screen Controls & Department Selector */}
          <div className="no-print space-y-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
              {/* Department Buttons */}
              <div>
                <span className="text-xs font-bold text-zinc-500 block mb-2">اختر القسم والتقرير المطلوب:</span>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => switchDepartment(d.id)}
                      className={`rounded-xl p-2.5 text-right transition-all flex flex-col justify-between ${
                        department === d.id
                          ? 'bg-emerald-950 text-amber-300 shadow-sm border border-emerald-900'
                          : 'bg-zinc-50 border border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <span className="text-xs font-bold block">{d.label}</span>
                      <span className={`text-[10px] mt-1 block line-clamp-2 ${department === d.id ? 'text-zinc-300' : 'text-zinc-500'}`}>
                        {d.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-100">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-zinc-600 ml-1">الفترة الزمنية:</span>
                  {[
                    { id: 'all', label: 'كافة الفترات' },
                    { id: 'today', label: 'اليوم' },
                    { id: 'yesterday', label: 'أمس' },
                    { id: 'week', label: 'آخر 7 أيام' },
                    { id: 'month', label: 'هذا الشهر' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id as any)}
                      className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                        activePreset === preset.id
                          ? 'bg-emerald-900 text-amber-200'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleFetchReport(isDetailed)}
                  disabled={isPending}
                  className="rounded-lg bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition"
                  title="تحديث فوري لبيانات التقرير"
                >
                  🔄 تحديث البيانات المباشرة
                </button>
              </div>

              {/* Specific Filter Inputs */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs pt-2">
                <div>
                  <label className="text-zinc-600 block mb-1 font-semibold">من تاريخ</label>
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => {
                      setFrom(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="text-zinc-600 block mb-1 font-semibold">إلى تاريخ</label>
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setActivePreset('custom');
                    }}
                    className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                  />
                </div>

                {department === 'DELIVERY' && (
                  <>
                    <div>
                      <label className="text-zinc-600 block mb-1 font-semibold">نطاق الجرد والتسليم</label>
                      <select
                        value={deliveryScope}
                        onChange={(e) => {
                          const nextScope = e.target.value as any;
                          setDeliveryScope(nextScope);
                          setTimeout(() => handleFetchReport(isDetailed, undefined, undefined, undefined, nextScope), 50);
                        }}
                        className="w-full rounded-lg border-2 border-emerald-600/40 bg-emerald-50/40 p-2 text-xs font-bold text-emerald-950 focus:border-emerald-600"
                      >
                        <option value="DELIVERED">📦 الطلبيات المسلمة (للجرد والتسويات)</option>
                        <option value="UNDELIVERED">⏳ الطلبيات غير المسلمة (قيد التوصيل)</option>
                        <option value="ALL">🌐 كافة الطلبيات (شامل)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-600 block mb-1 font-semibold">شركة التوصيل الشريكة</label>
                      <select
                        value={courierCompany}
                        onChange={(e) => {
                          setCourierCompany(e.target.value);
                          setTimeout(() => handleFetchReport(isDetailed), 50);
                        }}
                        className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                      >
                        <option value="">كافة شركات التوصيل</option>
                        {deliveryCompanies.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-600 block mb-1 font-semibold">كود طلبية التجميع (Batch)</label>
                      <input
                        type="text"
                        placeholder="مثال: BATCH-1"
                        value={batchRef}
                        onChange={(e) => {
                          setBatchRef(e.target.value);
                          setTimeout(() => handleFetchReport(isDetailed), 300);
                        }}
                        className="w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono"
                      />
                    </div>
                  </>
                )}

                {department === 'SUPPLIER' && (
                  <>
                    <div>
                      <label className="text-zinc-600 block mb-1 font-semibold">المحل التجاري الشريك</label>
                      <select
                        value={supplierId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSupplierId(val);
                          handleFetchReport(isDetailed, undefined, undefined, undefined, undefined, val, itemStatus);
                        }}
                        className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                      >
                        <option value="">كافة المحلات الشريكة</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-zinc-600 block mb-1 font-semibold">حالة الصرف والاستحقاق</label>
                      <select
                        value={itemStatus}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItemStatus(val);
                          handleFetchReport(isDetailed, undefined, undefined, undefined, undefined, supplierId, val);
                        }}
                        className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                      >
                        <option value="">كافة العمليات</option>
                        <option value="DELIVERED">مسلّم (جاهز للصرف فوراً)</option>
                        <option value="IN_PROGRESS">قيد التجهيز / التوصيل (مؤجل)</option>
                        <option value="CANCELLED">ملغي / مرتجع (غير مستحق)</option>
                      </select>
                    </div>
                  </>
                )}

                {department === 'EXPENSES' && (
                  <div>
                    <label className="text-zinc-600 block mb-1 font-semibold">تصنيف النفقة التشغيلية</label>
                    <select
                      value={expenseCategory}
                      onChange={(e) => {
                        setExpenseCategory(e.target.value);
                        setTimeout(() => handleFetchReport(isDetailed), 50);
                      }}
                      className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                    >
                      <option value="">كافة التصنيفات التشغيلية</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {department === 'DIFFERENCES' && (
                  <div>
                    <label className="text-zinc-600 block mb-1 font-semibold">حالة الفرق المالي</label>
                    <select
                      value={diffStatus}
                      onChange={(e) => {
                        setDiffStatus(e.target.value);
                        setTimeout(() => handleFetchReport(isDetailed), 50);
                      }}
                      className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                    >
                      <option value="">كافة الفروقات</option>
                      <option value="OPEN">معلق / بانتظار المعالجة</option>
                      <option value="RESOLVED">تمت التسوية والمعالجة</option>
                      <option value="WRITTEN_OFF">إسقاط إداري معتمد</option>
                    </select>
                  </div>
                )}

                {department === 'SETTLEMENTS' && (
                  <div>
                    <label className="text-zinc-600 block mb-1 font-semibold">نوع الجهة في التسوية</label>
                    <select
                      value={settlementEntityType}
                      onChange={(e) => {
                        setSettlementEntityType(e.target.value);
                        setTimeout(() => handleFetchReport(isDetailed), 50);
                      }}
                      className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                    >
                      <option value="ALL">كافة التسويات (شركات ومحلات)</option>
                      <option value="DELIVERY">توريدات شركات التوصيل فقط</option>
                      <option value="SUPPLIER">مدفوعات المحلات الشريكة فقط</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Mode and Export Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFetchReport(false)}
                    disabled={isPending}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      !isDetailed
                        ? 'bg-emerald-950 text-amber-300 shadow-sm'
                        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    📋 تقرير موجز (ملخص مؤشرات)
                  </button>
                  <button
                    onClick={() => handleFetchReport(true)}
                    disabled={isPending}
                    className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                      isDetailed
                        ? 'bg-emerald-950 text-amber-300 shadow-sm'
                        : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
                    }`}
                  >
                    📑 تقرير تفصيلي (سجل شامل)
                  </button>
                  {isPending && <span className="text-xs text-zinc-500 mr-2">جارٍ جلب البيانات ومطابقتها...</span>}
                </div>

                <div className="flex items-center gap-2">
                  {/* Primary Button: Approve & Archive */}
                  <button
                    onClick={handleIssueAndArchive}
                    disabled={isArchiving || !reportData}
                    className="rounded-xl bg-gradient-to-r from-emerald-900 to-emerald-950 px-4 py-2 text-xs font-bold text-amber-300 hover:brightness-110 shadow-sm flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    <span>🛡️</span>
                    <span>{isArchiving ? 'جارٍ الاعتماد والأرشفة...' : 'اعتماد وأرشفة التقرير رسمياً'}</span>
                  </button>

                  <button
                    onClick={() => handleExportCSV()}
                    className="rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 shadow-xs"
                  >
                    📥 تصدير Excel
                  </button>
                  <PrintButton
                    label="تصدير تقرير PDF واضح (A4)"
                    documentTitle={`تقرير_${department}_${new Date().toISOString().slice(0, 10)}`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Report Live Document Preview Sheet */}
          {reportData ? (
            <section className="space-y-4 print:space-y-0">
              {/* Screen Banner Note */}
              <div className="no-print rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📄</span>
                  <div>
                    <strong className="font-bold">معاينة المستند الرسمي بهوية رَواق:</strong>
                    <span className="text-emerald-900 mr-1">
                      يتضمن الختم الرسمي الحقيقي واسم الأدمن المسجل ({currentEmployee?.name || 'الإدارة المالية'}). اضغط &quot;اعتماد وأرشفة&quot; لتجميده رسمياً.
                    </span>
                  </div>
                </div>
                <span className="bg-white px-2.5 py-0.5 rounded-full border border-emerald-300 font-mono font-bold text-emerald-900 text-[11px]">
                  {reportData?.rows?.length || 0} سجل
                </span>
              </div>

              {/* Render High Fidelity Report */}
              <div className="bg-white rounded-2xl border border-zinc-300/80 p-6 md:p-10 shadow-md max-w-5xl mx-auto print:border-none print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:bg-transparent">
                <ReconciliationPrintReport
                  title={reportData.reportTitle}
                  subject={
                    reportData.department === 'SUPPLIER'
                      ? reportData.summary?.supplierName || 'المحلات الشريكة'
                      : reportData.department === 'DELIVERY'
                      ? courierCompany || 'كافة شركات التوصيل'
                      : reportData.department === 'EXPENSES'
                      ? 'قسم المصروفات التشغيلية'
                      : reportData.department === 'DIFFERENCES'
                      ? 'إدارة المطابقة والفروقات'
                      : reportData.department === 'SETTLEMENTS'
                      ? 'قسم التسويات والتوريدات'
                      : 'المركز المالي الشامل لمنظومة رَواق'
                  }
                  period={
                    Object.entries(reportData.filtersApplied || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' · ') || 'كافة الفترات'
                  }
                  generatedAt={reportData.generatedAt}
                  issuedByName={currentEmployee?.name}
                  issuedByRole={currentEmployee?.role}
                  approvedByName={currentEmployee?.name}
                  status="APPROVED"
                  sealUrl="/brand/rawaq_official_seal.svg"
                  summaries={getSummariesList(reportData.department, reportData.summary, reportData.data)}
                  columns={reportData.columns || []}
                  rows={reportData.rows || []}
                  payments={reportData.payments}
                  settlements={reportData.settlements}
                  ordersGrouped={reportData.ordersGrouped}
                  department={reportData.department}
                />
              </div>

              {/* ── Interactive Delivery Settlements Hub ── */}
              {department === 'DELIVERY' && reportData?.settlements && reportData.settlements.length > 0 && (
                <div className="no-print bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4 max-w-5xl mx-auto">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                        <span>⚖️ جدول تسويات ومطابقة طلبيات التوصيل (للطلبات المسلمة)</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono">
                          {reportData.settlements.length} طلبيات
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        يوضح المطلوب ومبلغ التسوية المسدد والمتبقي لكل طلبية على حدة، مع إمكانية إلغاء تسوية أي طلبية بشكل منفرد.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-zinc-200">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-zinc-50 text-zinc-600 font-bold border-b border-zinc-200">
                        <tr>
                          <th className="p-3">طلبية التجميع</th>
                          <th className="p-3">الطلبات المسلمة</th>
                          <th className="p-3">عدد المحلات التي استلم منها</th>
                          <th className="p-3">مجموع أسعار الطلبيات</th>
                          <th className="p-3">مجموع سعر التوصيل (سعر التكلفة)</th>
                          <th className="p-3">المطلوب (الصافي)</th>
                          <th className="p-3">مبلغ التسوية</th>
                          <th className="p-3">كم متبقي</th>
                          <th className="p-3">حالة التسوية</th>
                          <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {reportData.settlements.map((s: any) => (
                          <tr key={s.batchId} className="hover:bg-zinc-50/50">
                            <td className="p-3 font-mono font-bold text-zinc-900">{s.batchReference}</td>
                            <td className="p-3 font-mono">{s.deliveredOrdersCount}</td>
                            <td className="p-3 font-mono">{s.shopsCount ?? 1}</td>
                            <td className="p-3 font-mono">{filsToDisplay(s.totalOrdersPriceFils)} د.أ</td>
                            <td className="p-3 font-mono">{filsToDisplay(s.totalDeliveryCostFils)} د.أ</td>
                            <td className="p-3 font-mono font-bold text-emerald-950">{filsToDisplay(s.netRequiredFils)} د.أ</td>
                            <td className="p-3 font-mono font-bold text-emerald-800">{filsToDisplay(s.settledAmountFils)} د.أ</td>
                            <td className={`p-3 font-mono font-bold ${s.remainingBalanceFils > 0 ? 'text-amber-800' : 'text-zinc-500'}`}>
                              {filsToDisplay(s.remainingBalanceFils)} د.أ
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.status === 'مسددة بالكامل'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.status === 'مسددة جزئياً'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {s.hasSettlement ? (
                                <button
                                  onClick={async () => {
                                    const confirmed = window.confirm(`هل تؤكد إلغاء تسوية طلبية ${s.batchReference}؟\n\nسيتم عكس القيد المالي وإعادة المبلغ كذمة معلقة.`);
                                    if (!confirmed) return;
                                    const reason = window.prompt('سبب إلغاء التسوية:', 'إلغاء معتمد من كشف الجرد المالي');
                                    if (!reason) return;

                                    const fd = new FormData();
                                    fd.append('batchId', s.batchId);
                                    fd.append('reason', reason);

                                    startTransition(async () => {
                                      const res = await cancelDeliveryBatchSettlementAction(fd);
                                      if (res.success) {
                                        alert(res.message || 'تم إلغاء تسوية الطلبية بنجاح.');
                                        handleFetchReport(isDetailed);
                                      } else {
                                        alert(`فشل إلغاء التسوية: ${res.error}`);
                                      }
                                    });
                                  }}
                                  disabled={isPending}
                                  className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 transition disabled:opacity-50"
                                  title="إلغاء تسوية هذه الطلبية منفردة"
                                >
                                  ↩️ إلغاء تسوية الطلبية
                                </button>
                              ) : (
                                <span className="text-[11px] text-zinc-400 font-medium">بانتظار السداد</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          ) : (
            <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-zinc-500 shadow-sm">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-base font-bold text-zinc-800">جارٍ إعداد وتوليد التقرير المعتمد...</h3>
              <p className="text-xs text-zinc-400 mt-1">يتم استدعاء ومطابقة البيانات مباشرة من سجلات رَواق المحاسبية.</p>
            </div>
          )}
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODE 2: ARCHIVE (أرشيف التقارير المعتمدة والمجمدة)
         ───────────────────────────────────────────────────────────── */}
      {activeMode === 'archive' && (
        <div className="space-y-6">
          {selectedArchivedReport ? (
            /* Viewing a specific archived report */
            <div className="space-y-4">
              <div className="no-print bg-zinc-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🔒</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">الوثيقة الرسمية الأصلية المجمدة</h3>
                      <span className="bg-amber-400 text-zinc-950 font-mono font-bold text-xs px-2 py-0.5 rounded">
                        {selectedArchivedReport.reference}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-0.5">
                      معتمدة بواسطة <strong>{selectedArchivedReport.issuedByEmployeeName}</strong> بتاريخ{' '}
                      {new Date(selectedArchivedReport.createdAt).toLocaleString('ar-JO')} · نسخة ثابتة غير قابلة للتعديل.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/verify/report/${selectedArchivedReport.reference}`}
                    target="_blank"
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                  >
                    🔗 فحص التحقق الرقمي
                  </Link>
                  <button
                    onClick={() => handleExportCSV({
                      columns: selectedArchivedReport.dataPayload?.columns || [],
                      rows: selectedArchivedReport.dataPayload?.rows || [],
                      reportTitle: selectedArchivedReport.reportTitle,
                    })}
                    className="rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                  >
                    📥 ملف Excel
                  </button>
                  <PrintButton
                    label="تصدير تقرير PDF واضح (A4)"
                    documentTitle={selectedArchivedReport.reference}
                  />
                  <button
                    onClick={() => setSelectedArchivedReport(null)}
                    className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300"
                  >
                    ← العودة لقائمة الأرشيف
                  </button>
                </div>
              </div>

              {/* Render the frozen archived report */}
              <div className="bg-white rounded-2xl border border-zinc-300/80 p-6 md:p-10 shadow-md max-w-5xl mx-auto print:border-none print:p-0 print:m-0 print:shadow-none print:max-w-none print:w-full print:bg-transparent">
                <ReconciliationPrintReport
                  title={selectedArchivedReport.reportTitle}
                  subject={selectedArchivedReport.targetEntityName || 'رسمي'}
                  period={
                    selectedArchivedReport.periodFrom || selectedArchivedReport.periodTo
                      ? `${selectedArchivedReport.periodFrom ? new Date(selectedArchivedReport.periodFrom).toLocaleDateString('ar-JO') : ''} إلى ${selectedArchivedReport.periodTo ? new Date(selectedArchivedReport.periodTo).toLocaleDateString('ar-JO') : ''}`
                      : 'كافة الفترات'
                  }
                  generatedAt={new Date(selectedArchivedReport.createdAt).toLocaleString('ar-JO')}
                  referenceCode={selectedArchivedReport.reference}
                  issuedByName={selectedArchivedReport.issuedByEmployeeName}
                  issuedByRole={selectedArchivedReport.issuedByEmployeeRole}
                  approvedByName={selectedArchivedReport.approvedByEmployeeName}
                  approvedAt={selectedArchivedReport.approvedAt ? new Date(selectedArchivedReport.approvedAt).toLocaleString('ar-JO') : undefined}
                  status={selectedArchivedReport.status}
                  sealUrl={selectedArchivedReport.sealUrlSnapshot || '/brand/rawaq_official_seal.svg'}
                  summaries={getSummariesList(selectedArchivedReport.department, selectedArchivedReport.summaryPayload, selectedArchivedReport.summaryPayload)}
                  columns={selectedArchivedReport.dataPayload?.columns || []}
                  rows={selectedArchivedReport.dataPayload?.rows || []}
                  payments={selectedArchivedReport.dataPayload?.metadata?.payments}
                  settlements={selectedArchivedReport.dataPayload?.metadata?.settlements}
                  ordersGrouped={selectedArchivedReport.dataPayload?.metadata?.ordersGrouped}
                  department={selectedArchivedReport.department}
                  isArchived={true}
                />
              </div>
            </div>
          ) : (
            /* Archive List View */
            <div className="space-y-4">
              {/* Archive Search & Filters */}
              <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">سجل التقارير المحاسبية المعتمدة والمؤرشفة</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      تتضمن هذه القائمة جميع الوثائق المالية المعتمدة رسمياً، والمجمدة بختم رَواق وتوقيع المسؤول المالي.
                    </p>
                  </div>
                  <button
                    onClick={loadArchive}
                    disabled={loadingArchive}
                    className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-200 transition"
                  >
                    🔄 تحديث الأرشيف
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 text-xs pt-2 border-t border-zinc-100">
                  <div>
                    <label className="text-zinc-600 block mb-1 font-semibold">بحث بالرقم المرجعي أو العنوان أو المعتمد</label>
                    <input
                      type="text"
                      placeholder="مثال: RPT-2026-0001 أو اسم الموظف..."
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-zinc-600 block mb-1 font-semibold">تصفية حسب نوع التقرير</label>
                    <select
                      value={archiveDeptFilter}
                      onChange={(e) => setArchiveDeptFilter(e.target.value)}
                      className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
                    >
                      <option value="ALL">كافة الأقسام</option>
                      <option value="DELIVERY">شركات التوصيل واللوجستيات</option>
                      <option value="SUPPLIER">المحلات الشريكة والمتاجر</option>
                      <option value="EXPENSES">المصروفات التشغيلية</option>
                      <option value="DIFFERENCES">الفروقات والمطابقة</option>
                      <option value="SETTLEMENTS">التسويات والتوريدات النقدية</option>
                      <option value="FINANCIAL_SUMMARY">التقرير المالي الشامل</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={loadArchive}
                      className="w-full rounded-lg bg-emerald-950 text-amber-300 py-2 text-xs font-bold hover:bg-emerald-900 transition"
                    >
                      تطبيق الفلترة
                    </button>
                  </div>
                </div>
              </div>

              {/* Archived Reports Table */}
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
                {loadingArchive ? (
                  <div className="p-12 text-center text-zinc-500 text-xs">
                    جارٍ استرجاع سجلات الأرشيف الرسمي...
                  </div>
                ) : archivedReports.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
                          <th className="py-3 px-4 font-bold">الرقم المرجعي</th>
                          <th className="py-3 px-4 font-bold">عنوان التقرير</th>
                          <th className="py-3 px-4 font-bold">الجهة المعنية</th>
                          <th className="py-3 px-4 font-bold">المعتمد بواسطة</th>
                          <th className="py-3 px-4 font-bold">تاريخ الاعتماد</th>
                          <th className="py-3 px-4 font-bold">الحالة</th>
                          <th className="py-3 px-4 font-bold text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {archivedReports.map((report) => (
                          <tr key={report.id} className="hover:bg-zinc-50/80 transition">
                            <td className="py-3 px-4 font-mono font-bold text-emerald-950">
                              {report.reference}
                            </td>
                            <td className="py-3 px-4 font-semibold text-zinc-900">
                              {report.reportTitle}
                            </td>
                            <td className="py-3 px-4 text-zinc-700">
                              {report.targetEntityName || 'عام'}
                            </td>
                            <td className="py-3 px-4 text-zinc-700">
                              <span className="font-bold text-zinc-900 block">{report.issuedByEmployeeName}</span>
                              <span className="text-[10px] text-zinc-500 block">{report.issuedByEmployeeRole}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-zinc-600 text-[11px]">
                              {new Date(report.createdAt).toLocaleString('ar-JO')}
                            </td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                ✓ معتمد وموثق
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setSelectedArchivedReport(report)}
                                  className="rounded-lg bg-emerald-950 text-amber-300 px-3 py-1 text-xs font-bold hover:bg-emerald-900 transition"
                                >
                                  معاينة الوثيقة
                                </button>
                                <Link
                                  href={`/verify/report/${report.reference}`}
                                  target="_blank"
                                  className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                                  title="فتح صفحة التحقق الرقمي"
                                >
                                  🔗 التحقق
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-zinc-400 text-xs">
                    لا توجد تقارير مؤرشفة تطابق محددات البحث.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
