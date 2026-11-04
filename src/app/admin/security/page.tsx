import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';

export default async function AdminPage() {
  // Enforce server-side authorization check
  const session = await requirePermission('manage:settings');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true }
  });

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 font-sans md:flex-row" dir="rtl">
      <AdminSidebar employeeName={user?.name || 'مدير النظام'} roleName={user?.role?.name || 'ADMIN'} />

      {/* Main Content Area */}
      <main className="min-w-0 max-w-full flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-6 md:p-8">
          <h1 className="text-xl md:text-2xl font-bold text-[#3F4832] mb-4 border-b border-zinc-100 pb-4">
            لوحة التحكم / الأمان وتسجيل الدخول (Security)
          </h1>
          <p className="text-zinc-500 mb-6 text-sm md:text-base">
            تم تسجيل الدخول كـ: <strong className="text-zinc-700">{user?.name}</strong> ({user?.role?.name})
          </p>
          <div className="bg-zinc-50 rounded-lg p-6 border border-dashed border-zinc-200 text-sm text-zinc-600">
            وحدة إدارة الأمان وتتبع الجلسات مفعّلة ومتصلة بقيود التحقق من صلاحيات الخادم بنجاح.
          </div>
        </div>
      </main>
    </div>
  );
}
