import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';

import { getInventorySettings } from '@/actions/settings-crud';
import { AdminProductsClient } from './AdminProductsClient';
import { filsToDisplay } from '@/lib/money';


export default async function AdminProductsPage() {
  const session = await requireAuth();

  let products: any[] = [];
  let categories: any[] = [];
  let lowStockThreshold = 1;
  let loadError = '';
  try {
    const [inventorySettings, productRows, categoryRows] = await Promise.all([
      getInventorySettings(),
      prisma.product.findMany({ orderBy: { createdAt: 'desc' }, include: { category: true, variants: true, images: { where: { isMain: true }, take: 1 } } }),
      prisma.category.findMany(),
    ]);
    lowStockThreshold = inventorySettings.lowStockThreshold;
    products = productRows;
    categories = categoryRows;
  } catch (error) {
    console.error('Unable to load product administration:', error);
    loadError = 'تعذر تحميل بيانات المنتجات مؤقتاً. تم تسجيل الخطأ؛ حدّث الصفحة بعد لحظات.';
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        {loadError && <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">{loadError}</div>}
        <AdminProductsClient 
          products={products} 

          adminId={session.employee.id} 
          categories={categories}
          lowStockThreshold={lowStockThreshold}
        />
      </main>
    </div>
  );
}
