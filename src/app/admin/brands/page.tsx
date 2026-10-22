import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { BrandNewForm } from '@/components/BrandNewForm';
import { BrandActionsMenu } from '@/components/BrandActionsMenu';

export default async function AdminBrandsPage() {
  const session = await requireAuth();

  const brands = await prisma.brand.findMany({
    include: {
      _count: { select: { products: true } },
      products: {
        select: { id: true, nameAr: true, nameEn: true }
      }
    },
    orderBy: { nameAr: 'asc' }
  });

  const allProducts = await prisma.product.findMany({
    select: { id: true, nameAr: true, nameEn: true, brandId: true, brand: { select: { nameAr: true } } },
    orderBy: { nameAr: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4832]">
              الماركات (Brands)
            </h1>
            <p className="text-zinc-650 mt-1">إدارة الماركات التجارية للمنتجات</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Brands List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-x-auto">
            <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4">
              <table className="w-full text-right border-collapse min-w-[600px]">
                <thead className="bg-zinc-50 border-b border-zinc-200">
                  <tr className="text-sm font-bold text-zinc-700">
                    <th className="px-6 py-4">الشعار</th>
                    <th className="px-6 py-4">اسم الماركة</th>
                    <th className="px-6 py-4">Slug</th>
                    <th className="px-6 py-4 text-center">عدد المنتجات</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {brands.map((brand) => (
                    <tr key={brand.id} className={`hover:bg-zinc-50/50 transition-colors text-zinc-650 ${!brand.isVisible ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        {brand.logoUrl ? (
                          <img src={brand.logoUrl.startsWith('local://') ? brand.logoUrl.replace('local://', '/') : brand.logoUrl} alt={brand.nameAr} className="w-12 h-12 rounded object-contain border bg-white" />
                        ) : (
                          <span className="text-xs text-zinc-500 font-bold bg-zinc-100 px-2 py-1 rounded">بدون شعار</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900">{brand.nameAr}</div>
                        <div className="text-xs text-zinc-500">{brand.nameEn}</div>
                        {!brand.isVisible && <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded ml-2">مخفية</span>}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm">{brand.slug}</td>
                      <td className="px-6 py-4 text-center font-bold text-[#2d3623]">
                        {brand._count.products}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <BrandActionsMenu 
                          brand={{ 
                            id: brand.id, 
                            nameAr: brand.nameAr, 
                            nameEn: brand.nameEn,
                            description: brand.description,
                            logoUrl: brand.logoUrl,
                            isVisible: brand.isVisible,
                            products: brand.products
                          }} 
                          allBrands={brands.map(b => ({ id: b.id, nameAr: b.nameAr }))} 
                          allProducts={allProducts}
                        />
                      </td>
                    </tr>
                  ))}

                  {brands.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                        لا توجد ماركات حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Brand Form */}
          <BrandNewForm products={allProducts} />
        </div>
      </main>
    </div>
  );
}
