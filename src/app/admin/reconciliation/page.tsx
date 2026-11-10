import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ReconciliationService } from '@/lib/reconciliation/reconciliation-service';
import { generateDeliveryReport } from '@/lib/reports/delivery-report';
import { generateSupplierReport } from '@/lib/reports/supplier-report';
import { generateExpensesReport } from '@/lib/reports/expenses-report';
import { generateFinancialSummaryReport } from '@/lib/reports/financial-summary-report';
import { generateDifferencesReport } from '@/lib/reports/differences-report';
import { generateSettlementsReport } from '@/lib/reports/settlements-report';
import { ReconciliationClientTabs } from './ReconciliationClientTabs';
import { ReconciliationPrintReport } from './ReconciliationPrintReport';
import { PrintButton } from './PrintButton';
import Link from 'next/link';

export default async function ReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requirePermission('manage:settings');
  const params = await searchParams;
  const initialSupplierId =
    params.supplierId ||
    params.supplier ||
    params.shop ||
    params.shopId ||
    params.statement;
  const initialTab = params.v || params.tab || (initialSupplierId ? 'suppliers' : 'batches');

  // 1. استعلامات متزامنة وسريعة دون تقطيع السجلات ودون take عشوائي للأرصدة
  const [kpis, actionItems, batches, suppliers, deliveryCompanies, differences, transactions, employees, expenses] =
    await Promise.all([
      ReconciliationService.getKPIs(),
      ReconciliationService.getActionItems(),
      ReconciliationService.getDeliveryBatches(),
      prisma.supplier.findMany({ where: { isActive: true }, select: { id: true, name: true, phone: true } }),
      prisma.captain.findMany({ select: { id: true, name: true, phone: true, isActive: true } }),
      prisma.reconciliationDifference.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.financialTransaction.findMany({
        where: {
          type: {
            in: [
              'SUPPLIER_PAYMENT',
              'SUPPLIER_PAYMENT_REVERSAL',
              'CAPTAIN_PAYMENT',
              'CAPTAIN_PAYMENT_REVERSAL',
              'COD_SETTLEMENT',
              'DELIVERY_COST',
              'DELIVERY_COST_REVERSAL',
              'RECONCILIATION_CLEARING',
            ],
          },
        },
        include: { order: { select: { reference: true } } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      prisma.employee.findMany({ select: { id: true, name: true } }),
      prisma.expense.findMany({ orderBy: { expenseDate: 'desc' }, take: 100 }),
    ]);

  // حساب ملخصات المحلات عبر الخدمة المتخصصة
  const supplierSummaries = await Promise.all(
    suppliers.map(s => ReconciliationService.getSupplierSummary(s.id))
  );

  const courierCompanySummaries = await Promise.all(
    deliveryCompanies.map(c => ReconciliationService.getCaptainSummary(c.id))
  );

  const categories = [
    { id: 'PACKAGING', name: 'مواد التعبئة والتغليف والكراتين' },
    { id: 'MARKETING', name: 'إعلانات وحملات تسويقية رقمية' },
    { id: 'SOFTWARE', name: 'برمجيات وخوادم ورسائل WhatsApp API' },
    { id: 'SALARIES', name: 'رواتب وبدل مواصلات ومكافآت العمل' },
    { id: 'OPERATIONS', name: 'لوجستيات المستودع والمناولة' },
    { id: 'MISC', name: 'ضيافة ونثريات ومشتريات مكتبية' },
    { id: 'MAINTENANCE', name: 'صيانة ومعدات ومصاريف بنكية' },
    { id: 'OTHER', name: 'مصروفات تشغيلية أخرى' },
  ];

  let initialReport: any = null;
  if (initialTab === 'reports') {
    const dept = (params.dept || 'delivery').toLowerCase();
    if (dept === 'shops' || dept === 'suppliers') {
      initialReport = await generateSupplierReport({ isDetailed: true });
    } else if (dept === 'expenses') {
      initialReport = await generateExpensesReport({ isDetailed: true });
    } else if (dept === 'differences') {
      initialReport = await generateDifferencesReport({ isDetailed: true });
    } else if (dept === 'settlements') {
      initialReport = await generateSettlementsReport({ isDetailed: true });
    } else if (dept === 'financial') {
      initialReport = await generateFinancialSummaryReport({ isDetailed: true });
    } else {
      initialReport = await generateDeliveryReport({ isDetailed: true });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />

      <main className="min-w-0 max-w-full w-full flex-1 p-4 md:p-8 print:p-0 print:m-0 print:w-full print:max-w-none">
        {/* Screen Interactive Container */}
        <div className="space-y-6">
          {/* Header */}
          <header className="no-print flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
                رَواق | الجرد والتسويات
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-600 font-medium">
              مركز المطابقة المالية وإدارة المستحقات · نموذج رَواق المعتمد للتسويات والمقاصة
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PrintButton documentTitle="رواق_كشف_المطابقة_والتسويات_A4" />
          </div>
        </header>

        {/* Top 4 KPI Cards */}
        <section className="no-print grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="المؤشرات المالية الرئيسية">
          {/* Card 1: مستحق عند شركة التوصيل */}
          <article className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>مستحق عند شركة التوصيل</span>
              <span className="rounded bg-amber-50 px-2 py-0.5 text-amber-900 text-[11px] font-bold">
                عهدة COD معلقة
              </span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-amber-950">
              {filsToDisplay(kpis.deliveryCodCustodyFils)}
            </p>
            <p className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-1.5">
              مبالغ نقدية محصّلة من الزبائن بانتظار التوريد والمقاصة
            </p>
          </article>

          {/* Card 2: مستحقات الموردين */}
          <article className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>مستحقات الموردين (المحلات)</span>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 text-[11px] font-bold">
                التزام محاسبي
              </span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-zinc-900">
              {filsToDisplay(kpis.supplierAccountingObligationFils)}
            </p>
            <div className="text-[11px] text-zinc-600 border-t border-zinc-100 pt-1.5 flex justify-between">
              <span>القابل للصرف حالياً:</span>
              <strong className="font-mono text-amber-900">
                {filsToDisplay(kpis.supplierEligiblePayoutFils)}
              </strong>
            </div>
          </article>

          {/* Card 3: فروقات مفتوحة */}
          <article className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>فروقات مفتوحة</span>
              {kpis.unresolvedDifferencesCount > 0 ? (
                <span className="rounded bg-red-100 px-2 py-0.5 text-red-800 text-[11px] font-bold">
                  {kpis.unresolvedDifferencesCount} معلقة
                </span>
              ) : (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-800 text-[11px] font-bold">
                  مطابق 100%
                </span>
              )}
            </div>
            <p className="text-2xl font-extrabold font-mono text-red-600">
              {filsToDisplay(kpis.unresolvedDifferencesFils)}
            </p>
            <p className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-1.5">
              فروقات تحصيل أو رسوم غير مفسرة تحتاج مراجعة واعتماد
            </p>
          </article>

          {/* Card 4: تسويات مكتملة */}
          <article className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
              <span>تسويات مكتملة</span>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-800 text-[11px] font-bold">
                {kpis.completedSettlementsCount} تسوية
              </span>
            </div>
            <p className="text-2xl font-extrabold font-mono text-emerald-950">
              {filsToDisplay(kpis.completedSettlementsAmountFils)}
            </p>
            <p className="text-[11px] text-zinc-500 border-t border-zinc-100 pt-1.5">
              إجمالي التوريدات وسدادات المحلات المعتمدة بالدفتر المالي
            </p>
          </article>
        </section>

        {/* 5 Main Tabs Component */}
        <ReconciliationClientTabs
            initialTab={initialTab}
            initialSupplierId={initialSupplierId}
            batches={batches}
            suppliers={supplierSummaries}
            captains={courierCompanySummaries}
            differences={differences}
            transactions={transactions}
            employees={employees}
            expenses={expenses}
            categories={categories}
            initialReport={initialReport}
            currentEmployee={{ name: session.employee.name, role: session.employee.role.name }}
          />
        </div>
      </main>
    </div>
  );
}
