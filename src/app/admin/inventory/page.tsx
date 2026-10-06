import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getInventorySettings } from '@/actions/settings-crud';
import { InventorySettingsForm } from '@/components/InventorySettingsForm';
import { adjustVariantStock } from '@/actions/inventory';

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
      ,supplierOffers: { include: { supplier: { select: { name: true } } }, orderBy: { unitCost: 'asc' } }
    }
  });
  const movements = await prisma.inventoryMovement.findMany({ where: { sku: { in: variants.map(v=>v.sku) } }, orderBy: { createdAt: 'desc' }, include: { employee: { select: { name: true } } } });
  const lastMovement = new Map<string, typeof movements[number]>();
  for (const movement of movements) if (!lastMovement.has(movement.sku)) lastMovement.set(movement.sku,movement);
  const movementHistory = new Map<string, typeof movements>();
  for (const movement of movements) movementHistory.set(movement.sku,[...(movementHistory.get(movement.sku)||[]),movement]);

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
                          <span className="hidden text-xs text-zinc-500 lg:inline">الموردون: {v.supplierOffers.map(o=>`${o.supplier.name} (${o.stock})`).join('، ')||'—'}</span>
                          <span className="hidden text-xs text-zinc-500 xl:inline">آخر حركة: {lastMovement.get(v.sku)?`${lastMovement.get(v.sku)?.type} · ${new Date(lastMovement.get(v.sku)!.createdAt).toLocaleDateString('ar-JO')} · ${lastMovement.get(v.sku)?.employee.name}`:'—'}</span>
                          <span className={`inline-block px-3 py-0.5 rounded font-bold text-xs ${
                            v.stock === 0
                              ? 'bg-red-100 text-red-800'
                              : v.stock <= threshold
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {v.stock} قطع
                          </span>
                          <details className="relative"><summary className="cursor-pointer text-xs underline">حركة مخزون</summary><form action={adjustVariantStock} className="absolute left-0 z-10 mt-2 grid w-64 gap-2 rounded border bg-white p-3 shadow"><input type="hidden" name="variantId" value={v.id}/><select name="type" className="rounded border p-2 text-xs"><option value="RECEIVED">استلام</option><option value="RETURN">إرجاع صالح</option><option value="ADJUSTMENT">تعديل</option><option value="DAMAGED">تالف</option></select><input name="quantityDelta" type="number" required placeholder="الكمية (+/-)" className="rounded border p-2 text-xs"/><input name="reason" required minLength={3} placeholder="السبب" className="rounded border p-2 text-xs"/><button className="rounded bg-zinc-900 p-2 text-xs text-white">حفظ الحركة</button></form></details>
                          <details className="text-xs"><summary className="cursor-pointer underline">السجل ({movementHistory.get(v.sku)?.length||0})</summary><div className="absolute z-10 max-h-48 w-72 overflow-auto rounded border bg-white p-2 shadow">{(movementHistory.get(v.sku)||[]).map(m=><p key={m.id} className="border-b py-1">{m.type} · {m.quantity>0?'+':''}{m.quantity} ({m.quantityBefore}→{m.quantityAfter}) · {m.employee.name} · {new Date(m.createdAt).toLocaleString('ar-JO')}<br/>{m.reference}</p>)}</div></details>
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
