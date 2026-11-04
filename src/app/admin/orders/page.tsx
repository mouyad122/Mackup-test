import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getOrdersCommandCenterSummaryAction } from '@/actions/unified-orders';
import UnifiedOrdersCommandCenter from './UnifiedOrdersCommandCenter';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; search?: string; orderId?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;

  const summary = await getOrdersCommandCenterSummaryAction({
    tab: params.tab,
    search: params.search,
  });

  const captains = await prisma.captain.findMany({
    where: { isActive: true },
    select: { id: true, name: true, phone: true, status: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="flex min-h-screen flex-col bg-stone-100/60 md:flex-row font-sans" dir="rtl">
      <AdminSidebar
        employeeName={session.employee.name}
        roleName={session.employee.role.name}
      />
      <main className="min-w-0 max-w-full w-full flex-1 overflow-y-auto p-4 md:p-8">
        <UnifiedOrdersCommandCenter
          initialKpis={summary.kpis}
          initialOrders={summary.orders}
          captains={captains}
          selectedOrderId={params.orderId}
        />
      </main>
    </div>
  );
}
