import React from 'react';
import { requireAuth } from '@/lib/dal';
import { filsToDisplay } from '@/lib/money';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { updateOrderStatus, confirmStorefrontOrder, cancelStorefrontOrder } from '@/actions/orders';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { OrderWhatsAppButton } from '@/components/OrderWhatsAppButton';
import { AdminOrderQuickActions } from '@/components/AdminOrderQuickActions';
import InvoiceLink from '@/components/InvoiceLink';

export default async function AdminOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth();
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: {
              variants: true
            }
          }
        }
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!order) {
    notFound();
  }

  async function handleUpdateStatusQuick(orderId: string, newStatus: string, shippingCost?: number) {
    'use server';
    // Use existing shipping cost if not provided
    const cost = shippingCost !== undefined ? shippingCost : order!.shippingCost;
    const res = await updateOrderStatus(orderId, newStatus, cost);
    if (res.success) {
      // Revalidate or redirect will happen automatically via server actions or we can leave it
    } else {
      console.error("Error updating status:", res.error);
      return res;
    }
    return { success: true };
  }

  const orderSubtotal = order.totalAmount - order.shippingCost;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin/orders" className="text-sm text-zinc-500 hover:underline">
                العودة للطلبات
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="text-sm font-bold text-zinc-700">تفاصيل الطلب</span>
            </div>
            <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)] mt-2">
              طلب رقم: {order.reference}
            </h1>
            <InvoiceLink orderId={order.id} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Details & Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Info */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm">
              <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-4 border-b pb-2">
                بيانات المستلم والتوصيل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-700">
                <p><strong>اسم العميل:</strong> {order.customerName}</p>
                <p><strong>رقم الهاتف:</strong> <span dir="ltr">{order.customerPhone}</span></p>
                <p><strong>حالة الطلب:</strong> <span className="font-bold">{order.status}</span></p>
                <p><strong>تاريخ التسجيل:</strong> {new Date(order.createdAt).toLocaleString('ar-JO')}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm">
              <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-4 border-b pb-2">
                المكياج والمنتجات المطلوبة
              </h2>
              <div className="divide-y divide-zinc-100">
                {order.items.map((item) => {
                  const dbProduct = item.product;
                  const dbVariant = dbProduct?.variants.find(v => v.id === item.variantId);
                  const currentStock = dbVariant?.stock ?? 0;

                  return (
                    <div key={item.id} className="py-4 flex justify-between items-center text-sm">
                      <div>
                        <h4 className="font-bold text-zinc-900">{item.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1">
                          الدرجة: {item.size} | SKU: {item.sku}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          مخزون الدرجة الحالي: {currentStock} قطع
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-emerald-600">{filsToDisplay(item.total, 'ar')}</p>
                        <p className="text-xs text-zinc-500 mt-1">{item.quantity} × {filsToDisplay(item.unitPrice, 'ar')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>المجموع الفرعي (بدون توصيل):</span>
                  <span>{filsToDisplay(orderSubtotal, 'ar')}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>رسوم التوصيل:</span>
                  <span>{filsToDisplay(order.shippingCost, 'ar')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-[var(--color-charcoal-900)] pt-2 border-t mt-2">
                  <span>المجموع الإجمالي المطلوب:</span>
                  <span>{filsToDisplay(order.totalAmount, 'ar')}</span>
                </div>
              </div>
            </div>
            
            {/* History */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm">
              <h2 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-4 border-b pb-2">
                سجل حالات الطلب
              </h2>
              <div className="space-y-4">
                 {order.statusHistory.map(hist => (
                    <div key={hist.id} className="border-r-2 border-[var(--color-champagne-400)] pr-4 text-sm">
                       <p className="font-bold text-zinc-800">{hist.status}</p>
                       <p className="text-xs text-zinc-500">{new Date(hist.createdAt).toLocaleString('ar-JO')}</p>
                       {hist.notes && <p className="text-xs text-zinc-600 mt-1 bg-zinc-50 p-2 rounded">{hist.notes}</p>}
                    </div>
                 ))}
                 {order.statusHistory.length === 0 && <p className="text-sm text-zinc-500">لا يوجد سجل حالات.</p>}
              </div>
            </div>
          </div>

          {/* Actions & Status Management */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm sticky top-6">
              <h3 className="text-lg font-bold text-[var(--color-charcoal-900)] mb-4 border-b pb-2">
                إدارة الطلب
              </h3>

              {/* إجراءات سريعة لتحديث الحالة والواتساب - مطابقة للكاشير */}
              <div className="mb-6">
                <AdminOrderQuickActions 
                  orderId={order.id} 
                  status={order.status} 
                  phone={order.customerPhone} 
                  reference={order.reference} 
                  confirmAction={confirmStorefrontOrder}
                  cancelAction={cancelStorefrontOrder}
                  updateStatusAction={handleUpdateStatusQuick} 
                />
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
