import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';
import { createSupplier, updateSupplier, setSupplierOfferActive } from '@/actions/suppliers';
import { DeleteSupplierButton } from './DeleteSupplierButton';
import { getSupplierProfitMargin } from '@/lib/supplier-margin';

export default async function SuppliersPage() {
  const session = await requirePermission('manage:settings');
  const [suppliers, orders, supplierTransactions] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { offers: { include: { variant: { include: { product: true } }, inventoryMovements: { orderBy: { createdAt: 'desc' }, take: 5 } }, orderBy: { updatedAt: 'desc' } } },
    }),
    prisma.order.findMany({
      where: { status: { in: ['CONFIRMED', 'PREPARING', 'PREPARED', 'ASSIGNED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED'] }, items: { some: { supplierIdSnapshot: { not: null } } } },
      orderBy: { createdAt: 'desc' },
      include: { items: { where: { supplierIdSnapshot: { not: null } }, select: { supplierIdSnapshot: true, unitCostSnapshot: true, supplierAmountSnapshot: true, quantity: true, total: true } } },
    }),
    prisma.financialTransaction.findMany({ where: { supplierId: { not: null }, type: { in: ['SUPPLIER_OBLIGATION','SUPPLIER_OBLIGATION_REVERSAL','SUPPLIER_PAYMENT'] } }, select: { supplierId: true, type: true, amount: true } }),
  ]);
  const supplierMargins = new Map(await Promise.all(
    suppliers.map(async supplier => [supplier.id, await getSupplierProfitMargin(prisma, supplier.id)] as const)
  ));

  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
    <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
    <main className="w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
      <header><h1 className="font-heading text-3xl font-bold text-[#3F4B32]">الموردون والعروض</h1><p className="mt-1 text-zinc-600">حدد حصة المورد من الربح مرة واحدة لتطبق على جميع منتجاته والطلبات الجديدة. تبقى نسب الطلبات السابقة محفوظة.</p></header>

      <section className="grid gap-5 xl:grid-cols-2">
        <form action={createSupplier} className="grid gap-3 rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="font-bold">إضافة مورد</h2>
          <input name="name" required minLength={2} maxLength={120} placeholder="اسم المورد" className="rounded border px-3 py-2" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="phone" placeholder="الهاتف" className="rounded border px-3 py-2" />
            <input type="email" name="email" placeholder="البريد الإلكتروني" className="rounded border px-3 py-2" />
            <input name="profitMargin" type="number" min="0" max="100" defaultValue="0" placeholder="نسبة الربح %" className="rounded border px-3 py-2 sm:col-span-2" />
          </div>
          <button className="justify-self-start rounded bg-[#3F4B32] px-5 py-2 font-bold text-white">حفظ المورد</button>
        </form>

      </section>

      <section className="space-y-4">
        {suppliers.map(supplier => {
          const supplierOrders = orders.filter(order => order.items.some(item => item.supplierIdSnapshot === supplier.id));
          const supplierTx = supplierTransactions.filter(tx => tx.supplierId === supplier.id);
          const owed = supplierTx.filter(tx => tx.type === 'SUPPLIER_OBLIGATION').reduce((n,tx)=>n+tx.amount,0) - supplierTx.filter(tx => tx.type === 'SUPPLIER_OBLIGATION_REVERSAL').reduce((n,tx)=>n+tx.amount,0);
          const paid = supplierTx.filter(tx => tx.type === 'SUPPLIER_PAYMENT').reduce((n,tx)=>n+tx.amount,0);
          const sourcedSales = supplierOrders.reduce((n,order)=>n+order.items.filter(item=>item.supplierIdSnapshot===supplier.id).reduce((s,item)=>s+item.total,0),0);
          const activeProducts = new Set(supplier.offers.filter(o=>o.isActive).map(o=>o.variant.productId)).size;
          return <article key={supplier.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <div className="flex flex-wrap justify-between gap-2 border-b p-4"><div><h2 className="font-bold">{supplier.name} <span className="text-sm font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">نسبة الربح: {supplierMargins.get(supplier.id) ?? 0}%</span></h2><p className="text-xs text-zinc-500 mt-1">{supplier.phone || '—'} · {supplier.email || '—'}</p></div><div className="text-left text-xs text-zinc-600"><p>{supplier.isActive?'فعال':'غير فعال'} · منتجات نشطة {activeProducts} · عروض نشطة {supplier.offers.filter(o=>o.isActive).length} · مخزون عروض {supplier.offers.reduce((n,o)=>n+o.stock,0)}</p><p>مبيعات مسندة {filsToDisplay(sourcedSales)} · الالتزام {filsToDisplay(owed)} · المدفوع {filsToDisplay(paid)} · المتبقي {filsToDisplay(owed-paid)}</p></div></div>
          <details className="border-b p-4"><summary className="cursor-pointer font-bold">تعديل المورد ونسبة الربح لجميع منتجاته</summary>
            <form action={updateSupplier.bind(null, supplier.id)} className="mt-3 flex flex-wrap gap-3">
              <input name="name" aria-label="اسم المورد" defaultValue={supplier.name} required minLength={2} className="rounded border p-2" />
              <input name="phone" aria-label="الهاتف" defaultValue={supplier.phone || ''} className="rounded border p-2" />
              <input name="email" aria-label="البريد الإلكتروني" defaultValue={supplier.email || ''} className="rounded border p-2" />
              <label>حصة المورد من الربح % <input name="profitMargin" type="number" min="0" max="100" step="1" required defaultValue={supplierMargins.get(supplier.id) ?? 0} className="w-20 rounded border p-2" /></label>
              <button className="rounded bg-zinc-900 px-4 py-2 text-white">حفظ المورد</button><DeleteSupplierButton supplierId={supplier.id} supplierName={supplier.name} />
            </form>
          </details>
          {supplier.offers.length ? <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-right text-sm"><thead className="bg-zinc-50 text-zinc-500"><tr><th className="p-3">المنتج</th><th className="p-3">الدرجة</th><th className="p-3">رمز المورد</th><th className="p-3">التكلفة</th><th className="p-3">حصة المورد</th><th className="p-3">المخزون</th><th className="p-3">آخر حركات</th><th className="p-3">استخدام العرض</th></tr></thead><tbody className="divide-y">{supplier.offers.map(offer => <tr key={offer.id}><td className="p-3">{offer.variant.product.nameAr}</td><td className="p-3">{offer.variant.size}</td><td className="p-3">{offer.supplierSku || '—'}</td><td className="p-3">{filsToDisplay(offer.unitCost, 'ar')}</td><td className="p-3">{(offer.supplierProfitShareBps / 100).toFixed(2)}%</td><td className="p-3">{offer.stock}</td><td className="p-3"><details><summary className="cursor-pointer underline">عرض</summary>{offer.inventoryMovements.map(m => <p key={m.id} className="mt-1 whitespace-nowrap text-xs text-zinc-600">{m.reason}: {m.quantityBefore} → {m.quantityAfter}</p>)}</details></td><td className="p-3"><form action={setSupplierOfferActive.bind(null,offer.id,!offer.isActive)}><button className="underline">{offer.isActive?'تعطيل':'تفعيل'}</button></form></td></tr>)}</tbody></table></div> : <p className="p-4 text-sm text-zinc-500">لا توجد عروض مسجلة لهذا المورد.</p>}
          <div className="border-t p-4"><h3 className="mb-2 text-sm font-bold">الطلبات والالتزامات المسجلة</h3><div className="space-y-2">{supplierOrders.slice(0, 10).map(order => { const supplierItems = order.items.filter(item => item.supplierIdSnapshot === supplier.id); const amount = supplierItems.reduce((sum,item) => sum + (item.unitCostSnapshot ?? 0) * item.quantity + (item.supplierAmountSnapshot ?? 0), 0); return <div key={order.id} className="flex justify-between gap-2 text-sm"><Link className="underline" href={`/admin/orders/${order.id}`}>{order.reference} · {new Date(order.createdAt).toLocaleDateString('en-GB')}</Link><span>{supplierItems.some(item => item.unitCostSnapshot === null) ? 'تكلفة غير مكتملة' : filsToDisplay(amount)}</span></div>; })}{supplierOrders.length === 0 && <p className="text-xs text-zinc-500">لا توجد طلبات مسجلة لهذا المورد.</p>}</div></div>
        </article>;
        })}
      </section>
    </main>
  </div>;
}
