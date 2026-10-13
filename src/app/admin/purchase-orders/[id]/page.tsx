import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { notFound } from 'next/navigation';
import { POClientActions } from './POActions';

export default async function PurchaseOrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('manage:inventory');
  const { id } = await params;
  
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      items: {
        include: {
          variant: {
            include: { product: true }
          }
        }
      },
      receipts: true,
      invoices: true,
    }
  });

  if (!po) notFound();

  const warehouses = await prisma.warehouse.findMany({ where: { isActive: true } });
  
  const invoice = po.invoices[0];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <header>
          <div className="flex items-center gap-4">
            <h1 className="font-heading text-3xl font-bold text-[#3F4B32]">تفاصيل أمر الشراء</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
              po.status === 'DRAFT' ? 'bg-gray-200 text-gray-800' :
              po.status === 'SENT' ? 'bg-blue-200 text-blue-800' :
              po.status === 'PARTIAL' ? 'bg-yellow-200 text-yellow-800' :
              po.status === 'COMPLETED' ? 'bg-green-200 text-green-800' :
              'bg-red-200 text-red-800'
            }`}>
              {po.status}
            </span>
          </div>
          <p className="mt-1 text-zinc-600">المرجع: {po.reference} | المورد: {po.supplier.name}</p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2">المنتجات</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="text-zinc-500">
                    <tr>
                      <th className="py-2">المنتج</th>
                      <th className="py-2">الكمية المطلوبة</th>
                      <th className="py-2">الكمية المستلمة</th>
                      <th className="py-2">سعر الوحدة</th>
                      <th className="py-2">المجموع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {po.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-3">
                          <p className="font-medium">{item.variant.product.nameAr} - {item.variant.name}</p>
                          <p className="text-xs text-zinc-500">{item.variant.sku}</p>
                        </td>
                        <td className="py-3">{item.quantityOrdered}</td>
                        <td className="py-3 font-medium text-green-600">{item.quantityReceived}</td>
                        <td className="py-3">{(item.unitCost / 1000).toFixed(3)} د.أ</td>
                        <td className="py-3 font-bold">{((item.unitCost * item.quantityOrdered) / 1000).toFixed(3)} د.أ</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t font-bold">
                    <tr>
                      <td colSpan={4} className="py-3">المجموع الكلي:</td>
                      <td className="py-3 text-[#3F4B32] text-lg">{(po.totalAmount / 1000).toFixed(3)} د.أ</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {po.receipts.length > 0 && (
              <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
                <h2 className="font-bold text-lg border-b pb-2">إيصالات الاستلام</h2>
                <div className="space-y-2">
                  {po.receipts.map(r => (
                    <div key={r.id} className="flex justify-between text-sm p-3 bg-zinc-50 rounded border">
                      <div>
                        <p className="font-bold">{r.reference}</p>
                        <p className="text-xs text-zinc-500">مستلم من قبل: {r.receivedBy}</p>
                      </div>
                      <p className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString('en-GB')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
              <h2 className="font-bold text-lg border-b pb-2">الإجراءات</h2>
              <POClientActions 
                poId={po.id} 
                status={po.status} 
                items={po.items} 
                warehouses={warehouses}
                hasInvoice={!!invoice}
                invoiceId={invoice?.id}
                invoiceStatus={invoice?.status}
              />
            </div>

            {invoice && (
              <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
                <h2 className="font-bold text-lg border-b pb-2">فاتورة المورد</h2>
                <div className="text-sm space-y-2">
                  <p><span className="text-zinc-500">المرجع:</span> {invoice.reference}</p>
                  <p><span className="text-zinc-500">المبلغ:</span> {(invoice.totalAmount / 1000).toFixed(3)} د.أ</p>
                  <p><span className="text-zinc-500">المدفوع:</span> <span className="font-bold text-green-600">{(invoice.amountPaid / 1000).toFixed(3)} د.أ</span></p>
                  <p>
                    <span className="text-zinc-500">الحالة:</span>{' '}
                    <span className={`px-2 py-1 rounded text-xs font-bold ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
