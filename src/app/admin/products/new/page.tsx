import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { ProductCatalogForm } from '@/components/ProductCatalogForm';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';
import { ensureProductTemplatesInstalled } from '@/lib/product-templates';

export default async function AdminProductsNewPage() {
  const session = await requirePermission('manage:products');
  const user = await prisma.employee.findUnique({
    where: { id: session.employeeId },
    include: { role: true },
  });

  // Ensure default templates exist automatically in DB
  await ensureProductTemplatesInstalled();

  const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  const templates = await prisma.productTemplate.findMany({
    where: { isActive: true },
    include: {
      fields: {
        include: { attributeDefinition: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { nameAr: 'asc' },
  });

  const supplierRows = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
  const suppliers = await Promise.all(
    supplierRows.map(async supplier => ({
      ...supplier,
      profitMargin: await getSupplierProfitMargin(prisma, supplier.id),
    }))
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={user?.name || ''} roleName={user?.role?.name || 'ADMIN'} />

      <main className="flex-1 overflow-y-auto p-8 font-sans w-full max-w-full">
        <div className="mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/admin/products" className="text-sm text-zinc-500 hover:underline">
              المنتجات
            </Link>
            <span className="text-zinc-300">/</span>
            <span className="text-sm font-bold text-zinc-700">إضافة منتج جديد</span>
          </div>
          <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
            إضافة منتج جديد
          </h1>
        </div>

        <ProductCatalogForm
          categories={categories.map(c => ({ id: c.id, name: c.name, slug: c.slug }))}
          suppliers={suppliers}
          templates={templates}
        />
      </main>
    </div>
  );
}
