import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ShadeNewForm } from '@/components/ShadeNewForm';
import { ShadeActionsMenu } from '@/components/ShadeActionsMenu';

export default async function AdminShadesPage() {
  const session = await requireAuth();

  const shades = await prisma.shade.findMany({
    include: {
      _count: { select: { variants: true } }
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">
              درجات الألوان (Shades)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة درجات الألوان للمنتجات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shades List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
            <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-sm font-bold text-zinc-700">
                    <th className="px-6 py-4">اللون</th>
                    <th className="px-6 py-4">الاسم</th>
                    <th className="px-6 py-4">الكود</th>
                    <th className="px-6 py-4 text-center">المنتجات المرتبطة</th>
                    <th className="px-6 py-4">الحالة</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {shades.map((shade) => (
                    <tr key={shade.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                      <td className="px-6 py-4">
                        <div 
                          className="w-8 h-8 rounded-full border border-zinc-200 shadow-sm"
                          style={{ backgroundColor: shade.hexCode || 'transparent' }}
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{shade.name}</td>
                      <td className="px-6 py-4 font-mono text-sm uppercase">{shade.hexCode || '-'}</td>
                      <td className="px-6 py-4 text-center font-bold text-[#2d3623]">
                        {shade._count.variants}
                      </td>
                      <td className="px-6 py-4">
                        {shade.isActive ? (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">نشط</span>
                        ) : (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-bold">غير نشط</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <ShadeActionsMenu 
                          shade={{ 
                            id: shade.id, 
                            name: shade.name, 
                            hexCode: shade.hexCode,
                            isActive: shade.isActive
                          }} 
                        />
                      </td>
                    </tr>
                  ))}

                  {shades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        لا توجد درجات ألوان حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Shade Form */}
          <ShadeNewForm />
        </div>
      </main>
    </div>
  );
}
