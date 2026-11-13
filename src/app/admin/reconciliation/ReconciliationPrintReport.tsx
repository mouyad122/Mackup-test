import React from 'react';
import { filsToDisplay } from '@/lib/money';

export type ReconciliationPrintReportProps = {
  title: string;
  subject: string;
  period: string;
  generatedAt: string;
  summaries: { label: string; value: string; hint?: string }[];
  columns: string[];
  rows: (string | number)[][];
  referenceCode?: string;
  departmentNote?: string;
  payments?: { date: string; reference: string; amountFils: number; type: string }[];
  settlements?: {
    batchReference: string;
    deliveredOrdersCount: number;
    shopsCount?: number;
    netRequiredFils: number;
    settledAmountFils: number;
    remainingBalanceFils: number;
    status: string;
    settlementDate?: string;
  }[];
  ordersGrouped?: Array<{
    orderReference: string;
    date: string;
    deliveryStatus: string;
    eligibilityStatus: string;
    fulfillmentStatus?: string;
    totalQuantity: number;
    totalCostFils: number;
    totalDueFils: number;
    items: Array<{
      productName: string;
      specs?: string;
      quantity: number;
      unitCostFils: number;
      totalCostFils: number;
      totalDueFils: number;
    }>;
  }>;
  department?: string;
  issuedByName?: string;
  issuedByRole?: string;
  approvedByName?: string;
  approvedAt?: string;
  status?: string;
  sealUrl?: string;
  verificationToken?: string;
  isArchived?: boolean;
};

