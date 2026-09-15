import React from 'react';
import { requireAuth, getEmployeePermissions } from '@/lib/dal';
import Link from 'next/link';
import { logout } from '@/actions/auth';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const permissions = await getEmployeePermissions(session.employeeId);

  // Determine which links are visible based on admin checkbox permissions
  const showCounter = permissions.includes('pos:access');
  const showReport = permissions.includes('pos:access') || permissions.includes('manage:settings');
  const showOrders = permissions.includes('pos:access') || permissions.includes('manage:orders');
  const showAdmin = permissions.includes('manage:products') || permissions.includes('manage:orders') || permissions.includes('manage:settings');

  return (
    <div className="h-screen bg-[var(--color-ivory-100)] flex flex-col font-sans overflow-hidden" dir="rtl">
      {/* Mobile-First Header */}
      <header className="bg-[var(--color-charcoal-900)] text-white px-4 py-3 flex justify-between items-center shadow-md border-b border-[var(--color-champagne-600)] shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="font-heading font-bold text-lg text-[var(--color-champagne-400)]">
            ميكاب ديمو POS
          </span>
          <span className="text-[10px] text-zinc-300 bg-zinc-800/40 px-2 py-0.5 rounded">الفرع الرئيسي</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="truncate max-w-[100px] text-zinc-200">
            {session.employee.name}
          </span>
          <form action={logout}>
            <button type="submit" className="bg-red-950/60 hover:bg-red-900 text-red-300 hover:text-white px-3 py-1.5 rounded-md font-bold text-xs transition-colors">
              خروج
            </button>
          </form>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pb-16">
        {children}
      </div>

      {/* Dynamic Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--color-ivory-200)] shadow-lg flex justify-around items-center h-16 px-2 z-20 shrink-0">
        {showCounter && (
          <Link
            href="/pos/cashier"
            className="flex flex-col items-center justify-center text-zinc-650 hover:text-[var(--color-charcoal-900)] transition-colors w-full py-1 text-center"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-bold">كاشير الدفع</span>
          </Link>
        )}

        {showOrders && (
          <Link
            href="/pos/orders"
            className="flex flex-col items-center justify-center text-zinc-650 hover:text-[var(--color-charcoal-900)] transition-colors w-full py-1 text-center"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span className="text-[10px] font-bold">طلبات المتجر</span>
          </Link>
        )}

        {showReport && (
          <Link
            href="/pos/report"
            className="flex flex-col items-center justify-center text-zinc-650 hover:text-[var(--color-charcoal-900)] transition-colors w-full py-1 text-center"
          >
            <svg className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-[10px] font-bold">التقرير اليومي</span>
          </Link>
        )}

      </nav>
    </div>
  );
}
