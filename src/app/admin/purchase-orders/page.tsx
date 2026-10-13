import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';

export default async function PurchaseOrdersPage() {
  const session = await requirePermission('manage:inventory');
  
  const purchaseOrders = await prisma.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    include: { supplier: true, items: true },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="font-heading text-3xl font-bold text-[#3F4B32]">أوامر الشراء</h1>
            <p className="mt-1 text-zinc-600">إدارة أوامر الشراء، استلام البضائع، وفواتير الموردين.</p>
          </div>
          <Link href="/admin/purchase-orders/create" className="rounded bg-[#3F4B32] px-5 py-2 font-bold text-white">
            أمر شراء جديد
          </Link>
        </header>

        <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="w-full text-right text-sm">
            <thead className="bg-zinc-50 text-zinc-500 border-b">
              <tr>
                <th className="p-4 font-medium">المرجع</th>
                <th className="p-4 font-medium">المورد</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">المبلغ</th>
                <th className="p-4 font-medium">التاريخ</th>
                <th className="p-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {purchaseOrders.map(po => (
                <tr key={po.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="p-4">{po.reference}</td>
                  <td className="p-4">{po.supplier.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      po.status === 'DRAFT' ? 'bg-gray-100 text-gray-700' :
                      po.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                      po.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' :
                      po.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="p-4">{(po.totalAmount / 1000).toFixed(3)} د.أ</td>
                  <td className="p-4">{new Date(po.createdAt).toLocaleDateString('en-GB')}</td>
                  <td className="p-4">
                    <Link href={`/admin/purchase-orders/${po.id}`} className="text-[#3F4B32] underline text-sm font-medium">
                      التفاصيل
                    </Link>
                  </td>
                </tr>
              ))}
              {purchaseOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-zinc-500">
                    لا توجد أوامر شراء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
