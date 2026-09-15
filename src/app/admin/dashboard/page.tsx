import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { filsToDisplay } from '@/lib/money';
import Link from 'next/link';
import { getInventorySettings } from '@/actions/settings-crud';

const AdminDashboardPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) => {
  const session = await requireAuth();

  const resolvedParams = await searchParams;
  const filter = resolvedParams.filter || 'all';
  let dateFilter = {};
  const now = new Date();
  if (filter === 'today') {
    dateFilter = { createdAt: { gte: new Date(now.setHours(0,0,0,0)) } };
  } else if (filter === 'week') {
    dateFilter = { createdAt: { gte: new Date(now.setDate(now.getDate() - 7)) } };
  } else if (filter === 'month') {
    dateFilter = { createdAt: { gte: new Date(now.setMonth(now.getMonth() - 1)) } };
  }

  // Query actual metrics from DB
  const [totalOrders, totalProducts, totalSales, productsList] = await Promise.all([
    prisma.order.count({ where: dateFilter }),
    prisma.product.count(),
    prisma.sale.findMany({ where: dateFilter, select: { total: true } }),
    prisma.product.findMany()
  ]);

  const totalSalesRevenue = totalSales.reduce((acc, s) => acc + s.total, 0);

  const inventorySettings = await getInventorySettings();
  const threshold = inventorySettings.lowStockThreshold;

  // Count low stock finished products (less than or equal to threshold)
  const lowStockVariants = await prisma.productVariant.findMany({
    where: { stock: { lte: threshold } },
    include: { product: true }
  });

  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      {/* Sidebar on the right */}
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      {/* Main Content Area on the left */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
              لوحة التحكم الرئيسية
            </h1>
            <p className="text-zinc-650 mt-1">
              مرحباً بك مجدداً، {session.employee.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
            <Link href="/admin/dashboard?filter=today" className={`px-4 py-2 rounded text-sm ${filter === 'today' ? 'bg-[var(--color-charcoal-900)] text-white' : 'bg-white border text-zinc-600'}`}>اليوم</Link>
            <Link href="/admin/dashboard?filter=week" className={`px-4 py-2 rounded text-sm ${filter === 'week' ? 'bg-[var(--color-charcoal-900)] text-white' : 'bg-white border text-zinc-600'}`}>هذا الأسبوع</Link>
            <Link href="/admin/dashboard?filter=month" className={`px-4 py-2 rounded text-sm ${filter === 'month' ? 'bg-[var(--color-charcoal-900)] text-white' : 'bg-white border text-zinc-600'}`}>هذا الشهر</Link>
            <Link href="/admin/dashboard?filter=all" className={`px-4 py-2 rounded text-sm ${filter === 'all' ? 'bg-[var(--color-charcoal-900)] text-white' : 'bg-white border text-zinc-600'}`}>الكل</Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h3 className="text-sm font-bold text-zinc-500 mb-2">إجمالي الطلبات</h3>
            <p className="text-3xl font-bold text-[var(--color-charcoal-900)]">{totalOrders}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h3 className="text-sm font-bold text-zinc-500 mb-2">إجمالي المنتجات</h3>
            <p className="text-3xl font-bold text-[var(--color-charcoal-900)]">{totalProducts}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h3 className="text-sm font-bold text-zinc-500 mb-2">إجمالي المبيعات (POS)</h3>
            <p className="text-3xl font-bold text-emerald-600">
              {filsToDisplay(totalSalesRevenue, 'ar')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h3 className="text-sm font-bold text-zinc-500 mb-2">عدد عمليات الكاشير</h3>
            <p className="text-3xl font-bold text-[var(--color-charcoal-900)]">{totalSales.length}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[var(--color-ivory-200)] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-charcoal-900)] mb-1">المنتجات منخفضة المخزون</p>
                <p className="text-2xl font-bold font-heading text-[var(--color-champagne-600)]">{lowStockVariants.length}</p>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h2 className="text-xl font-bold text-[var(--color-charcoal-900)] mb-4">أحدث طلبات المتجر</h2>
            <div className="divide-y divide-zinc-100">
              {recentOrders.map((order) => (
                <div key={order.id} className="py-3 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-zinc-900 font-mono text-sm">{order.reference}</span>
                    <p className="text-xs text-zinc-500">{order.customerName}</p>
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-bold text-[var(--color-champagne-600)]">
                      {filsToDisplay(order.totalAmount, 'ar')}
                    </span>
                    <span className={`block text-[10px] px-2 py-0.5 rounded font-bold mt-1 ${order.status === 'CONFIRMED' ? 'bg-green-150 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}

              {recentOrders.length === 0 && (
                <p className="text-zinc-500 py-6 text-center">لا توجد طلبات معلقة حالياً.</p>
              )}
            </div>
          </div>

          {/* Quick Actions / Alerts */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)]">
            <h2 className="text-xl font-bold text-[var(--color-charcoal-900)] mb-4">المنتجات الناقصة</h2>
            <div className="space-y-4">
              {lowStockVariants.map((v) => (
                <div key={v.id} className="p-3 bg-amber-50 text-amber-800 border border-amber-100 rounded flex justify-between items-center text-sm">
                  <span className="font-bold">{v.product.nameAr} - {v.name}</span>
                  <span>المخزون الحالي: {v.stock} قطع</span>
                </div>
              ))}

              {lowStockVariants.length === 0 && (
                <p className="text-zinc-500 py-6 text-center">جميع مستويات المنتجات ضمن الحدود الآمنة.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
