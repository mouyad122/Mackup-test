import { requirePermission } from '@/lib/dal';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ProfitsService } from '@/lib/profits/profits-service';
import ProfitsClientTabs from './ProfitsClientTabs';

export default async function ProfitsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const session = await requirePermission('manage:settings');
  const params = searchParams ? await searchParams : {};
  const rawTab = params.tab || params.x || params.view || params.v;
  const fromParam = params.from;
  const toParam = params.to;

  const fromDate = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : undefined;
  const toDate = toParam ? new Date(`${toParam}T23:59:59.999Z`) : undefined;

  // استعلامات متزامنة للبيانات المالية الرئيسية لمركز الأرباح وفق النطاق الزمني المحدد
  const [kpis, employees, partners, ledger] = await Promise.all([
    ProfitsService.getProfitsKPIs(fromDate, toDate),
    ProfitsService.getEmployeePayrollList(),
    ProfitsService.getPartnersSummary(fromDate, toDate),
    ProfitsService.getProfitsFullLedger(50, fromDate, toDate),
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-stone-50" dir="rtl">
      <AdminSidebar
        employeeName={session.employee.name}
        roleName={session.employee.role.name}
      />

      <main className="min-w-0 max-w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <ProfitsClientTabs
            initialTab={rawTab}
            initialFrom={fromParam}
            initialTo={toParam}
            initialKpis={kpis}
            initialEmployees={employees}
            initialPartners={partners}
            initialLedger={ledger}
          />
        </div>
      </main>
    </div>
  );
}
