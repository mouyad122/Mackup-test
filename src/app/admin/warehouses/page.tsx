import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { WarehouseActionsMenu } from './WarehouseActionsMenu';
import Link from 'next/link';
import { Plus, MapPin, Hash, Box } from 'lucide-react';

export default async function AdminWarehousesPage() {
  const session = await requireAuth();

  const warehouses = await prisma.warehouse.findMany({
    include: {
      _count: { select: { inventories: true, movements: true } }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
              المستودعات (Warehouses)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة المستودعات ومواقع التخزين</p>
          </div>
          <Link 
            href="/admin/warehouses/new" 
            className="flex items-center gap-2 bg-[var(--color-gold-500)] hover:bg-[var(--color-gold-600)] text-white px-4 py-2 rounded-md font-bold transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>إضافة مستودع جديد</span>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right border-collapse min-w-[800px]">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-sm font-bold text-zinc-700">
                  <th className="px-6 py-4">اسم المستودع</th>
                  <th className="px-6 py-4">الكود</th>
                  <th className="px-6 py-4">الموقع</th>
                  <th className="px-6 py-4 text-center">الحالة</th>
                  <th className="px-6 py-4 text-center">عناصر المخزون</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {warehouses.map((warehouse) => (
                  <tr key={warehouse.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                    <td className="px-6 py-4 font-bold text-zinc-900 flex items-center gap-2">
                      <Box className="w-4 h-4 text-zinc-400" />
                      {warehouse.name}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-zinc-600">
                      <div className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-zinc-400" />
                        {warehouse.code}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {warehouse.location ? (
                        <div className="flex items-center gap-1 text-zinc-600">
                          <MapPin className="w-4 h-4 text-zinc-400" />
                          {warehouse.location}
                        </div>
                      ) : (
                        <span className="text-zinc-400 text-sm">غير محدد</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${warehouse.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-800'}`}>
                        {warehouse.isActive ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-[#2d3623]">
                      {warehouse._count.inventories}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <WarehouseActionsMenu warehouse={warehouse} />
                    </td>
                  </tr>
                ))}

                {warehouses.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                      لا توجد مستودعات حالياً. أضف مستودعاً جديداً للبدء.
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
