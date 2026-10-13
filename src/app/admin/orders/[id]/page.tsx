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
import { inspectCancelledOrderReturn } from '@/actions/inventory';
import { AdminOrderFinancials } from '@/components/AdminOrderFinancials';

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
      },
      deliveryAssignment: { include: { captain: true } },
      invoice: true,
    }
  });

  if (!order) {
    notFound();
  }

  const captains = await prisma.captain.findMany({ where: { isActive: true } });
  const hasMissingProfits = order.items.some(item => item.unitCostSnapshot === null || item.platformProductProfitSnapshot === null);

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

  const orderSubtotal = order.totalAmount - order.shippingCost + order.discountAmount;
  const statusLabel: Record<string, string> = { PREPARING: 'قيد التجهيز', PREPARED: 'جاهز', SHIPPED: 'مع التوصيل', OUT_FOR_DELIVERY: 'قيد التوصيل', DELIVERED: 'مكتمل', CANCELLED: 'ملغى', REFUNDED: 'مسترد' };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />

      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full">
        <div className="flex justify-between items-center mb-8 border-b border-[var(--color-ivory-200)] pb-4">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/admin/orders" className="text-sm text-zinc-500 hover:underline">
                العودة للطلبات
              </Link>
              <span className="text-zinc-300">/</span>
              <span className="text-sm font-bold text-zinc-700">تفاصيل الطلب</span>
            </div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4B32] mt-2">
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
              <h2 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
                بيانات المستلم والتوصيل
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-700">
                <p><strong>اسم العميل:</strong> {order.customerName}</p>
                <p><strong>رقم الهاتف:</strong> <span dir="ltr">{order.customerPhone}</span></p>
                <p><strong>حالة الطلب:</strong> <span className="font-bold">{statusLabel[order.status] || order.status}</span></p>
                <p><strong>تاريخ التسجيل:</strong> {new Date(order.createdAt).toLocaleString('en-GB')}</p>
                <p><strong>المحافظة:</strong> {order.shippingZoneNameSnapshot || 'غير مسجلة'}</p>
                <p><strong>البريد الإلكتروني:</strong> غير متاح لهذا الطلب</p>
                <p><strong>طريقة الدفع:</strong> {order.invoice?.cashAppliedFils ? 'نقداً' : order.invoice?.cardAppliedFils ? 'بطاقة' : 'الدفع عند الاستلام'}</p>
                <p><strong>حالة الدفع:</strong> {order.paymentStatus}</p>
                <p className="md:col-span-2"><strong>العنوان:</strong> {order.notes || 'غير مسجل'}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm">
              <h2 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
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
                        <p className="text-xs text-zinc-500 mt-1">الدرجة: {item.size} | SKU: {item.sku}</p>
                        <p className="text-xs text-zinc-600 mt-1">المورد: {item.supplierNameSnapshot || 'غير مسجل'} · التكلفة: {item.unitCostSnapshot === null ? 'غير مسجلة' : filsToDisplay(item.unitCostSnapshot * item.quantity, 'ar')} · حصة المورد: {item.supplierProfitShareBpsSnapshot === null ? 'غير مسجلة' : `${(item.supplierProfitShareBpsSnapshot / 100).toFixed(2)}%`} · مبلغ المورد: {item.supplierAmountSnapshot === null ? 'غير مسجل' : filsToDisplay(item.supplierAmountSnapshot, 'ar')}</p>
                        <p className="text-xs text-emerald-800 mt-1">ربح المنتج للمنصة: {item.platformProductProfitSnapshot === null ? 'غير مكتمل' : filsToDisplay(item.platformProductProfitSnapshot, 'ar')}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          مخزون الدرجة الحالي: {currentStock} قطع
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-emerald-600">{filsToDisplay(item.total, 'ar')}</p>
                      <p className="text-xs text-zinc-500 mt-1">{item.quantity} × {filsToDisplay(item.unitPrice, 'ar')}{item.discountAmountSnapshot > 0 ? ` · خصم ${filsToDisplay(item.discountAmountSnapshot, 'ar')}` : ''}</p>
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
                {order.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>الخصم {order.couponCodeSnapshot ? `(${order.couponCodeSnapshot})` : ''}:</span><span>−{filsToDisplay(order.discountAmount, 'ar')}</span></div>}
                {order.couponDiscount > 0 && <div className="flex justify-between text-zinc-600"><span>خصم القسيمة:</span><span>−{filsToDisplay(order.couponDiscount, 'ar')}</span></div>}
                {order.rewardDiscount > 0 && <div className="flex justify-between text-zinc-600"><span>خصم المكافأة {order.rewardNameSnapshot ? `(${order.rewardNameSnapshot})` : ''}:</span><span>−{filsToDisplay(order.rewardDiscount, 'ar')}</span></div>}
                <div className="flex justify-between text-zinc-600"><span>تكلفة شركة التوصيل:</span><span>{order.actualDeliveryCost === null ? 'غير مسجلة' : filsToDisplay(order.actualDeliveryCost, 'ar')}</span></div>
                <div className="flex justify-between text-zinc-600"><span>المندوب:</span><span>{order.deliveryAssignment?.captain.name || 'غير معين'}</span></div>
                {order.deliveryAssignment && <div className="flex justify-between text-zinc-600"><span>أجر المندوب:</span><span>{filsToDisplay(order.deliveryAssignment.captainEarning, 'ar')}</span></div>}
                {order.deliveryAssignment && <div className="flex justify-between text-zinc-600"><span>ربح التوصيل:</span><span>{order.deliveryAssignment.actualCarrierCost === null ? 'تكلفة الناقل غير مسجلة' : filsToDisplay(order.deliveryAssignment.customerDeliveryFee - order.deliveryAssignment.actualCarrierCost - order.deliveryAssignment.captainEarning, 'ar')}</span></div>}
                <div className="flex justify-between text-emerald-800"><span>ربح المنصة للمنتجات:</span><span>{order.items.some(item => item.platformProductProfitSnapshot === null) ? 'بيانات غير مكتملة' : filsToDisplay(order.items.reduce((sum,item)=>sum+(item.platformProductProfitSnapshot ?? 0),0), 'ar')}</span></div>
                <div className="flex justify-between text-zinc-600"><span>المبلغ المسجل كمدفوع:</span><span>{order.invoice ? filsToDisplay(order.invoice.cashAppliedFils + order.invoice.cardAppliedFils, 'ar') : 'لم تسجل دفعة'}</span></div>
                <div className="flex justify-between text-zinc-600"><span>التزام الموردين:</span><span>{order.items.some(item => item.unitCostSnapshot === null) ? 'بيانات غير مكتملة' : filsToDisplay(order.items.reduce((sum,item)=>sum+(item.unitCostSnapshot ?? 0)*item.quantity+(item.supplierAmountSnapshot ?? 0),0), 'ar')}</span></div>
                <div className="flex justify-between text-zinc-600"><span>صافي ربح المنصة من الطلب:</span><span>{order.items.some(item => item.platformProductProfitSnapshot === null) || order.actualDeliveryCost === null || (!order.deliveryAssignment && !['CANCELLED','REFUNDED'].includes(order.status)) ? 'بيانات غير مكتملة' : filsToDisplay(order.items.reduce((sum,item)=>sum+(item.platformProductProfitSnapshot ?? 0),0) + order.shippingCost - order.actualDeliveryCost, 'ar')}</span></div>
                <div className="flex justify-between text-lg font-bold text-[#3F4B32] pt-2 border-t mt-2">
                  <span>المجموع الإجمالي المطلوب:</span>
                  <span>{filsToDisplay(order.totalAmount, 'ar')}</span>
                </div>
              </div>
            </div>
            
            {/* History */}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm">
              <h2 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
                سجل حالات الطلب
              </h2>
              <div className="space-y-4">
                 {order.statusHistory.map(hist => (
                    <div key={hist.id} className="border-r-2 border-[var(--color-champagne-400)] pr-4 text-sm">
                       <p className="font-bold text-zinc-800">{hist.status}</p>
                       <p className="text-xs text-zinc-500">{new Date(hist.createdAt).toLocaleString('en-GB')}</p>
                       {hist.notes && <p className="text-xs text-zinc-600 mt-1 bg-zinc-50 p-2 rounded">{hist.notes}</p>}
                    </div>
                 ))}
                 {order.statusHistory.length === 0 && <p className="text-sm text-zinc-500">لا يوجد سجل حالات.</p>}
              </div>
            </div>
          </div>

          {/* Actions & Status Management */}
          <div className="space-y-6">
            {['CANCELLED', 'REFUNDED'].includes(order.status) && order.notes?.includes('[RETURN_PENDING]') && !order.notes.includes('[RETURN_INSPECTED]') && <section className="rounded-lg border border-amber-200 bg-white p-5 shadow-sm">
              <h3 className="font-bold text-amber-900">فحص البضائع المرتجعة</h3>
              <p className="my-2 text-xs text-zinc-600">أدخل فقط الكمية التي وصلت فعلياً. الكمية غير المستلمة تبقى غير متاحة للبيع.</p>
              <form action={inspectCancelledOrderReturn.bind(null, order.id)} className="space-y-3">
                {order.items.map(item => <div key={item.id} className="grid grid-cols-[1fr_auto] items-center gap-2 border-t pt-2 text-xs">
                  <span>{item.name} · {item.size} · مطلوب {item.quantity}<input type="hidden" name="orderItemId" value={item.id}/></span>
                  <div className="flex gap-2"><input name="quantity" type="number" min="0" max={item.quantity} defaultValue="0" className="w-20 rounded border p-2" aria-label="الكمية المستلمة"/><select name="outcome" className="rounded border p-2"><option value="RESTOCKABLE">صالح لإعادة التخزين</option><option value="DAMAGED">تالف</option><option value="SUPPLIER_RETURN">إرجاع للمورد</option><option value="WRITE_OFF">شطب</option></select></div>
                </div>)}
                <button className="w-full rounded bg-amber-800 px-3 py-2 text-sm font-bold text-white">حفظ نتيجة الفحص</button>
              </form>
            </section>}
            <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm sticky top-6">
              <h3 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
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
            
            <AdminOrderFinancials 
              orderId={order.id} 
              captains={captains} 
              hasMissingProfits={hasMissingProfits} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}
