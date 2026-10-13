import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';

export default async function AdminCustomersPage() {
  const session = await requirePermission('manage:settings');

  const customers = await prisma.customer.findMany({
    include: {
      _count: {
        select: { orders: true, sales: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">
              العملاء (CRM)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة بيانات العملاء، الحسابات، وتتبع نقاط الولاء والطلبات</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-hidden">
          <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full">
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-sm font-bold text-zinc-700">
                  <th className="px-6 py-4">الاسم</th>
                  <th className="px-6 py-4">رقم الهاتف</th>
                  <th className="px-6 py-4">البريد الإلكتروني</th>
                  <th className="px-6 py-4">الحالة</th>
                  <th className="px-6 py-4 text-center">الطلبات / المبيعات</th>
                  <th className="px-6 py-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                    <td className="px-6 py-4 font-bold text-zinc-900">
                      {c.firstName} {c.lastName || ''}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm" dir="ltr">{c.phone}</td>
                    <td className="px-6 py-4">{c.email || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {c.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-bold text-[#2d3623]">{c._count.orders}</span> / <span className="text-zinc-500">{c._count.sales}</span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <Link href={`/admin/customers/${c.id}`} className="inline-flex items-center justify-center px-4 py-2 bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors text-sm font-bold">
                        الملف الشخصي
                      </Link>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      لا يوجد عملاء مسجلين حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
