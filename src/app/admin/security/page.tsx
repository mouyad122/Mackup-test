import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';

export default async function AdminPage() {
  // Enforce server-side authorization check
  const session = await requirePermission('manage:settings');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true }
  });

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[var(--color-charcoal-950)] text-white p-6 flex flex-col gap-6">
        <div className="font-heading text-xl font-bold border-b border-[var(--color-charcoal-800)] pb-4 text-[var(--color-champagne-300)]">
          makeup Admin
        </div>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/products" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Products</Link>
          <Link href="/admin/orders" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Orders</Link>
          <Link href="/admin/sales" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Sales & POS Reports</Link>
          <Link href="/admin/inventory" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Inventory</Link>
          <Link href="/admin/raw-materials" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Raw Materials</Link>
          <Link href="/admin/formulas" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Formulas</Link>
          <Link href="/admin/employees" className="hover:text-[var(--color-champagne-200)] py-2 transition-colors">Employees & Roles</Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <div className="bg-white rounded-xl shadow-sm border border-zinc-100 p-8">
          <h1 className="text-2xl font-bold text-[var(--color-charcoal-900)] mb-4 border-b border-zinc-100 pb-4">
            Dashboard / SECURITY
          </h1>
          <p className="text-zinc-500 mb-6">
            Logged in as: <strong className="text-zinc-700">{user?.name}</strong> ({user?.role?.name})
          </p>
          <div className="bg-zinc-50 rounded-lg p-6 border border-dashed border-zinc-200 text-sm text-zinc-600">
            Feature module for admin: security is fully wired to server authorization constraints.
          </div>
        </div>
      </main>
    </div>
  );
}
