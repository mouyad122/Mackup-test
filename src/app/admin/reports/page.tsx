import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ReportsManager } from './ReportsManager';
import { generateDeliveryReport } from '@/lib/reports/delivery-report';
import Link from 'next/link';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requirePermission('manage:settings');
  const params = await searchParams;
  const initialDept = params.dept || 'DELIVERY';

  const [batches, suppliers, categories, initialReport] = await Promise.all([
    prisma.deliveryBatch.findMany({
      where: { courierCompany: { not: null } },
      select: { courierCompany: true },
      distinct: ['courierCompany'],
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    generateDeliveryReport({ isDetailed: true }),
  ]);

  const deliveryCompanies = Array.from(
    new Set([
      ...batches.map(b => b.courierCompany).filter(Boolean),
    ])
  ) as string[];

  const expenseCategories = [
    { id: 'PACKAGING', name: 'مواد التعبئة والتغليف والكراتين' },
    { id: 'MARKETING', name: 'إعلانات وحملات تسويقية رقمية' },
    { id: 'SOFTWARE', name: 'برمجيات وخوادم ورسائل WhatsApp API' },
    { id: 'SALARIES', name: 'رواتب وبدل مواصلات ومكافآت العمل' },
    { id: 'OPERATIONS', name: 'لوجستيات المستودع والمناولة' },
    { id: 'MISC', name: 'ضيافة ونثريات ومشتريات مكتبية' },
    { id: 'MAINTENANCE', name: 'صيانة ومعدات ومصاريف بنكية' },
    { id: 'OTHER', name: 'مصروفات تشغيلية أخرى' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />

      <main className="w-full flex-1 space-y-6 p-4 md:p-8 print:p-0 print:m-0 print:w-full print:max-w-none">
        <header className="no-print flex flex-wrap items-start justify-between gap-4 border-b border-zinc-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-700 animate-pulse" />
              <h1 className="text-2xl md:text-3xl font-extrabold text-zinc-900 tracking-tight">
                رَواق | مركز التقارير المعزولة
              </h1>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              تقارير متخصصة ومنعزلة لكل قسم تشغيلي ومحاسبي على حدة، مع منع تسريب بيانات التكاليف أو أرباح الأقسام الأخرى.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/reconciliation"
              className="rounded-lg bg-emerald-950 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-emerald-900 shadow-sm"
            >
              ← مركز المطابقة والتسويات
            </Link>
          </div>
        </header>

        <ReportsManager
          initialDepartment={initialDept}
          initialReport={initialReport}
          deliveryCompanies={deliveryCompanies}
          suppliers={suppliers}
          categories={expenseCategories}
        />
      </main>
    </div>
  );
}
