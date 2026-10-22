import React from 'react';
import { requireAuth } from '@/lib/dal';
import { AdminSidebar } from '@/components/AdminSidebar';
import { WarehouseForm } from '../WarehouseForm';

export default async function NewWarehousePage() {
  const session = await requireAuth();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
            إضافة مستودع جديد
          </h1>
          <p className="text-zinc-650 mt-1">إنشاء مستودع جديد لإدارة المخزون</p>
        </div>

        <WarehouseForm />
      </main>
    </div>
  );
}
