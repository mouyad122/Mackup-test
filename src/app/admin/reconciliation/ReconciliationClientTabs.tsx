'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { filsToDisplay } from '@/lib/money';
import {
  settleDeliveryBatchAction,
  settleCaptainClearingAction,
  resolveDiscrepancyAction,
  universalReverseSettlementAction,
} from '@/actions/reconciliation';
import { settleSupplier, settleCaptain, createExpense } from '@/actions/operations';
import { PrintButton } from './PrintButton';
import { ReconciliationPrintReport } from './ReconciliationPrintReport';
import { ReportsManager } from '../reports/ReportsManager';

function generateUUID(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

interface Props {
  initialTab?: string;
  batches: any[];
  suppliers: any[];
  captains: any[];
  differences: any[];
  transactions: any[];
  employees: { id: string; name: string }[];
  expenses?: any[];
  categories?: { id: string; name: string }[];
  initialReport?: any;
  currentEmployee?: { name: string; role: string };
}

export function ReconciliationClientTabs({
  initialTab = 'delivery',
  batches,
  suppliers,
  captains,
  differences,
  transactions,
  employees,
  expenses = [],
  categories = [],
  initialReport,
  currentEmployee,
}: Props) {
  // Normalize tab key based on ?v= parameter
  const resolveTab = (t: string) => {
    const val = (t || '').toLowerCase();
    if (val === 'delivery' || val === 'batches' || val === 'delivery_batches' || val === 'companies') return 'delivery';
    if (val === 'suppliers' || val === 'shops' || val === 'stores') return 'suppliers';
    if (val === 'expenses') return 'expenses';
    if (val === 'reports') return 'reports';
    if (val === 'ledger' || val === 'differences') return 'ledger';
    return 'delivery';
  };

  const [activeTab, setActiveTab] = useState(resolveTab(initialTab));
  const [isPending, startTransition] = useTransition();

  // Switch tab and sync with browser URL parameter ?v=xxxxx
  const switchTab = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('v', tabId);
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Sync on initial mount if URL contains ?v=
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const v = url.searchParams.get('v');
      if (v) {
        setActiveTab(resolveTab(v));
      }
    }
  }, []);

  // Modals state
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [selectedCaptain, setSelectedCaptain] = useState<any | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<any | null>(null);
  const [statementData, setStatementData] = useState<any | null>(null);

  // Form states
  const [deliveryPolicy, setDeliveryPolicy] = useState<'NET_SETTLEMENT' | 'GROSS_REMITTANCE'>('NET_SETTLEMENT');
  const [actualReceivedInput, setActualReceivedInput] = useState<string>('');
  const [diffReason, setDiffReason] = useState('');
  const [diffCategory, setDiffCategory] = useState('REMITTANCE_SHORTAGE');

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  // Handle batch selection
  const handleOpenBatch = (batch: any) => {
    setSelectedBatch(batch);
    setDeliveryPolicy('NET_SETTLEMENT');
    const defaultAmount = (batch.netExpectedRemittanceFils / 1000).toFixed(3);
    setActualReceivedInput(defaultAmount);
    setDiffReason('');
  };

  // Live difference for batch modal
  const calcExpectedRemittanceFils = selectedBatch
    ? deliveryPolicy === 'NET_SETTLEMENT'
      ? Math.max(0, selectedBatch.collectedCodFils - selectedBatch.totalCarrierCostFils)
      : selectedBatch.collectedCodFils
    : 0;

  const actualReceivedFils = Math.round((parseFloat(actualReceivedInput) || 0) * 1000);
  const batchDifferenceFils = calcExpectedRemittanceFils - actualReceivedFils;

  // Handle statement generator (Strict isolation: zero cross-leaks)
  const generateStatement = (type: 'SUPPLIER' | 'CAPTAIN', entity: any) => {
    const isSupplier = type === 'SUPPLIER';
    const entityTx = transactions.filter(t =>
      isSupplier ? t.supplierId === entity.supplierId : t.captainId === entity.captainId
    );

    const rows = entityTx.map(t => [
      new Date(t.createdAt).toLocaleString('en-GB'),
      t.type,
      t.order?.reference || '—',
      t.description || '—',
      (t.direction === 'OUT' ? '-' : '+') + filsToDisplay(t.amount),
      t.createdByEmployeeId ? employeeMap.get(t.createdByEmployeeId) || 'النظام' : 'النظام',
    ]);

    // عزل قطعي: كشف المحل لا يحتوي أي معلومة عن التوصيل، وكشف التوصيل لا يحتوي أي مستحق للمحلات
    const summaries = isSupplier
      ? [
          { label: 'إجمالي مبيعات المحل', value: filsToDisplay(entity.totalSalesFils) },
          { label: 'تكلفة البضاعة للمحل', value: filsToDisplay(entity.totalCostFils) },
          { label: 'حصة المحل من الأرباح', value: filsToDisplay(entity.totalSupplierProfitFils) },
          { label: 'المستحق المحاسبي للمحل', value: filsToDisplay(entity.totalAccountingObligationFils) },
          { label: 'المبلغ القابل للصرف حالياً', value: filsToDisplay(entity.eligiblePayoutFils) },
          { label: 'المدفوع سابقاً للمحل', value: filsToDisplay(entity.totalPaidFils) },
          { label: 'الرصيد المتبقي بذمة رَواق للمحل', value: filsToDisplay(entity.remainingBalanceFils) },
          { label: 'الجرد العيني: إجمالي القطع الموردة', value: `${entity.totalSuppliedUnits || 0} قطعة` },
          { label: 'الجرد العيني: القطع المسلمة فعلياً', value: `${entity.deliveredUnits || 0} قطعة` },
        ]
      : [
          { label: 'رسوم التوصيل المستحقة للشركة', value: filsToDisplay(entity.earnedFeesFils) },
          { label: 'الرسوم المسددة للشركة', value: filsToDisplay(entity.paidFeesFils) },
          { label: 'المتبقي من رسوم التوصيل', value: filsToDisplay(entity.remainingEarningsFils) },
          { label: 'عهدة COD المحصلة بذمة الشركة', value: filsToDisplay(entity.cashCustodyHeldFils) },
          { label: 'عهدة COD الموردة للخزينة', value: filsToDisplay(entity.cashCustodyRemittedFils) },
          { label: 'صافي العهدة المعلقة بذمة الشركة', value: filsToDisplay(entity.netCashCustodyFils) },
        ];

    setStatementData({
      title: isSupplier ? `كشف حساب محل معتمد: ${entity.supplierName}` : `كشف حساب شركة التوصيل: ${entity.captainName}`,
      subject: isSupplier ? `المحل: ${entity.supplierName}` : `شركة التوصيل: ${entity.captainName}`,
      period: 'شامل لكافة الحركات المعتمدة بالدفتر المالي',
      generatedAt: new Date().toLocaleString('en-GB'),
      summaries,
      columns: ['التاريخ والوقت', 'نوع القيد', 'المرجع', 'البيان المحاسبي', 'المبلغ', 'المسؤول'],
      rows,
    });
  };

  // Derive unique delivery companies
  const deliveryCompaniesList = Array.from(
    new Set([
      ...batches.map(b => b.courierCompany),
      ...captains.map(c => c.captainName),
    ].filter(Boolean))
  ) as string[];

  const suppliersList = suppliers.map(s => ({
    id: s.supplierId,
    name: s.supplierName,
  }));

  return (
    <div className="space-y-6">
      {/* Tab Navigation with ?v= Sync */}
      <nav className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 border-b border-zinc-200 pb-4" aria-label="أقسام المطابقة">
        {[
          { id: 'delivery', label: 'شركة التوصيل', subtitle: 'طلبيات • COD • رسوم • توريدات', count: batches.length },
          { id: 'suppliers', label: 'الموردون (المحلات)', subtitle: 'مستحقات • دفعات • تعديلات', count: suppliers.length },
          { id: 'expenses', label: 'المصروفات', subtitle: 'المصروفات التشغيلية والإدارية', count: expenses.length },
          { id: 'reports', label: 'التقارير وكشوف الحساب', subtitle: 'PDF • Excel • طباعة', count: undefined },
          { id: 'ledger', label: 'السجل والفروقات', subtitle: 'المطابقة • التصحيحات • الاعتمادات', count: differences.filter(d => d.status === 'OPEN').length, alert: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex flex-col items-start rounded-xl p-3 text-right transition-all border ${
              activeTab === tab.id
                ? 'bg-emerald-950 text-white border-emerald-950 shadow-md ring-2 ring-emerald-800/30'
                : 'bg-white text-zinc-700 hover:bg-zinc-50 border-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 w-full justify-between">
              <span className={`text-sm font-bold ${activeTab === tab.id ? 'text-amber-300' : 'text-zinc-900'}`}>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-mono ${
                    activeTab === tab.id
                      ? 'bg-emerald-900 text-amber-200'
                      : tab.alert && tab.count > 0
                      ? 'bg-red-100 text-red-800 font-bold'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </div>
            <span className={`text-[11px] mt-1 line-clamp-1 ${activeTab === tab.id ? 'text-emerald-200' : 'text-zinc-500'}`}>
              {tab.subtitle}
            </span>
          </button>
        ))}
      </nav>

      {/* TAB 1: شركة التوصيل (?v=delivery أو ?v=batches) */}
      {activeTab === 'delivery' && (
        <section className="no-print space-y-6">
          {/* قسم طلبيات التوصيل المجمعة */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">مطابقة طلبيات شركة التوصيل المجمعة</h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  مطابقة مبالغ الدفع عند الاستلام (COD) المحصلة فعلياً مع رسوم التوصيل المتفق عليها، مع دعم التوريدات الجزئية وتوثيق الأرصدة المتبقية.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-right text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600">
                  <tr>
                    <th className="p-3">رقم الطلبية</th>
                    <th className="p-3">شركة التوصيل</th>
                    <th className="p-3">حالة الطلبات</th>
                    <th className="p-3">COD المحصل</th>
                    <th className="p-3">رسوم التوصيل</th>
                    <th className="p-3">الصافي المتوقع</th>
                    <th className="p-3">المورّد سابقاً</th>
                    <th className="p-3">المتبقي بذمة الشركة</th>
                    <th className="p-3">حالة التسوية</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {batches.map(b => (
                    <tr key={b.batchId} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-950">{b.reference}</td>
                      <td className="p-3">
                        <div className="font-semibold">{b.courierCompany}</div>
                        <div className="text-xs text-zinc-500">{b.courierName} · {b.courierPhone}</div>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-emerald-700">{b.deliveredCount} مسلّم</span>
                          {b.failedCount > 0 && <span className="text-red-600">· {b.failedCount} متعذر</span>}
                          {b.inProgressCount > 0 && <span className="text-zinc-500">· {b.inProgressCount} جارٍ</span>}
                        </span>
                        {b.totalItemsCount !== undefined && b.totalItemsCount > 0 && (
                          <div className="text-[11px] text-zinc-500 mt-0.5 font-medium">
                            الجرد العيني: {b.deliveredItemsCount || 0} من {b.totalItemsCount} قطعة
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-zinc-900">{filsToDisplay(b.collectedCodFils)}</td>
                      <td className="p-3 font-mono text-zinc-600">{filsToDisplay(b.totalCarrierCostFils)}</td>
                      <td className="p-3 font-mono font-bold text-emerald-900">
                        {filsToDisplay(b.netExpectedRemittanceFils)}
                      </td>
                      <td className="p-3 font-mono text-zinc-700">
                        {filsToDisplay(b.previouslyRemittedFils || 0)}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-950">
                        {filsToDisplay(b.remainingBalanceFils !== undefined ? b.remainingBalanceFils : b.netExpectedRemittanceFils)}
                      </td>
                      <td className="p-3">
                        {b.isSettled ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                            تمت التسوية بالكامل
                          </span>
                        ) : b.isPartiallySettled ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                            تسوية جزئية (متبقي)
                          </span>
                        ) : b.deliveredCount > 0 ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">
                            بانتظار التوريد والمطابقة
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                            قيد التوصيل
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {!b.isSettled && b.deliveredCount > 0 ? (
                          <button
                            onClick={() => handleOpenBatch(b)}
                            className="rounded-lg bg-emerald-950 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors shadow-sm"
                          >
                            توريد دفعة / تسوية
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenBatch(b)}
                            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                          >
                            عرض الكشف
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {batches.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-zinc-500">
                        لا توجد طلبيات توصيل مسجلة حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* قسم حسابات ومقاصة شركات التوصيل */}
          <div className="space-y-4 pt-6 border-t border-zinc-200">
            <div>
              <h2 className="text-lg font-bold text-zinc-900">حسابات ومقاصة شركات التوصيل الخارجية</h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                التعامل مع شركة التوصيل كشخص اعتباري واحد، مع فصل صارم بين رسوم التوصيل المستحقة للشركة ونقد الـ COD الموجود في عهدتها، مع دعم المقاصة المالية المعتمدة.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {captains.map(c => (
                <article
                  key={c.captainId}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 hover:border-emerald-300 transition-colors"
                >
                  <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                    <div>
                      <h3 className="font-bold text-lg text-zinc-900">{c.captainName}</h3>
                      <p className="text-xs text-zinc-500">{c.phone || 'شركة توصيل معتمدة'}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        c.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {c.isActive ? 'نشط تعاقدياً' : 'متوقف'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                      <span className="text-amber-900 block font-bold">النقد في عهدة الشركة (COD)</span>
                      <strong className="text-amber-950 text-sm font-mono">{filsToDisplay(c.netCashCustodyFils)}</strong>
                    </div>
                    <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                      <span className="text-emerald-900 block font-bold">رسوم التوصيل المستحقة للشركة</span>
                      <strong className="text-emerald-950 text-sm font-mono">{filsToDisplay(c.remainingEarningsFils)}</strong>
                    </div>
                  </div>

                  <div className="text-xs bg-zinc-50 p-2.5 rounded-lg space-y-1">
                    <div className="flex justify-between text-zinc-600">
                      <span>إجمالي رسوم التوصيل تاريخياً:</span>
                      <span className="font-mono">{filsToDisplay(c.earnedFeesFils)}</span>
                    </div>
                    <div className="flex justify-between text-zinc-600">
                      <span>إجمالي ما سُدد للشركة سابقاً:</span>
                      <span className="font-mono">{filsToDisplay(c.paidFeesFils)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-zinc-800 border-t border-zinc-200 pt-1">
                      <span>صافي موقف ذمة الشركة:</span>
                      <span className="font-mono" dir="ltr">
                        {c.netPositionFils > 0
                          ? `بذمتها عهدة COD لرَواق: ${filsToDisplay(c.netPositionFils)}`
                          : c.netPositionFils < 0
                          ? `تستحق صرف دفعة: ${filsToDisplay(Math.abs(c.netPositionFils))}`
                          : 'متطابق بالكامل'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSelectedCaptain(c)}
                      className="flex-1 rounded-lg bg-emerald-950 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors"
                    >
                      تسوية عهدة / مقاصة الشركة
                    </button>
                    <button
                      onClick={() => generateStatement('CAPTAIN', c)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      title="إصدار كشف حساب شركة التوصيل"
                    >
                      كشف حساب الشركة
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB 2: الموردون والمحلات (?v=suppliers أو ?v=shops) */}
      {activeTab === 'suppliers' && (
        <section className="no-print space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">حسابات ومستحقات الموردين (المحلات الشريكة)</h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                تفرقة دقيقة بين «المستحق المحاسبي» الإجمالي و«المبلغ القابل للصرف» المستوفي لشروط التسليم الفعلي للمحل، مع عكس الأصناف المستبعدة تلقائياً.
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suppliers.map(s => (
              <article
                key={s.supplierId}
                className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <h3 className="font-bold text-lg text-zinc-900">{s.supplierName}</h3>
                    <p className="text-xs text-zinc-500">{s.phone || 'بدون هاتف'}</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {s.deliveredOrdersCount} طلبات مسلمة
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-zinc-50 p-2.5 rounded-lg">
                    <span className="text-zinc-500 block">مبيعات منتجات المحل</span>
                    <strong className="text-zinc-900 text-sm font-mono">{filsToDisplay(s.totalSalesFils)}</strong>
                  </div>
                  <div className="bg-zinc-50 p-2.5 rounded-lg">
                    <span className="text-zinc-500 block">تكلفة البضاعة</span>
                    <strong className="text-zinc-900 text-sm font-mono">{filsToDisplay(s.totalCostFils)}</strong>
                  </div>
                  <div className="bg-emerald-50/50 p-2.5 rounded-lg">
                    <span className="text-emerald-800 block font-medium">المستحق المحاسبي للمحل</span>
                    <strong className="text-emerald-950 text-sm font-mono">{filsToDisplay(s.totalAccountingObligationFils)}</strong>
                  </div>
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    <span className="text-amber-900 block font-bold">القابل للصرف للمحل الآن</span>
                    <strong className="text-amber-950 text-sm font-mono">{filsToDisplay(s.eligiblePayoutFils)}</strong>
                  </div>
                  <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100 col-span-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-emerald-900">الجرد العيني للقطع:</span>
                      <span className="font-mono font-bold text-emerald-950">
                        {s.deliveredUnits || 0} قطعة مسلّمة · {s.pendingUnits || 0} قيد التوصيل (من أصل {s.totalSuppliedUnits || 0} قطعة)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-600 border-t border-zinc-100 pt-2">
                  <span>المدفوع سابقاً للمحل: {filsToDisplay(s.totalPaidFils)}</span>
                  <span className="font-bold">المتبقي: {filsToDisplay(s.remainingBalanceFils)}</span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setSelectedSupplier(s)}
                    className="flex-1 rounded-lg bg-emerald-950 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors"
                  >
                    تسجيل دفعة للمحل
                  </button>
                  <button
                    onClick={() => generateStatement('SUPPLIER', s)}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                    title="إصدار كشف حساب محل معتمد"
                  >
                    كشف حساب المحل
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: المصروفات التشغيلية والإدارية (?v=expenses) */}
      {activeTab === 'expenses' && (
        <section className="no-print space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">المصروفات التشغيلية والإدارية</h2>
              <p className="text-xs text-zinc-600 mt-0.5">
                إدارة المصروفات مع منع أي تكرار مع أجور التوصيل بالدفتر المالي، وتصنيف كل مصروف بدقة.
              </p>
            </div>
          </div>

          {/* Form تسجيل مصروف جديد */}
          <form action={createExpense} className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">فئة المصروف</label>
              <select name="category" className="w-full rounded-lg border border-zinc-300 p-2 text-xs">
                <option value="PACKAGING">مواد التعبئة والتغليف والكراتين</option>
                <option value="MARKETING">إعلانات وحملات تسويقية رقمية</option>
                <option value="SOFTWARE">برمجيات وخوادم ورسائل WhatsApp API</option>
                <option value="SALARIES">رواتب وبدل مواصلات ومكافآت</option>
                <option value="OPERATIONS">لوجستيات المستودع والمناولة</option>
                <option value="MISC">ضيافة ونثريات ومشتريات مكتبية</option>
                <option value="MAINTENANCE">صيانة ومعدات ومصاريف بنكية</option>
                <option value="OTHER">مصروفات أخرى</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">المبلغ (د.أ)</label>
              <input name="amount" type="number" min="0.001" step="0.001" required placeholder="0.000" className="w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono font-bold" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">تاريخ المصروف</label>
              <input name="expenseDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="w-full rounded-lg border border-zinc-300 p-2 text-xs" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-zinc-700 block mb-1">بيان ووصف المصروف</label>
              <input name="description" required minLength={2} placeholder="شرح المصروف والغرض منه..." className="w-full rounded-lg border border-zinc-300 p-2 text-xs" />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-700 block mb-1">المرجع / رقم الفاتورة (اختياري)</label>
              <input name="reference" placeholder="رقم الإيصال أو الفاتورة..." className="w-full rounded-lg border border-zinc-300 p-2 text-xs" />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button type="submit" className="rounded-lg bg-emerald-950 px-6 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors shadow-sm">
                + تسجيل واعتماد المصروف
              </button>
            </div>
          </form>

          {/* جدول المصروفات */}
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-right text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">الفئة</th>
                  <th className="p-3">البيان والوصف</th>
                  <th className="p-3">المرجع</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="p-3 text-xs text-zinc-600">{new Date(e.expenseDate).toLocaleDateString('en-GB')}</td>
                    <td className="p-3 text-xs font-bold text-zinc-800">{e.category}</td>
                    <td className="p-3 text-xs text-zinc-700">{e.description}</td>
                    <td className="p-3 font-mono text-xs text-zinc-500">{e.reference || '—'}</td>
                    <td className="p-3 font-mono font-bold text-zinc-900">{filsToDisplay(e.amount)}</td>
                    <td className="p-3 text-xs text-zinc-600">{e.createdByEmployeeId ? employeeMap.get(e.createdByEmployeeId) || 'النظام' : 'النظام'}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-500">
                      لا توجد مصروفات تشغيلية مسجلة.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: التقارير وكشوف الحساب المعزولة (?v=reports) */}
      {activeTab === 'reports' && (
        <section className="space-y-4">
          <ReportsManager
            initialDepartment="DELIVERY"
            initialReport={initialReport}
            deliveryCompanies={deliveryCompaniesList}
            suppliers={suppliersList}
            categories={categories}
            currentEmployee={currentEmployee}
          />
        </section>
      )}

      {/* TAB 5: السجل والفروقات (?v=ledger أو ?v=differences) */}
      {activeTab === 'ledger' && (
        <section className="no-print space-y-6">
          {/* قسم الفروقات المالية */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">مركز إدارة الفروقات المالية</h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  الفروقات لا تُطمس أو تُعدل قسرياً؛ بل تُسجل كحالة مستقلة تتطلب قراراً مالياً موثقاً وسبباً معتمداً.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-right text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600">
                  <tr>
                    <th className="p-3">المرجع</th>
                    <th className="p-3">الجهة والنوع</th>
                    <th className="p-3">سبب الفرق</th>
                    <th className="p-3">المبلغ المتوقع</th>
                    <th className="p-3">المبلغ الفعلي</th>
                    <th className="p-3">قيمة الفرق</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {differences.map(d => (
                    <tr key={d.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-950">{d.reference}</td>
                      <td className="p-3">
                        <div className="font-semibold">{d.entityName || d.entityType}</div>
                        <div className="text-xs text-zinc-500">{new Date(d.createdAt).toLocaleDateString('en-GB')}</div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-zinc-800">{d.notes || d.reasonCategory}</span>
                      </td>
                      <td className="p-3 font-mono text-zinc-700">{filsToDisplay(d.expectedAmount)}</td>
                      <td className="p-3 font-mono text-zinc-700">{filsToDisplay(d.actualAmount)}</td>
                      <td className="p-3 font-mono font-bold text-red-600" dir="ltr">
                        {filsToDisplay(d.differenceAmount)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            d.status === 'OPEN'
                              ? 'bg-red-100 text-red-800'
                              : d.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}
                        >
                          {d.status === 'OPEN' ? 'بحاجة لمعالجة' : d.status === 'RESOLVED' ? 'تمت التسوية' : 'إسقاط معتمد'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {d.status === 'OPEN' ? (
                          <button
                            onClick={() => setSelectedDiff(d)}
                            className="rounded-lg bg-emerald-950 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors"
                          >
                            معالجة الفرق
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-500">
                            {d.resolutionNotes ? `ملاحظة: ${d.resolutionNotes}` : 'مغلق'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {differences.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-zinc-500">
                        لا توجد فروقات مالية مفتوحة. كافة العمليات متطابقة بالكامل.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* قسم سجل العمليات العامة */}
          <div className="space-y-4 pt-6 border-t border-zinc-200">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">سجل التسويات والعمليات المالية</h2>
                <p className="text-xs text-zinc-600 mt-0.5">
                  سجل تدقيق كامل لكافة حركات التسوية والعكس المالي المعتمدة، مع ربط كل عملية برقم تسويتها ومسؤولها.
                </p>
              </div>
              <PrintButton documentTitle="رواق_سجل_التسويات_المالية_A4" />
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
              <table className="w-full text-right text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-600">
                  <tr>
                    <th className="p-3">التاريخ والوقت</th>
                    <th className="p-3">نوع الحركة</th>
                    <th className="p-3">المرجع</th>
                    <th className="p-3">البيان والملاحظات</th>
                    <th className="p-3">المبلغ</th>
                    <th className="p-3">المسؤول</th>
                    <th className="p-3 text-center">إجراء عكسي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {transactions.map(t => {
                    const isReversal = t.type.includes('REVERSAL');
                    return (
                      <tr key={t.id} className={isReversal ? 'bg-amber-50/40 text-amber-950' : 'hover:bg-zinc-50/70'}>
                        <td className="p-3 text-xs text-zinc-600">{new Date(t.createdAt).toLocaleString('en-GB')}</td>
                        <td className="p-3">
                          <span className={`font-bold ${isReversal ? 'text-amber-800' : 'text-zinc-900'}`}>{t.type}</span>
                        </td>
                        <td className="p-3 font-mono text-xs">{t.order?.reference || t.businessEventKey || '—'}</td>
                        <td className="p-3 text-xs text-zinc-700">{t.description}</td>
                        <td className="p-3 font-mono font-bold" dir="ltr">
                          {t.direction === 'OUT' ? '-' : '+'}
                          {filsToDisplay(t.amount)}
                        </td>
                        <td className="p-3 text-xs text-zinc-600">
                          {t.createdByEmployeeId ? employeeMap.get(t.createdByEmployeeId) || 'النظام' : 'النظام'}
                        </td>
                        <td className="p-3 text-center">
                          {['SUPPLIER_PAYMENT', 'CAPTAIN_PAYMENT'].includes(t.type) && (
                            <button
                              onClick={async () => {
                                const reason = window.prompt('أدخل سبباً موثقاً لعكس هذه العملية المالية:');
                                if (!reason || !reason.trim()) return;
                                const form = new FormData();
                                form.set('settlementType', t.type === 'SUPPLIER_PAYMENT' ? 'SUPPLIER' : 'CAPTAIN');
                                form.set('settlementId', t.id);
                                form.set('reason', reason.trim());
                                await universalReverseSettlementAction(form);
                                window.location.reload();
                              }}
                              className="text-xs text-amber-700 hover:text-amber-900 font-bold underline"
                            >
                              عكس مالي
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-zinc-500">
                        لا توجد عمليات مسجلة بالدفتر المالي.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}


      {/* Master Reconciliation Audit Report (Prints automatically when viewing tabs 1-5 without opening statement modal) */}
      {activeTab !== 'reports' && !statementData && (
        <div className="hidden print:block">
          <ReconciliationPrintReport
            title="كشف المطابقة والعهد والتسويات المالي الموحد"
            subject="المركز المالي الشامل لمنظومة رَواق"
            period={new Date().toLocaleDateString('ar-JO', { year: 'numeric', month: 'long', day: 'numeric' })}
            generatedAt={new Date().toLocaleString('ar-JO')}
            referenceCode={`RQ-REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
            summaries={[
              { label: 'مستحق للمحلات (محاسبي)', value: filsToDisplay(suppliers.reduce((acc, s) => acc + s.totalAccountingObligationFils, 0)) },
              { label: 'القابل للصرف للمحلات حالياً', value: filsToDisplay(suppliers.reduce((acc, s) => acc + s.eligiblePayoutFils, 0)) },
              { label: 'نقد عهدة لدى التوصيل (COD)', value: filsToDisplay(captains.reduce((acc, c) => acc + c.codOutstandingFils, 0)) },
              { label: 'أجور توصيل مستحقة', value: filsToDisplay(captains.reduce((acc, c) => acc + c.deliveryFeesDueFils, 0)) },
              { label: 'فروقات غير محلولة', value: filsToDisplay(differences.filter(d => d.status === 'OPEN').reduce((acc, d) => acc + d.amountFils, 0)) },
            ]}
            columns={['اسم المحل التجاري', 'طلبات مسلمة', 'المستحق المحاسبي', 'القابل للصرف حالياً', 'الرصيد المتبقي']}
            rows={suppliers.map(s => [
              s.supplierName,
              s.deliveredOrdersCount.toString(),
              filsToDisplay(s.totalAccountingObligationFils),
              filsToDisplay(s.eligiblePayoutFils),
              filsToDisplay(s.remainingBalanceFils),
            ])}
          />
        </div>
      )}

      {/* MODAL 1: معالج تسوية شركة التوصيل والطلبية المجمعة */}
      {selectedBatch && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-200">
            <div className="bg-emerald-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-300">تسوية ومطابقة طلبية: {selectedBatch.reference}</h3>
                <p className="text-xs text-emerald-200 mt-0.5">
                  الناقل: {selectedBatch.courierCompany} · {selectedBatch.deliveredCount} طلبات مسلمة
                </p>
              </div>
              <button
                onClick={() => setSelectedBatch(null)}
                className="text-white hover:text-amber-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async formData => {
                startTransition(async () => {
                  const res = await settleDeliveryBatchAction(formData);
                  if (!res.success) {
                    alert(res.error || 'تعذر اعتماد التسوية.');
                  } else {
                    alert(res.hasDifference ? 'تم حفظ التسوية مع تسجيل الفرق في مركز الفروقات.' : 'تم اعتماد التسوية والتوريد بالكامل بنجاح.');
                    setSelectedBatch(null);
                    window.location.reload();
                  }
                });
              }}
              className="p-6 space-y-5"
            >
              <input type="hidden" name="batchId" value={selectedBatch.batchId} />
              <input type="hidden" name="idempotencyKey" value={generateUUID()} />

              {/* Policy selector */}
              <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 space-y-2">
                <span className="text-xs font-bold text-zinc-700 block">اتفاقية وسياسة التسوية:</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border bg-white cursor-pointer hover:border-emerald-600">
                    <input
                      type="radio"
                      name="policy"
                      value="NET_SETTLEMENT"
                      checked={deliveryPolicy === 'NET_SETTLEMENT'}
                      onChange={() => {
                        setDeliveryPolicy('NET_SETTLEMENT');
                        setActualReceivedInput(((selectedBatch.collectedCodFils - selectedBatch.totalCarrierCostFils) / 1000).toFixed(3));
                      }}
                    />
                    <div>
                      <strong className="block text-zinc-900">خصم الرسوم (صافي)</strong>
                      <span className="text-zinc-500 text-[11px]">تخصم الشركة أجورها وتورد الصافي</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border bg-white cursor-pointer hover:border-emerald-600">
                    <input
                      type="radio"
                      name="policy"
                      value="GROSS_REMITTANCE"
                      checked={deliveryPolicy === 'GROSS_REMITTANCE'}
                      onChange={() => {
                        setDeliveryPolicy('GROSS_REMITTANCE');
                        setActualReceivedInput((selectedBatch.collectedCodFils / 1000).toFixed(3));
                      }}
                    />
                    <div>
                      <strong className="block text-zinc-900">توريد إجمالي (كامل)</strong>
                      <span className="text-zinc-500 text-[11px]">تورد كامل COD وتسدد أجورها منفصلة</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Financial comparison cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <span className="text-zinc-500 block">COD المحصل</span>
                  <strong className="text-sm font-mono text-zinc-900 block mt-1">
                    {filsToDisplay(selectedBatch.collectedCodFils)}
                  </strong>
                </div>
                <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  <span className="text-zinc-500 block">رسوم التوصيل</span>
                  <strong className="text-sm font-mono text-zinc-900 block mt-1">
                    {filsToDisplay(selectedBatch.totalCarrierCostFils)}
                  </strong>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                  <span className="text-emerald-900 font-bold block">الصافي المطلوب</span>
                  <strong className="text-sm font-mono text-emerald-950 block mt-1">
                    {filsToDisplay(calcExpectedRemittanceFils)}
                  </strong>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold block">المتبقي للطلبية</span>
                  <strong className="text-sm font-mono text-amber-950 block mt-1">
                    {filsToDisplay(selectedBatch.remainingBalanceFils !== undefined ? selectedBatch.remainingBalanceFils : calcExpectedRemittanceFils)}
                  </strong>
                </div>
              </div>

              {/* Actual received and difference */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    المبلغ المصرّح بتوريده في هذه الدفعة (د.أ)
                  </label>
                  <input
                    name="actualReceivedAmount"
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={actualReceivedInput}
                    onChange={e => setActualReceivedInput(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 p-2 text-sm font-mono font-bold"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[11px] text-zinc-500">
                      المورّد سابقاً: {filsToDisplay(selectedBatch.previouslyRemittedFils || 0)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const rem = (selectedBatch.remainingBalanceFils !== undefined ? selectedBatch.remainingBalanceFils : calcExpectedRemittanceFils) / 1000;
                        setActualReceivedInput(rem.toFixed(3));
                      }}
                      className="text-[11px] text-emerald-800 font-bold underline"
                    >
                      توريد كامل المتبقي
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">طريقة الاستلام / التحويل</label>
                  <select name="paymentMethod" className="w-full rounded-lg border border-zinc-300 p-2 text-sm">
                    <option value="BANK_TRANSFER">حوالة بنكية / كليك (CliQ)</option>
                    <option value="CASH">نقداً في صندوق المتجر</option>
                    <option value="CARD">بطاقة / إيداع</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
              </div>

              {/* Partial settlement note if partial */}
              {actualReceivedFils < (selectedBatch.remainingBalanceFils !== undefined ? selectedBatch.remainingBalanceFils : calcExpectedRemittanceFils) && (
                <div className="bg-blue-50/70 p-3 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
                  <span>📌 تسوية جزئية: سيتبقى بذمة شركة التوصيل رصيد معلق قدره:</span>
                  <strong className="font-mono text-sm">
                    {filsToDisplay(Math.max(0, (selectedBatch.remainingBalanceFils !== undefined ? selectedBatch.remainingBalanceFils : calcExpectedRemittanceFils) - actualReceivedFils))}
                  </strong>
                </div>
              )}

              {/* Optional discrepancy toggle */}
              <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-zinc-800">
                  <input
                    type="checkbox"
                    name="isDiscrepancy"
                    value="true"
                    checked={diffCategory === 'PRICE_MISMATCH' || diffReason.length > 0}
                    onChange={e => {
                      if (!e.target.checked) {
                        setDiffReason('');
                      } else {
                        setDiffReason('فارق تحصيل في كشف الشركة');
                      }
                    }}
                    className="rounded text-emerald-950 focus:ring-emerald-900"
                  />
                  <span>يوجد فرق مالي أو نقص تحصيل غير مفسر صرحت به الشركة (يفتح بطاقة فرق في مركز الفروقات)</span>
                </label>

                {diffReason.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-zinc-200">
                    <div>
                      <label className="block text-[11px] text-zinc-600 mb-0.5">قيمة الفرق (د.أ)</label>
                      <input
                        name="discrepancyAmount"
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="0.000"
                        className="w-full rounded border border-zinc-300 p-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-600 mb-0.5">تصنيف الفرق</label>
                      <select
                        name="differenceCategory"
                        value={diffCategory}
                        onChange={e => setDiffCategory(e.target.value)}
                        className="w-full rounded border border-zinc-300 p-1.5 text-xs bg-white"
                      >
                        <option value="PRICE_MISMATCH">اختلاف في المبلغ المحصل من الزبون</option>
                        <option value="REMITTANCE_SHORTAGE">نقص في التوريد المصرح به</option>
                        <option value="UNAUTHORIZED_FEE">رسوم إضافية غير معتمدة</option>
                        <option value="RETURN_FAILED_DELIVERY">مرتجع أو فشل تسليم معلق</option>
                        <option value="INPUT_ERROR">خطأ في الإدخال أو كشف الشركة</option>
                        <option value="OTHER">سبب مالي آخر</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-zinc-600 mb-0.5">بيان وتوضيح الفرق</label>
                      <input
                        name="differenceReason"
                        placeholder="توضيح أو رقم إيصال الفرق..."
                        value={diffReason}
                        onChange={e => setDiffReason(e.target.value)}
                        className="w-full rounded border border-zinc-300 p-1.5 text-xs bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <input
                name="reference"
                placeholder="رقم مرجع الحوالة البنكية / إشعار الاستلام (اختياري)"
                className="w-full rounded-lg border border-zinc-300 p-2 text-xs"
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-950 px-6 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'جارٍ الاعتماد...' : 'اعتماد وحفظ التسوية'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: معالج تسوية المحل والدفعات الجزئية */}
      {selectedSupplier && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-200">
            <div className="bg-emerald-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-300">تسجيل دفعة / تسوية للمحل</h3>
                <p className="text-xs text-emerald-200 mt-0.5">{selectedSupplier.supplierName}</p>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-white hover:text-amber-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async formData => {
                startTransition(async () => {
                  const res = await settleSupplier(selectedSupplier.supplierId, formData);
                  if (res?.success) {
                    alert('تم تسجيل دفعة المحل بنجاح وربطها بالدفتر المالي.');
                    setSelectedSupplier(null);
                    window.location.reload();
                  } else {
                    alert(res?.error || 'تعذر تسجيل الدفعة.');
                  }
                });
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="idempotencyKey" value={generateUUID()} />

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                <div>
                  <span className="text-zinc-500 block">المستحق المحاسبي للمحل</span>
                  <strong className="text-sm font-mono text-zinc-900 block mt-0.5">
                    {filsToDisplay(selectedSupplier.totalAccountingObligationFils)}
                  </strong>
                </div>
                <div>
                  <span className="text-amber-900 font-bold block">القابل للصرف للمحل الآن</span>
                  <strong className="text-sm font-mono text-amber-950 block mt-0.5">
                    {filsToDisplay(selectedSupplier.eligiblePayoutFils)}
                  </strong>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-zinc-700">المبلغ المراد صرفه للمحل (د.أ)</label>
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('supplierAmountInput') as HTMLInputElement;
                      if (input) input.value = (selectedSupplier.eligiblePayoutFils / 1000).toFixed(3);
                    }}
                    className="text-[11px] text-emerald-800 font-bold underline"
                  >
                    صرف كامل القابل للصرف للمحل
                  </button>
                </div>
                <input
                  id="supplierAmountInput"
                  name="amount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  max={(selectedSupplier.remainingBalanceFils / 1000).toFixed(3)}
                  required
                  defaultValue={(selectedSupplier.eligiblePayoutFils / 1000).toFixed(3)}
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">طريقة الدفع</label>
                  <select name="paymentMethod" className="w-full rounded-lg border border-zinc-300 p-2 text-sm">
                    <option value="BANK_TRANSFER">حوالة بنكية / كليك</option>
                    <option value="CASH">نقداً</option>
                    <option value="CARD">بطاقة</option>
                    <option value="OTHER">شيك / أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">المرجع المالي</label>
                  <input
                    name="reference"
                    placeholder="رقم الحوالة أو الشيك"
                    className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">ملاحظات واعتماد الدفعة</label>
                <input
                  name="notes"
                  placeholder="ملاحظات التسوية..."
                  className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setSelectedSupplier(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-950 px-6 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'جارٍ الحفظ...' : 'اعتماد صرف الدفعة للمحل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: معالج تسوية شركة التوصيل والمقاصة */}
      {selectedCaptain && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-200">
            <div className="bg-emerald-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-300">تسوية مالية لشركة التوصيل: {selectedCaptain.captainName}</h3>
                <p className="text-xs text-emerald-200 mt-0.5">التعامل المالي يتم مع شركة التوصيل كجهة اعتبارية واحدة (فصل الرسوم عن العهدة والمقاصة)</p>
              </div>
              <button
                onClick={() => setSelectedCaptain(null)}
                className="text-white hover:text-amber-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async formData => {
                startTransition(async () => {
                  const actionType = formData.get('actionType') as string;
                  let res: any;
                  if (actionType === 'PAY_EARNINGS') {
                    res = await settleCaptain(selectedCaptain.captainId, formData);
                  } else {
                    res = await settleCaptainClearingAction(formData);
                  }

                  if (res?.success) {
                    alert('تم تنفيذ العملية المالية بنجاح وتحديث حسابات شركة التوصيل.');
                    setSelectedCaptain(null);
                    window.location.reload();
                  } else {
                    alert(res?.error || 'تعذر تنفيذ العملية.');
                  }
                });
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="captainId" value={selectedCaptain.captainId} />
              <input type="hidden" name="idempotencyKey" value={generateUUID()} />

              <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-center">
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                  <span className="text-amber-900 font-bold block">العهدة النقدية بذمة الشركة</span>
                  <strong className="text-sm font-mono text-amber-950 block mt-0.5">
                    {filsToDisplay(selectedCaptain.netCashCustodyFils)}
                  </strong>
                </div>
                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  <span className="text-emerald-900 font-bold block">رسوم التوصيل المستحقة للشركة</span>
                  <strong className="text-sm font-mono text-emerald-950 block mt-0.5">
                    {filsToDisplay(selectedCaptain.remainingEarningsFils)}
                  </strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">نوع الإجراء المالي مع الشركة</label>
                <select name="actionType" className="w-full rounded-lg border border-zinc-300 p-2 text-sm">
                  <option value="OFFSET_CLEARING">مقاصة مالية موثقة (خصم رسوم التوصيل المستحقة للشركة من عهدة COD)</option>
                  <option value="RECEIVE_COD">توريد عهدة نقدية من شركة التوصيل إلى خزينة رَواق</option>
                  <option value="PAY_EARNINGS">صرف وسداد رسوم التوصيل المستحقة لشركة التوصيل</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">المبلغ المطلوب (د.أ)</label>
                <input
                  name="amount"
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  defaultValue={(
                    Math.min(selectedCaptain.netCashCustodyFils, selectedCaptain.remainingEarningsFils) / 1000 ||
                    selectedCaptain.remainingEarningsFils / 1000 ||
                    0
                  ).toFixed(3)}
                  className="w-full rounded-lg border border-zinc-300 p-2.5 text-sm font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">طريقة الدفع / المقبوض</label>
                  <select name="paymentMethod" className="w-full rounded-lg border border-zinc-300 p-2 text-sm">
                    <option value="CASH">نقداً</option>
                    <option value="BANK_TRANSFER">حوالة بنكية / كليك</option>
                    <option value="OTHER">أخرى</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">المرجع</label>
                  <input
                    name="reference"
                    placeholder="رقم الإيصال أو المرجع"
                    className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">ملاحظات التوثيق</label>
                <input
                  name="notes"
                  placeholder="ملاحظات التسوية..."
                  className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setSelectedCaptain(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-950 px-6 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'جارٍ التنفيذ...' : 'اعتماد الإجراء'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: معالجة الفروقات */}
      {selectedDiff && (
        <div className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-200">
            <div className="bg-emerald-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-300">معالجة فرق مالي: {selectedDiff.reference}</h3>
                <p className="text-xs text-emerald-200 mt-0.5">{selectedDiff.entityName || selectedDiff.entityType}</p>
              </div>
              <button
                onClick={() => setSelectedDiff(null)}
                className="text-white hover:text-amber-300 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form
              action={async formData => {
                startTransition(async () => {
                  const res = await resolveDiscrepancyAction(formData);
                  if (res?.success) {
                    alert('تم تحديث حالة الفرق المالي وتوثيق الإجراء.');
                    setSelectedDiff(null);
                    window.location.reload();
                  } else {
                    alert(res?.error || 'تعذر معالجة الفرق.');
                  }
                });
              }}
              className="p-6 space-y-4"
            >
              <input type="hidden" name="diffId" value={selectedDiff.id} />

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span>المبلغ المتوقع:</span>
                  <span className="font-mono">{filsToDisplay(selectedDiff.expectedAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>المبلغ الفعلي:</span>
                  <span className="font-mono">{filsToDisplay(selectedDiff.actualAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-700 border-t border-amber-300 pt-1">
                  <span>قيمة الفرق:</span>
                  <span className="font-mono" dir="ltr">{filsToDisplay(selectedDiff.differenceAmount)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">القرار المالي</label>
                <select name="action" className="w-full rounded-lg border border-zinc-300 p-2 text-sm">
                  <option value="RESOLVE">تسوية الفرق (تم التوريد أو التصحيح)</option>
                  <option value="WRITE_OFF">إسقاط الفرق بقرار إداري معتمد</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">سبب ومستند المعالجة</label>
                <textarea
                  name="resolutionNotes"
                  required
                  rows={3}
                  placeholder="بيان رقم السند، أو تسوية لاحقة، أو مبرر الإسقاط..."
                  className="w-full rounded-lg border border-zinc-300 p-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setSelectedDiff(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-emerald-950 px-6 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 transition-colors disabled:opacity-50"
                >
                  {isPending ? 'جارٍ الحفظ...' : 'تثبيت القرار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: كشف الحساب المعتمد القابل للطباعة والمشاركة */}
      {statementData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto print:static print:p-0 print:m-0 print:bg-white print:overflow-visible print:z-auto print:block">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl overflow-hidden border border-zinc-200 my-8 print:border-none print:shadow-none print:my-0 print:max-w-none print:w-full print:rounded-none">
            <div className="no-print bg-emerald-950 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-amber-300">{statementData.title}</h3>
                <p className="text-xs text-emerald-200 mt-0.5">صادر من مركز رَواق للمطابقة والتسويات</p>
              </div>
              <div className="flex items-center gap-3">
                <PrintButton 
                  label="تصدير كشف PDF واضح (A4)" 
                  documentTitle={`كشف_حساب_${statementData.subject || 'رواق'}`} 
                />
                <button
                  onClick={() => setStatementData(null)}
                  className="text-white hover:text-amber-300 text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 print:p-0">
              <ReconciliationPrintReport
                title={statementData.title}
                subject={statementData.subject}
                period={statementData.period}
                generatedAt={statementData.generatedAt}
                summaries={statementData.summaries}
                columns={statementData.columns}
                rows={statementData.rows}
                referenceCode={`RQ-STM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
