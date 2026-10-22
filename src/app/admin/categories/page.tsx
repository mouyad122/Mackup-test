import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { CategoryNewForm } from '@/components/CategoryNewForm';
import { CategoryActionsMenu } from '@/components/CategoryActionsMenu';

export default async function AdminCategoriesPage() {
  const session = await requireAuth();

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      products: {
        select: { id: true, nameAr: true, nameEn: true }
      }
    }
  });

  const allProducts = await prisma.product.findMany({
    select: { id: true, nameAr: true, nameEn: true, category: { select: { name: true } }, categoryId: true },
    orderBy: { nameAr: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
              المجموعات (Collections)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة المجموعات الأساسية لتقسيم المكياج</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Categories List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
            <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4"><table className="w-full text-right border-collapse min-w-[600px]">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr className="text-sm font-bold text-zinc-700">
                  <th className="px-6 py-4">اسم المجموعة</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4 text-center">عدد المنتجات</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                    <td className="px-6 py-4 font-bold text-zinc-900">{cat.name}</td>
                    <td className="px-6 py-4 font-mono text-sm">{cat.slug}</td>
                    <td className="px-6 py-4 text-center font-bold text-[#2d3623]">
                      {cat._count.products}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <CategoryActionsMenu 
                        category={{ 
                          id: cat.id, 
                          name: cat.name, 
                          products: cat.products
                        }} 
                        allCategories={categories.map(c => ({ id: c.id, name: c.name }))}
                        allProducts={allProducts}
                      />
                    </td>
                  </tr>
                ))}

                {categories.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                      لا توجد مجموعات حالياً.
                    </td>
                  </tr>
                )}
              </tbody>
            </table></div>
          </div>

          {/* Add Category Form */}
          <CategoryNewForm products={allProducts} />
        </div>
      </main>
    </div>
  );
}
