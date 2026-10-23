import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { CategoryTreeExplorer } from '@/components/CategoryTreeExplorer';
import { getCategoryTree } from '@/actions/categories';
import { ensureDefaultTaxonomyInstalled } from '@/lib/taxonomy-defaults';
import { ensureProductTemplatesInstalled } from '@/lib/product-templates';

export default async function AdminCategoriesPage() {
  const session = await requirePermission('manage:products');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true },
  });

  // Ensure default templates & taxonomy exist automatically in DB
  await ensureProductTemplatesInstalled();
  await ensureDefaultTaxonomyInstalled();

  const tree = await getCategoryTree();

  const flatCategories = await prisma.category.findMany({
    select: { id: true, name: true, parentId: true, slug: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const templates = await prisma.productTemplate.findMany({
    where: { isActive: true },
    select: { id: true, code: true, nameAr: true },
    orderBy: { nameAr: 'asc' },
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={user?.name || ''} roleName={user?.role?.name || 'ADMIN'} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">
                المنتجات
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="text-sm font-bold text-zinc-700">شجرة الأقسام والأنواع</span>
            </div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
              إدارة شجرة الأقسام والأنواع (3 مستويات)
            </h1>
            <p className="text-zinc-500 text-xs mt-1">
              هيكل الأقسام الهرمي لمتجر رَواق (رئيسي ← فرعي ← نوع متخصص) المرتبط تلقائياً بقوالب وحقول المنتجات.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/products/new"
              className="px-5 py-2.5 rounded-xl bg-[#3F4832] text-white text-xs font-bold shadow-sm hover:bg-[#2d3623] transition-colors"
            >
              + إضافة منتج جديد
            </Link>
          </div>
        </div>

        {/* Tree Explorer */}
        <CategoryTreeExplorer
          tree={tree}
          flatCategories={flatCategories}
          templates={templates}
        />
      </main>
    </div>
  );
}
