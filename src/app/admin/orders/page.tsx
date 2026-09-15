import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { filsToDisplay } from '@/lib/money';
import Link from 'next/link';

export default async function AdminOrdersPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAuth();
  const params = await searchParams;
  const currentTab = params.tab || 'PENDING';

  // Group status mappings
  const tabStatusMap: Record<string, string[]> = {
    'PENDING': ['AWAITING_WHATSAPP', 'CONFIRMED', 'PENDING'],
    'PREPARING': ['PREPARING'],
    'PREPARED': ['PREPARED', 'SHIPPED'],
    'COMPLETED': ['DELIVERED'],
    'CANCELLED': ['CANCELLED']
  };

  const statusesToFetch = tabStatusMap[currentTab] || tabStatusMap['PENDING'];

  const orders = await prisma.order.findMany({
    where: {
      status: { in: statusesToFetch }
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: true
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AWAITING_WHATSAPP':
      case 'PENDING':
        return <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-bold">بانتظار التأكيد</span>;
      case 'CONFIRMED':
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">تم التأكيد</span>;
      case 'PREPARING':
        return <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">قيد التجهيز</span>;
      case 'PREPARED':
        return <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-bold">تم التجهيز</span>;
      case 'SHIPPED':
        return <span className="bg-teal-100 text-teal-800 px-2 py-1 rounded text-xs font-bold">قيد التوصيل</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded text-xs font-bold">مكتمل / تم التوصيل</span>;
      case 'CANCELLED':
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">ملغي</span>;
      default:
        return <span className="bg-zinc-100 text-zinc-800 px-2 py-1 rounded text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
              طلبات المتجر الإلكتروني
            </h1>
            <p className="text-zinc-650 mt-1">إدارة وتنظيم طلبات التوصيل وتتبع حالاتها</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-200 overflow-x-auto pb-1">
          <Link href="/admin/orders?tab=PENDING" className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${currentTab === 'PENDING' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            الطلبات الجديدة
          </Link>
          <Link href="/admin/orders?tab=PREPARING" className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${currentTab === 'PREPARING' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            قيد التجهيز
          </Link>
          <Link href="/admin/orders?tab=PREPARED" className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${currentTab === 'PREPARED' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            تم التجهيز / جاهز للتوصيل
          </Link>
          <Link href="/admin/orders?tab=COMPLETED" className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${currentTab === 'COMPLETED' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            الطلبات المكتملة
          </Link>
          <Link href="/admin/orders?tab=CANCELLED" className={`px-4 py-2 font-bold text-sm whitespace-nowrap border-b-2 transition-colors ${currentTab === 'CANCELLED' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>
            الطلبات الملغية
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
          <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4"><table className="w-full text-right border-collapse min-w-[800px]">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-sm font-bold text-zinc-700">
                <th className="px-6 py-4">رقم الطلب</th>
                <th className="px-6 py-4">اسم العميل</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">الإجمالي (شامل التوصيل)</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                  <td className="px-6 py-4 font-bold font-mono text-zinc-900">{order.reference}</td>
                  <td className="px-6 py-4">{order.customerName}</td>
                  <td className="px-6 py-4">{getStatusBadge(order.status)}</td>
                  <td className="px-6 py-4 font-bold text-emerald-600">
                    {filsToDisplay(order.totalAmount, 'ar')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {new Date(order.createdAt).toLocaleString('ar-JO')}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-[var(--color-champagne-600)] hover:text-[var(--color-champagne-700)] font-bold text-sm underline"
                    >
                      التفاصيل وإدارة الحالة
                    </Link>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    لا توجد طلبات في هذا القسم حالياً.
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
