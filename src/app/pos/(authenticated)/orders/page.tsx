import React from 'react';
import { requirePermission, getEmployeePermissions } from '@/lib/dal';
import { POSOrdersPanel } from '@/components/POSOrdersPanel';
import Link from 'next/link';

export default async function POSOrdersPage() {
  const session = await requirePermission('pos:access');
  const activePermissions = await getEmployeePermissions(session.employeeId);
  const hasOrdersViewPermission = activePermissions.includes('pos:access') || activePermissions.includes('manage:orders');
  const hasOrdersManagePermission = activePermissions.includes('pos:access') || activePermissions.includes('manage:orders');

  if (!hasOrdersViewPermission) {
    return <div className="p-8 text-center text-red-500 font-bold">لا تملك صلاحية الوصول لطلبات المتجر</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] flex flex-col" dir="rtl">
      <div className="bg-neutral-900 text-white px-4 py-3 flex justify-between items-center text-sm border-b border-neutral-800 shrink-0">
        <div className="flex items-center gap-3 font-bold text-[var(--color-champagne-400)]">
          إدارة طلبات المتجر
        </div>
        <div className="flex items-center gap-3">
          <Link href="/pos/cashier" className="text-zinc-300 hover:text-white underline">العودة لشاشة البيع</Link>
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8 flex justify-center">
        <div className="w-full max-w-4xl h-[85vh]">
          <POSOrdersPanel hasManagePermission={hasOrdersManagePermission} isInline={true} />
        </div>
      </div>
    </div>
  );
}
