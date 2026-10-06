import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requirePermission('manage:settings');
  const { q } = await searchParams;
  const orders = await prisma.order.findMany({ where: q ? { OR: [{ customerName: { contains: q, mode: 'insensitive' } }, { customerPhone: { contains: q } }] } : {}, orderBy: { createdAt: 'desc' }, take: 2000, select: { id: true, reference: true, customerName: true, customerPhone: true, totalAmount: true, status: true, notes: true, couponCodeSnapshot: true, rewardDiscount: true, createdAt: true } });
  const customers = new Map<string, { name: string; phone: string; orders: typeof orders; spend: number; rewards: number; coupons: number; addresses: Set<string> }>();
  for (const order of orders) {
    const key = order.customerPhone.replace(/\D/g, '') || order.customerName;
    const current = customers.get(key) || { name: order.customerName, phone: order.customerPhone, orders: [], spend: 0, rewards: 0, coupons: 0, addresses: new Set<string>() };
    current.orders.push(order);
    if (['CONFIRMED','PREPARING','PREPARED','ASSIGNED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY'].includes(order.status)) current.spend += order.totalAmount;
    current.rewards += order.rewardDiscount;
    if (order.couponCodeSnapshot) current.coupons++;
    if (order.notes) current.addresses.add(order.notes);
    customers.set(key,current);
  }
  const rows = [...customers.values()].sort((a,b)=>b.orders.length-a.orders.length);
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 space-y-5 p-4 md:p-8"><header><h1 className="text-3xl font-bold">العملاء</h1><p className="mt-1 text-sm text-zinc-600">بيانات مجمعة من الطلبات المسجلة؛ البريد الإلكتروني ونقاط الولاء غير متاحين في نموذج الطلب الحالي.</p></header><form className="flex gap-2 rounded border bg-white p-3"><input name="q" defaultValue={q} placeholder="ابحث بالاسم أو الهاتف" className="min-w-0 flex-1 rounded border p-2"/><button className="rounded bg-zinc-900 px-4 text-white">بحث</button></form><div className="space-y-3">{rows.map(customer=>{const latest=customer.orders[0];return <details key={customer.phone} className="rounded-lg border bg-white p-4"><summary className="cursor-pointer"><span className="font-bold">{customer.name}</span><span className="mx-2 text-sm text-zinc-500" dir="ltr">{customer.phone}</span><span className="text-xs text-zinc-500">{customer.orders.length} طلب · آخر طلب {latest?new Date(latest.createdAt).toLocaleDateString('ar-JO'):'—'} · الإنفاق {filsToDisplay(customer.spend)}</span></summary><div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>طلبات القسائم: {customer.coupons}</p><p>خصومات المكافآت المستعملة: {filsToDisplay(customer.rewards)}</p><p className="sm:col-span-2">العناوين المحفوظة من الطلبات: {[...customer.addresses].join(' ؛ ')||'—'}</p></div><div className="mt-3 space-y-1 border-t pt-3">{customer.orders.map(o=><p key={o.id} className="flex justify-between gap-2 text-sm"><Link className="underline" href={`/admin/orders/${o.id}`}>{o.reference} · {o.status}</Link><span>{filsToDisplay(o.totalAmount)}</span></p>)}</div></details>})}{rows.length===0&&<p className="rounded border bg-white p-8 text-center">لا توجد نتائج.</p>}</div></main></div>;
}
