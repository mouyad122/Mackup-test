import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getInventorySettings } from '@/actions/settings-crud';
import { InventorySettingsForm } from '@/components/InventorySettingsForm';

export default async function AdminInventoryPage() {
  const session = await requireAuth();

  const variants = await prisma.productVariant.findMany({
    orderBy: { sku: 'asc' },
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      productId: true,
      product: { select: { nameAr: true, id: true } }
    }
  });

  const settings = await getInventorySettings();
  const threshold = settings.lowStockThreshold;
  const shortages = variants.filter(v => v.stock <= threshold);

  // Group variants by product
  const grouped = variants.reduce<Record<string, typeof variants>>((acc, v) => {
    const key = v.product?.nameAr ?? 'بدون منتج';
    if (!acc[key]) acc[key] = [];
    acc[key].push(v);
    return acc;
  }, {});
  const productNames = Object.keys(grouped);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || 'ADMIN'} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)]">
              مخزون المنتجات
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">تتبع كميات القطع المتبقية لكل منتج مفصّلة حسب الأصناف</p>
          </div>
        </div>

        <InventorySettingsForm initialThreshold={threshold} employeeId={session.employee.id} />

        {/* Shortages Alert */}
        {shortages.length > 0 && (
          <div className="mb-8 bg-red-50 rounded-lg shadow-sm border border-red-200 overflow-hidden">
            <div className="p-4 bg-red-100 border-b border-red-200 flex justify-between items-center">
              <h2 className="text-base font-bold text-red-900">🚨 تنبيه النواقص (أقل من أو يساوي {threshold} قطع)</h2>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">{shortages.length} درجة</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[500px]">
                <thead className="bg-red-50/50 border-b border-red-200">
                  <tr className="text-xs font-bold text-red-800">
                    <th className="px-6 py-3">المنتج - الدرجة</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3">الكمية المتبقية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100 text-sm">
                  {shortages.map(v => (
                    <tr key={v.id} className="hover:bg-red-100/50 transition-colors">
                      <td className="px-6 py-2.5 font-bold text-red-900">{v.product?.nameAr} — {v.name}</td>
                      <td className="px-6 py-2.5 text-red-700 font-mono text-xs">{v.sku}</td>
                      <td className="px-6 py-2.5">
                        <span className="font-bold text-red-700">{v.stock} قطع</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grouped Inventory */}
        <div className="mb-10 bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-hidden">
          <div className="p-4 bg-[var(--color-champagne-50)] border-b border-[var(--color-ivory-200)] flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--color-charcoal-900)]">مخزون المنتجات الحالي (مفصّل بالأصناف)</h2>
            <span className="text-sm text-zinc-500">{productNames.length} منتج • {variants.length} صنف</span>
          </div>

          {productNames.length === 0 ? (
            <div className="px-6 py-12 text-center text-zinc-500">لا توجد منتجات مضافة بعد.</div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {productNames.map((productName) => {
                const productVariants = grouped[productName];
                const totalStock = productVariants.reduce((sum, v) => sum + v.stock, 0);
                const allOut = productVariants.every(v => v.stock === 0);
                const someShort = !allOut && productVariants.some(v => v.stock <= threshold);

                return (
                  <div key={productName}>
                    {/* Product Header */}
                    <div className={`flex items-center justify-between px-6 py-3 ${allOut ? 'bg-red-50' : someShort ? 'bg-amber-50' : 'bg-zinc-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[var(--color-charcoal-900)] text-sm">{productName}</span>
                        {allOut && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 text-red-800">نفاذ كلي</span>
                        )}
                        {someShort && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-800">يقترب النفاذ</span>
                        )}
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded ${allOut ? 'bg-red-100 text-red-800' : someShort ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                        الإجمالي: {totalStock} قطعة
                      </span>
                    </div>

                    {/* Variant rows */}
                    <div className="divide-y divide-zinc-50">
                      {productVariants.map((v) => (
                        <div key={v.id} className="flex items-center px-6 py-2 hover:bg-zinc-50 transition-colors text-sm gap-4">
                          <span className="text-zinc-300 text-base leading-none select-none w-4">└</span>
                          <span className="text-zinc-700 font-medium w-28 shrink-0">{v.name}</span>
                          <span className="text-zinc-400 font-mono text-xs flex-1">{v.sku}</span>
                          <span className={`inline-block px-3 py-0.5 rounded font-bold text-xs ${
                            v.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : v.stock <= threshold
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {v.stock} قطع
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
