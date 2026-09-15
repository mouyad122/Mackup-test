import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getGlobalSizePrices } from '@/actions/settings';
import { getInventorySettings } from '@/actions/settings-crud';
import { AdminProductsClient } from './AdminProductsClient';
import { filsToDisplay } from '@/lib/money';


export default async function AdminProductsPage() {
  const session = await requireAuth();
  const globalPrices = await getGlobalSizePrices();
  const inventorySettings = await getInventorySettings();
  const lowStockThreshold = inventorySettings.lowStockThreshold;

  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      variants: true,
      images: { where: { isMain: true }, take: 1 }
    }
  });

  const categories = await prisma.category.findMany();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <AdminProductsClient 
          products={products} 
          globalPrices={globalPrices} 
          adminId={session.employee.id} 
          categories={categories}
          lowStockThreshold={lowStockThreshold}
        />
      </main>
    </div>
  );
}
