import React from 'react';
import { requireAuth } from '@/lib/dal';
import { filsToDisplay } from '@/lib/money';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { SalesFilters } from '@/components/SalesFilters';
import Link from 'next/link';

export default async function AdminSalesPage({
  searchParams
}: {
  searchParams: Promise<{ employeeId?: string; source?: string; payMethod?: string; startDate?: string; endDate?: string }>;
}) {
  const session = await requireAuth();

  const resolvedParams = await searchParams;
  const filterEmployee = resolvedParams.employeeId;
  const filterSource = resolvedParams.source;
  const filterPayMethod = resolvedParams.payMethod;
  const filterStartDate = resolvedParams.startDate;
  const filterEndDate = resolvedParams.endDate;

  const whereClause: any = {};
  if (filterEmployee) whereClause.employeeId = filterEmployee;
  if (filterSource) whereClause.source = filterSource;
  if (filterPayMethod) {
    whereClause.payments = {
      some: { method: filterPayMethod }
    };
  }
  if (filterStartDate || filterEndDate) {
    whereClause.createdAt = {};
    if (filterStartDate) {
      whereClause.createdAt.gte = new Date(`${filterStartDate}T00:00:00Z`);
    }
    if (filterEndDate) {
      whereClause.createdAt.lte = new Date(`${filterEndDate}T23:59:59Z`);
    }
  }

  const sales = await prisma.sale.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      employee: true,
      items: true,
      payments: true
    }
  });

  const employees = await prisma.employee.findMany();

  const totalSalesCount = sales.length;
  const totalSalesSum = sales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
              عمليات البيع والفواتير (POS)
            </h1>
            <p className="text-zinc-650 mt-1">سجل المبيعات المسجلة عبر الكاونتر وجلسات الكاشير</p>
          </div>
        </div>

        {/* Filters */}
        <SalesFilters 
          filterEmployee={filterEmployee || ''} 
          filterSource={filterSource || ''} 
          filterPayMethod={filterPayMethod || ''} 
          filterStartDate={filterStartDate || ''}
          filterEndDate={filterEndDate || ''}
          employees={employees} 
        />

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] p-6 flex items-center justify-between">
            <div>
              <p className="text-zinc-500 text-sm font-bold mb-1">عدد العمليات المطابقة</p>
              <p className="text-3xl font-bold text-zinc-900">{totalSalesCount}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xl">
              #
            </div>
          </div>
          <div className="bg-[var(--color-champagne-50)] rounded-lg shadow-sm border border-[var(--color-champagne-200)] p-6 flex items-center justify-between">
            <div>
              <p className="text-[var(--color-charcoal-900)] text-sm font-bold mb-1">إجمالي المبيعات للعمليات المطابقة</p>
              <p className="text-3xl font-extrabold text-[var(--color-champagne-600)]">{filsToDisplay(totalSalesSum, 'ar')}</p>
            </div>
            <div className="w-12 h-12 bg-[var(--color-charcoal-900)] text-white rounded-full flex items-center justify-center font-bold text-xl">
              د.أ
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4"><table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-sm font-bold text-zinc-700">
                <th className="px-6 py-4">رقم العملية</th>
                <th className="px-6 py-4">الكاشير</th>
                <th className="px-6 py-4">المصدر</th>
                <th className="px-6 py-4">اسم العميل</th>
                <th className="px-6 py-4 min-w-[250px]">المنتجات</th>
                <th className="px-6 py-4">المجموع الإجمالي</th>
                <th className="px-6 py-4">طريقة الدفع</th>
                <th className="px-6 py-4">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sales.map((sale) => {
                const payMethod = sale.payments[0]?.method || '-';
                return (
                  <tr key={sale.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                    <td className="px-6 py-4 font-bold font-mono text-zinc-900">{sale.reference}</td>
                    <td className="px-6 py-4">{sale.employee?.name || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sale.source === 'STOREFRONT' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        {sale.source === 'STOREFRONT' ? 'طلب توصيل' : 'نقاط بيع (POS)'}
                      </span>
                    </td>
                    <td className="px-6 py-4">{sale.customerName || '-'}</td>
                    <td className="px-6 py-4 text-xs text-zinc-600">
                      <ul className="list-disc list-inside">
                        {sale.items.map(item => (
                          <li key={item.id}>{item.name} ({item.size}) <span className="font-bold text-zinc-800">x{item.quantity}</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-600">
                      {filsToDisplay(sale.total, 'ar')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-150 px-2.5 py-0.5 rounded text-xs font-bold text-zinc-700">
                        {payMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(sale.createdAt).toLocaleString('ar-JO')}
                    </td>
                  </tr>
                );
              })}

              {sales.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-zinc-500">
                    لا توجد مبيعات مسجلة تطابق الفلاتر.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        </div>
      </main>
    </div>
  );
}
