import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';
import Link from 'next/link';
import { CustomerActions } from './CustomerActions';

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission('manage:settings');
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      loyaltyAccount: true,
      addresses: true,
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      sales: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!customer) {
    return notFound();
  }

  const totalOrdersValue = customer.orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalSalesValue = customer.sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[var(--color-ivory-100)]" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 p-4 md:p-8 font-sans">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">
              ملف العميل: {customer.firstName} {customer.lastName || ''}
            </h1>
            <p className="text-zinc-650 mt-1">عرض تفاصيل العميل، نقاط الولاء، وسجل الطلبات</p>
          </div>
          <Link href="/admin/customers" className="px-4 py-2 border border-zinc-300 rounded text-zinc-700 hover:bg-zinc-100 font-bold text-sm">
            العودة للقائمة
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Right Column: Basic Info & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-ivory-200)]">
              <h3 className="font-bold text-lg mb-4 border-b pb-2 text-[#3F4B32]">المعلومات الأساسية</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">الاسم:</span>
                  <span className="font-bold">{customer.firstName} {customer.lastName || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">الهاتف:</span>
                  <span className="font-mono text-left" dir="ltr">{customer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">البريد الإلكتروني:</span>
                  <span>{customer.email || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">تاريخ التسجيل:</span>
                  <span>{new Date(customer.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-ivory-200)]">
              <h3 className="font-bold text-lg mb-4 border-b pb-2 text-[#3F4B32]">نقاط الولاء (Loyalty)</h3>
              {customer.loyaltyAccount ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">الرصيد الحالي:</span>
                    <span className="font-bold text-[var(--color-gold-600)] text-lg">{customer.loyaltyAccount.pointsBalance} نقطة</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">المستوى:</span>
                    <span className="font-bold uppercase">{customer.loyaltyAccount.tier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">مجموع النقاط المكتسبة:</span>
                    <span>{customer.loyaltyAccount.lifetimePoints} نقطة</span>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">لم يتم تسجيل حساب ولاء لهذا العميل.</p>
              )}
            </div>

            <CustomerActions customer={{ id: customer.id, notes: customer.notes, isActive: customer.isActive }} />

            <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-ivory-200)]">
              <h3 className="font-bold text-lg mb-4 border-b pb-2 text-[#3F4B32]">العناوين المسجلة</h3>
              {customer.addresses.length > 0 ? (
                <div className="space-y-4">
                  {customer.addresses.map((addr) => (
                    <div key={addr.id} className="text-sm p-3 bg-zinc-50 border rounded">
                      <p className="font-bold">{addr.type} {addr.isDefault && '(افتراضي)'}</p>
                      <p>{addr.city}، {addr.street}</p>
                      {addr.building && <p>مبنى: {addr.building} {addr.apartment && `, شقة: ${addr.apartment}`}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">لا توجد عناوين مسجلة.</p>
              )}
            </div>
          </div>

          {/* Left Column: Orders & Sales History */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-[#3F4B32]">سجل الطلبات (أونلاين)</h3>
                <span className="text-sm font-bold bg-zinc-100 px-3 py-1 rounded">الإجمالي: {filsToDisplay(totalOrdersValue)}</span>
              </div>
              
              {customer.orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-zinc-50 border-b">
                      <tr>
                        <th className="px-4 py-3">رقم الطلب</th>
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3">القيمة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customer.orders.map(order => (
                        <tr key={order.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-mono">
                            <Link href={`/admin/orders/${order.id}`} className="text-blue-600 hover:underline">{order.reference}</Link>
                          </td>
                          <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3">{order.status}</td>
                          <td className="px-4 py-3 font-bold">{filsToDisplay(order.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">لا توجد طلبات سابقة.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-xl text-[#3F4B32]">سجل المبيعات (نقاط البيع - POS)</h3>
                <span className="text-sm font-bold bg-zinc-100 px-3 py-1 rounded">الإجمالي: {filsToDisplay(totalSalesValue)}</span>
              </div>
              
              {customer.sales.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="bg-zinc-50 border-b">
                      <tr>
                        <th className="px-4 py-3">رقم الفاتورة</th>
                        <th className="px-4 py-3">التاريخ</th>
                        <th className="px-4 py-3">الحالة</th>
                        <th className="px-4 py-3">القيمة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {customer.sales.map(sale => (
                        <tr key={sale.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-3 font-mono">{sale.reference}</td>
                          <td className="px-4 py-3">{new Date(sale.createdAt).toLocaleDateString('en-GB')}</td>
                          <td className="px-4 py-3">{sale.status}</td>
                          <td className="px-4 py-3 font-bold">{filsToDisplay(sale.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-500 text-sm">لا توجد عمليات شراء من المتجر.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
