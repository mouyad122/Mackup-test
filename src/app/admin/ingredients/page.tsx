import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { IngredientNewForm } from '@/components/IngredientNewForm';
import { IngredientActionsMenu } from '@/components/IngredientActionsMenu';

export default async function AdminIngredientsPage() {
  const session = await requireAuth();

  const ingredients = await prisma.ingredient.findMany({
    include: {
      _count: { select: { products: true } }
    },
    orderBy: { nameAr: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
              المكونات (Ingredients)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة المكونات للمنتجات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Ingredients List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
            <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-sm font-bold text-zinc-700">
                    <th className="px-6 py-4">الاسم بالعربي</th>
                    <th className="px-6 py-4">الاسم بالإنجليزي</th>
                    <th className="px-6 py-4">الوصف</th>
                    <th className="px-6 py-4 text-center">المنتجات المرتبطة</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {ingredients.map((ingredient) => (
                    <tr key={ingredient.id} className="hover:bg-zinc-50/50 transition-colors text-zinc-650">
                      <td className="px-6 py-4 font-bold text-zinc-900">{ingredient.nameAr}</td>
                      <td className="px-6 py-4 font-bold text-zinc-900">{ingredient.nameEn}</td>
                      <td className="px-6 py-4 text-sm max-w-[200px] truncate" title={ingredient.description || ''}>
                        {ingredient.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-center font-bold text-[#2d3623]">
                        {ingredient._count.products}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <IngredientActionsMenu 
                          ingredient={{ 
                            id: ingredient.id, 
                            nameEn: ingredient.nameEn, 
                            nameAr: ingredient.nameAr,
                            description: ingredient.description
                          }} 
                        />
                      </td>
                    </tr>
                  ))}

                  {ingredients.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        لا توجد مكونات حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Ingredient Form */}
          <IngredientNewForm />
        </div>
      </main>
    </div>
  );
}
