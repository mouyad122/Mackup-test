import React from 'react';
import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { filsToDisplay } from '@/lib/money';
import Link from 'next/link';

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireAuth();
  const params = await searchParams;
  const tabs: Record<string, string[]> = {
    PENDING: ['AWAITING_WHATSAPP','PENDING'], PREPARING: ['CONFIRMED','PREPARING','PREPARED'],
    DELIVERY: ['ASSIGNED','SHIPPED','OUT_FOR_DELIVERY','FAILED_DELIVERY'], COMPLETED: ['DELIVERED'],
    CANCELLED: ['CANCELLED'], REFUNDED: ['REFUNDED'],
  };
  const currentTab = tabs[params.tab || ''] ? params.tab! : 'PENDING';
  const orders = await prisma.order.findMany({ where: { status: { in: tabs[currentTab] } }, orderBy: { createdAt: 'desc' }, take: 250, include: { items: true, deliveryAssignment: { include: { captain: true } } } });
  const orderMetrics = (order: typeof orders[number]) => {
    const hasUnknownCost = order.items.some(item => item.unitCostSnapshot === null);
    const supplierCost = order.items.reduce((sum,item)=>sum+(item.unitCostSnapshot ?? 0)*item.quantity+(item.supplierAmountSnapshot ?? 0),0);
    const productProfit = order.items.reduce((sum,item)=>sum+(item.platformProductProfitSnapshot ?? 0),0);
    const supplierNames = Array.from(new Set(order.items.map(item=>item.supplierNameSnapshot).filter(Boolean))).join('، ') || '—';
    const platformProfit = hasUnknownCost || order.actualDeliveryCost === null || (!order.deliveryAssignment && order.status !== 'CANCELLED' && order.status !== 'REFUNDED')
      ? null
      : productProfit + order.shippingCost - order.actualDeliveryCost - (order.deliveryAssignment?.captainEarning ?? 0);
    return { supplierCost, supplierNames, platformProfit, hasUnknownCost };
  };
  const tabsList: [string,string][] = [['PENDING','جديدة'],['PREPARING','التجهيز'],['DELIVERY','التوصيل'],['COMPLETED','مكتملة'],['CANCELLED','ملغاة'],['REFUNDED','مستردة']];
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 overflow-y-auto p-4 md:p-8">
    <header className="mb-6"><h1 className="text-3xl font-bold">طلبات المتجر</h1><p className="mt-1 text-sm text-zinc-600">التكاليف والأرباح تُعرض من اللقطات المحفوظة مع الطلب.</p></header>
    <nav className="mb-5 flex gap-2 overflow-x-auto pb-2">{tabsList.map(([id,label])=><Link key={id} href={`/admin/orders?tab=${id}`} className={`whitespace-nowrap rounded border px-3 py-2 text-sm ${currentTab===id?'bg-zinc-900 text-white':'bg-white'}`}>{label}</Link>)}</nav>
    <div className="space-y-3 md:hidden">{orders.map(order=>{const m=orderMetrics(order);return <article key={order.id} className="space-y-2 rounded-lg border bg-white p-4 text-sm"><div className="flex justify-between gap-2"><Link className="font-bold underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link><span>{order.status}</span></div><p>{order.customerName} · {new Date(order.createdAt).toLocaleDateString('ar-JO')}</p><p>الدفع: {order.paymentStatus} · النهائي: <b>{filsToDisplay(order.totalAmount)}</b></p><p>المنتجات قبل الخصم: {filsToDisplay(order.totalAmount-order.shippingCost+order.discountAmount)} · الخصم: {filsToDisplay(order.discountAmount)} {order.couponCodeSnapshot?`· ${order.couponCodeSnapshot}`:''} {order.rewardNameSnapshot?`· ${order.rewardNameSnapshot}`:''}</p><p>توصيل: {filsToDisplay(order.shippingCost)} · ناقل: {order.actualDeliveryCost===null?'غير معروف':filsToDisplay(order.actualDeliveryCost)}</p><p>المورد: {m.supplierNames} · الالتزام: {m.hasUnknownCost?'غير مكتمل':filsToDisplay(m.supplierCost)}</p><p>المندوب: {order.deliveryAssignment?.captain.name||'—'} · أجر: {order.deliveryAssignment?filsToDisplay(order.deliveryAssignment.captainEarning):'—'}</p><p>ربح المنصة: {m.platformProfit===null?'بيانات غير مكتملة':filsToDisplay(m.platformProfit)}</p></article>})}</div>
    <div className="hidden overflow-x-auto rounded-lg border bg-white md:block"><table className="w-full min-w-[1450px] text-right text-xs"><thead className="bg-zinc-50"><tr>{['الطلب / العميل','التاريخ','الحالة / الدفع','المنتجات قبل الخصم','الخصم / القسيمة / المكافأة','رسوم التوصيل','تكلفة الناقل','المورد / الالتزام','المندوب / أجره','ربح المنصة','الإجمالي'].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y">{orders.map(order=>{const m=orderMetrics(order);return <tr key={order.id}><td className="p-3"><Link className="font-bold underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link><div>{order.customerName}</div></td><td className="p-3">{new Date(order.createdAt).toLocaleString('ar-JO')}</td><td className="p-3">{order.status}<br/>{order.paymentStatus}</td><td className="p-3">{filsToDisplay(order.totalAmount-order.shippingCost+order.discountAmount)}</td><td className="p-3">{filsToDisplay(order.discountAmount)}<br/>{order.couponCodeSnapshot||'—'}<br/>{order.rewardNameSnapshot||'—'}</td><td className="p-3">{filsToDisplay(order.shippingCost)}<br/>{order.shippingZoneNameSnapshot||'—'}</td><td className="p-3">{order.actualDeliveryCost===null?'غير معروف':filsToDisplay(order.actualDeliveryCost)}</td><td className="p-3">{m.supplierNames}<br/>{m.hasUnknownCost?'غير مكتمل':filsToDisplay(m.supplierCost)}</td><td className="p-3">{order.deliveryAssignment?.captain.name||'—'}<br/>{order.deliveryAssignment?filsToDisplay(order.deliveryAssignment.captainEarning):'—'}</td><td className="p-3">{m.platformProfit===null?'غير مكتمل':filsToDisplay(m.platformProfit)}</td><td className="p-3 font-bold">{filsToDisplay(order.totalAmount)}</td></tr>})}</tbody></table></div>
    {!orders.length&&<p className="rounded-lg border bg-white p-8 text-center text-zinc-500">لا توجد طلبات في هذا القسم.</p>}
  </main></div>;
}