export function ReconciliationPrintReport({
  title,
  subject,
  period,
  generatedAt,
  summaries,
  columns,
  rows,
  referenceCode,
  departmentNote,
  department,
  ordersGrouped,
  payments,
  settlements,
  issuedByName,
  issuedByRole,
  approvedByName,
  approvedAt,
  status = 'APPROVED',
  sealUrl = '/brand/rawaq_official_seal.svg',
  verificationToken,
  isArchived = false,
}: ReconciliationPrintReportProps) {
  const refCode = referenceCode || `RPT-2026-${generatedAt.replace(/[^0-9]/g, '').slice(0, 4) || '0001'}`;
  const issuerName = issuedByName || 'إدارة النظام المالية';
  const issuerRole = issuedByRole || 'المسؤول المالي المعتمد';
  const approver = approvedByName || issuerName;
  const approvalDate = approvedAt || generatedAt;

  return (
    <article className="rawaq-official-report reconciliation-print-report w-full bg-white text-zinc-900 font-sans" dir="rtl" lang="ar">
      {/* ── Print & A4 Optimized CSS ── */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important; /* Zero margin suppresses default browser headers (URL, title, timestamp, page number) */
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: #ffffff !important;
            color: #09090b !important;
          }
          .no-print {
            display: none !important;
          }
          .rawaq-official-report,
          .reconciliation-print-report {
            border: none !important;
            box-shadow: none !important;
            padding: 12mm 14mm !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .rawaq-kpi-card, .rawaq-sign-box, .rawaq-table-tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .rawaq-table th {
            background-color: #064e3b !important;
            color: #ffffff !important;
          }
        }
      `}} />

      {/* ── 1. Official Header & Brand Band ── */}
      <header className="border-b-2 border-emerald-950 pb-5 mb-5">
        <div className="flex items-center justify-between gap-4">
          {/* Logo and Platform Info */}
          <div className="flex items-center gap-3.5">
            <div className="w-16 h-16 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center p-1.5 shadow-xs">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo_rawaq.png"
                alt="شعار رَواق"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-emerald-950 tracking-tight">رَواق للتجارة الإلكترونية</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-amber-300 font-mono">
                  RAWAQ
                </span>
              </div>
              <p className="text-xs text-zinc-600 font-medium mt-0.5">المملكة الأردنية الهاشمية · عمان</p>
              <p className="text-[11px] text-zinc-500 font-medium">منظومة الإدارة والمطابقة المالية والتسويات الرسمية</p>
            </div>
          </div>

          {/* Document Reference Metadata */}
          <div className="text-left font-mono border-r-2 border-emerald-800 pr-4 space-y-1">
            <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 text-[11px] font-bold">
              {status === 'APPROVED' ? 'وثيقة محاسبية معتمدة ومؤرشفة' : 'مسودة تقرير للمراجعة'}
            </div>
            <div className="text-xs text-zinc-700">
              <span className="text-zinc-500 ml-1">رقم المرجع:</span>
              <strong className="text-emerald-950 font-bold">{refCode}</strong>
            </div>
            <div className="text-[11px] text-zinc-600">
              <span className="text-zinc-500 ml-1">تاريخ الإصدار:</span>
              <span>{generatedAt}</span>
            </div>
            {isArchived && (
              <div className="text-[10px] text-emerald-700 font-bold">
                ✓ نسخة أصلية مجمدة في الأرشيف
              </div>
            )}
          </div>
        </div>

        {/* Title Ribbon */}
        <div className="mt-4 pt-3 border-t border-zinc-200 flex items-center justify-between bg-zinc-50 rounded-xl px-4 py-2.5 border">
          <h2 className="text-base font-black text-emerald-950">{title}</h2>
        </div>
      </header>

      {/* ── 2. Meta Scope Grid ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50/80 rounded-xl p-3.5 border border-zinc-200 text-xs mb-5">
        <div className="space-y-0.5">
          <span className="text-zinc-500 font-semibold block text-[11px]">الجهة / القسم المعني:</span>
          <strong className="text-zinc-900 font-bold text-xs">{subject || 'عام'}</strong>
        </div>
        <div className="space-y-0.5">
          <span className="text-zinc-500 font-semibold block text-[11px]">النطاق الزمني المحدد:</span>
          <strong className="text-zinc-900 font-bold text-xs">{period || 'كافة الفترات'}</strong>
        </div>
        <div className="space-y-0.5">
          <span className="text-zinc-500 font-semibold block text-[11px]">إجمالي السجلات:</span>
          <strong className="text-zinc-900 font-bold font-mono text-xs">{rows.length.toLocaleString('en-GB')} سجل</strong>
        </div>
        <div className="space-y-0.5">
          <span className="text-zinc-500 font-semibold block text-[11px]">العملة المحاسبية:</span>
          <strong className="text-zinc-900 font-bold text-xs">دينار أردني (د.أ / Fils)</strong>
        </div>
      </section>

      {/* ── 3. Executive Summaries (KPIs) ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
          <h3 className="text-xs font-bold text-emerald-950">المؤشرات المالية والمجاميع الإجمالية المعتمدة</h3>
          <span className="text-[11px] text-zinc-500">محتسبة وفق حركة الدفتر المحاسبي الفعلي</span>
        </div>

        <div className={`grid gap-3 ${summaries.length <= 2 ? 'grid-cols-2' : summaries.length === 3 ? 'grid-cols-3' : summaries.length === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'}`}>
          {summaries.map((summary, idx) => (
            <div
              key={`${idx}-${summary.label}`}
              className="rawaq-kpi-card rounded-xl border border-zinc-200 bg-white p-3 shadow-xs space-y-1"
            >
              <span className="text-[11px] font-semibold text-zinc-600 block truncate">{summary.label}</span>
              <strong className="text-sm font-black text-emerald-950 font-mono block">{summary.value}</strong>
              {summary.hint && <span className="text-[10px] text-zinc-400 block truncate">{summary.hint}</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. Detailed Data Table / Hierarchical Order Breakdown ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
          <h3 className="text-xs font-bold text-emerald-950">سجل التفاصيل والعمليات المحاسبية</h3>
          <span className="text-[11px] font-mono text-zinc-600">
            {ordersGrouped && ordersGrouped.length > 0
              ? `${ordersGrouped.length.toLocaleString('en-GB')} طلب (${rows.length.toLocaleString('en-GB')} صنف)`
              : `${rows.length.toLocaleString('en-GB')} سجل مسجل`}
          </span>
        </div>

        {ordersGrouped && ordersGrouped.length > 0 ? (
          <div className="space-y-4">
            {ordersGrouped.map((grp, oIdx) => (
              <div
                key={`order-grp-${grp.orderReference}-${oIdx}`}
                className="rounded-xl border border-zinc-300 bg-white overflow-hidden shadow-2xs print:break-inside-avoid"
              >
                {/* Order Header Bar */}
                <div className="bg-zinc-100/90 px-3.5 py-2.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono font-black text-emerald-950 text-xs bg-emerald-950/10 px-2.5 py-0.5 rounded-md">
                      طلب #{grp.orderReference}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      📅 {grp.date}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      grp.deliveryStatus === 'تم التسليم بنجاح'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : grp.deliveryStatus === 'مرتجع / ملغي'
                        ? 'bg-rose-100 text-rose-900 border border-rose-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      {grp.deliveryStatus}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      grp.eligibilityStatus === 'جاهز للصرف فوراً'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : grp.eligibilityStatus === 'غير مستحق (ملغي)'
                        ? 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {grp.eligibilityStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-zinc-600 text-[11px]">
                      إجمالي القطع: <strong className="font-mono text-zinc-900">{grp.totalQuantity}</strong>
                    </span>
                    <span className="text-zinc-700 text-[11px]">
                      صافي المستحق للطلب:{' '}
                      <strong className="font-mono font-black text-emerald-950 text-xs" dir="ltr">
                        {filsToDisplay(grp.totalDueFils)} د.أ
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Products Table Under the Order */}
                <div className="overflow-x-auto">
                  <table className="rawaq-table w-full text-right text-xs border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-700 border-b border-zinc-200">
                        <th className="py-2 px-3 font-bold text-center w-8 text-[10px] text-zinc-500">#</th>
                        <th className="py-2 px-3 font-bold text-[11px]">اسم الصنف والمنتج والمواصفات</th>
                        <th className="py-2 px-3 font-bold text-[11px] text-center w-16">الكمية</th>
                        <th className="py-2 px-3 font-bold text-[11px]">سعر الشراء (للقطعة)</th>
                        <th className="py-2 px-3 font-bold text-[11px]">إجمالي التكلفة</th>
                        <th className="py-2 px-3 font-bold text-[11px]">المستحق النهائي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {grp.items.map((prod, pIdx) => (
                        <tr key={`item-${pIdx}`} className="hover:bg-zinc-50/70 transition">
                          <td className="py-2 px-3 text-center font-mono text-[10px] text-zinc-400">{pIdx + 1}</td>
                          <td className="py-2 px-3 text-[11px] font-medium text-zinc-900">
                            {prod.productName}
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono text-center text-zinc-800 font-bold">
                            {prod.quantity}
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono text-zinc-700" dir="ltr">
                            {filsToDisplay(prod.unitCostFils)} د.أ
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono text-zinc-700" dir="ltr">
                            {filsToDisplay(prod.totalCostFils)} د.أ
                          </td>
                          <td className="py-2 px-3 text-[11px] font-mono font-bold text-emerald-950" dir="ltr">
                            {filsToDisplay(prod.totalDueFils)} د.أ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        ) : rows.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-zinc-300">
            <table className="rawaq-table w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-950 text-white">
                  <th className="py-2.5 px-3 font-bold text-center w-10 text-[11px]">#</th>
                  {columns.map((col, cIdx) => (
                    <th key={`col-${cIdx}`} className="py-2.5 px-3 font-bold text-[11px] border-r border-emerald-900 first:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {rows.map((row, rIdx) => (
                  <tr key={`row-${rIdx}`} className={`rawaq-table-tr ${rIdx % 2 === 1 ? 'bg-zinc-50/70' : 'bg-white'} hover:bg-zinc-100/60 transition`}>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-zinc-500">{rIdx + 1}</td>
                    {row.map((cell, cellIdx) => (
                      <td key={`cell-${rIdx}-${cellIdx}`} className="py-2 px-3 text-[11px] text-zinc-800 border-r border-zinc-100 first:border-r-0">
                        {cell !== null && cell !== undefined && cell !== '' ? String(cell) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500 text-xs">
            لا توجد حركات مسجلة تطابق محددات البحث والفترة الزمنية المختارة.
          </div>
        )}
      </section>

      {/* ── Optional Batch Settlements / Remittances Table ── */}
      {settlements && settlements.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
            <h3 className="text-xs font-bold text-emerald-950">سجل تسويات الطلبيات والمطابقة المالية المعتمدة</h3>
            <span className="text-[11px] font-mono text-zinc-600">{settlements.length} طلبيات تجميع</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-300">
            <table className="rawaq-table w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-950 text-white">
                  <th className="py-2 px-3 font-bold text-center w-10 text-[11px]">#</th>
                  <th className="py-2 px-3 font-bold text-[11px]">طلبية التجميع (Batch)</th>
                  <th className="py-2 px-3 font-bold text-[11px]">عدد الطلبات</th>
                  <th className="py-2 px-3 font-bold text-[11px]">عدد المحلات التي استلم منها</th>
                  <th className="py-2 px-3 font-bold text-[11px]">المطلوب (الصافي)</th>
                  <th className="py-2 px-3 font-bold text-[11px]">مبلغ التسوية</th>
                  <th className="py-2 px-3 font-bold text-[11px]">كم متبقي</th>
                  <th className="py-2 px-3 font-bold text-[11px]">حالة التسوية</th>
                  <th className="py-2 px-3 font-bold text-[11px]">تاريخ التسوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {settlements.map((s, sIdx) => (
                  <tr key={`settle-${sIdx}`} className={`rawaq-table-tr ${sIdx % 2 === 1 ? 'bg-zinc-50/70' : 'bg-white'}`}>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-zinc-500">{sIdx + 1}</td>
                    <td className="py-2 px-3 text-[11px] font-mono font-bold text-zinc-900">{s.batchReference}</td>
                    <td className="py-2 px-3 text-[11px] font-mono text-zinc-700">{s.deliveredOrdersCount}</td>
                    <td className="py-2 px-3 text-[11px] font-mono text-zinc-700">{s.shopsCount ?? 1} محلات</td>
                    <td className="py-2 px-3 text-[11px] font-mono font-bold text-zinc-900">{filsToDisplay(s.netRequiredFils)} د.أ</td>
                    <td className="py-2 px-3 text-[11px] font-mono font-bold text-emerald-800">{filsToDisplay(s.settledAmountFils)} د.أ</td>
                    <td className={`py-2 px-3 text-[11px] font-mono font-bold ${s.remainingBalanceFils > 0 ? 'text-amber-800' : 'text-zinc-500'}`}>
                      {filsToDisplay(s.remainingBalanceFils)} د.أ
                    </td>
                    <td className="py-2 px-3 text-[11px]">
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
                    <td className="py-2 px-3 text-[11px] text-zinc-600">{s.settlementDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Optional Shop Disbursements / Payments Table ── */}
      {payments && payments.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200">
            <h3 className="text-xs font-bold text-emerald-950">سجل الدفعات والتحويلات المسددة للمحل</h3>
            <span className="text-[11px] font-mono text-zinc-600">{payments.length} سندات دفع</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-300">
            <table className="rawaq-table w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-800 text-white">
                  <th className="py-2 px-3 font-bold text-center w-10 text-[11px]">#</th>
                  <th className="py-2 px-3 font-bold text-[11px]">تاريخ السداد</th>
                  <th className="py-2 px-3 font-bold text-[11px]">المرجع / سند الصرف</th>
                  <th className="py-2 px-3 font-bold text-[11px]">نوع العملية</th>
                  <th className="py-2 px-3 font-bold text-[11px]">المبلغ المسدد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white">
                {payments.map((p, pIdx) => (
                  <tr key={`payment-${pIdx}`} className={`rawaq-table-tr ${pIdx % 2 === 1 ? 'bg-zinc-50/70' : 'bg-white'}`}>
                    <td className="py-2 px-3 text-center font-mono text-[11px] text-zinc-500">{pIdx + 1}</td>
                    <td className="py-2 px-3 text-[11px] text-zinc-800">{p.date}</td>
                    <td className="py-2 px-3 text-[11px] font-mono text-zinc-800">{p.reference}</td>
                    <td className="py-2 px-3 text-[11px] text-zinc-800">{p.type}</td>
                    <td className="py-2 px-3 text-[11px] font-mono font-bold text-emerald-950">
                      {filsToDisplay(p.amountFils)} د.أ
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── 5. Official Audit, Stamp & Authorization Sign-off ── */}
      <section className="rawaq-sign-box rounded-2xl border-2 border-emerald-900/40 bg-zinc-50/50 p-5 mt-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Issuer details from Server Session */}
          <div className="border border-zinc-200 rounded-xl p-3.5 bg-white space-y-1.5 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 block">جهة إعداد التقرير والمطابقة:</span>
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-500 block">صدر بواسطة الأدمن المعتمد:</span>
              <strong className="text-sm font-black text-emerald-950 block">{issuerName}</strong>
              <span className="text-[11px] text-zinc-600 block">{issuerRole}</span>
            </div>
            <div className="pt-1.5 border-t border-zinc-100 text-[10px] text-zinc-500">
              ساعة التوليد: <span className="font-mono">{generatedAt}</span>
            </div>
          </div>

          {/* Official Real Stamp Emblem */}
          <div className="flex flex-col items-center justify-center text-center p-2 relative">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sealUrl}
                alt="الختم الرسمي لرَواق"
                className="w-32 h-32 object-contain filter drop-shadow-xs transform -rotate-3 transition hover:rotate-0"
              />
            </div>
            <span className="text-[10px] font-bold text-emerald-900 mt-1">
              الختم المالي الرسمي المعتمد · رَواق
            </span>
          </div>

          {/* Financial Approval & Verification */}
          <div className="border border-zinc-200 rounded-xl p-3.5 bg-white space-y-1.5 shadow-xs">
            <span className="text-[11px] font-bold text-zinc-500 block">اعتماد وتدقيق الإدارة المالية:</span>
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-500 block">المعتمد المالي:</span>
              <strong className="text-sm font-black text-emerald-950 block">{approver}</strong>
              <span className="text-[11px] text-emerald-700 font-bold block">✓ معتمد ومطابق محاسبياً</span>
            </div>
            <div className="pt-1.5 border-t border-zinc-100 text-[10px] text-zinc-500">
              تاريخ الاعتماد: <span className="font-mono">{approvalDate}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. Footer & Digital Verification QR Code ── */}
      <footer className="pt-4 border-t-2 border-zinc-200 flex flex-wrap items-center justify-between text-[11px] text-zinc-500 gap-4">
        <div className="space-y-1">
          <div>
            <span>تم إصدار هذا الكشف آلياً ومطابقته رقمياً من منصة رَواق · </span>
            <span className="font-bold text-zinc-700">المملكة الأردنية الهاشمية</span>
          </div>
          <div className="text-[10px] text-zinc-400">
            وثيقة مالية رسمية مجمدة ومطابقة رقمياً برقم مرجعي غير قابل للتكرار.
          </div>
        </div>

        {/* QR التحقق من التقرير والفاتورة */}
        <div className="flex items-center gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl p-2.5 shadow-2xs">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
              `${typeof window !== 'undefined' ? window.location.origin : 'https://rawaq.jo'}/verify/report/${refCode}`
            )}`}
            alt={`QR التحقق من التقرير ${refCode}`}
            width={60}
            height={60}
            className="rounded-lg bg-white p-1 border border-zinc-200 shrink-0"
          />
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-black text-emerald-900 block flex items-center gap-1">
              <span>QR التحقق الرقمي</span>
              <span className="text-emerald-600">✓</span>
            </span>
            <span className="bg-white px-2 py-0.5 rounded text-[10px] font-mono font-bold text-zinc-800 border border-zinc-200 block" dir="ltr">
              {refCode}
            </span>
            <span className="text-[9px] text-zinc-500 block">
              امسح الرمز للتحقق الفوري من صحة الوثيقة
            </span>
          </div>
        </div>
      </footer>
    </article>
  );
}
