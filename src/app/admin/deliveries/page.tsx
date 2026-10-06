import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { reassignCaptain } from '@/actions/operations';

export default async function DeliveriesPage() {
  const session = await requirePermission('manage:settings');
  const [assignments, captains] = await Promise.all([
    prisma.deliveryAssignment.findMany({ include: { order: true, captain: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.captain.findMany({ where: { isActive: true, status: 'AVAILABLE' }, orderBy: { name: 'asc' } }),
  ]);
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 space-y-5 p-4 md:p-8"><header><h1 className="text-3xl font-bold">إدارة التوصيلات</h1><p className="mt-1 text-sm text-zinc-600">تغيير المندوب لا يغير أجرة المندوب أو رسوم التوصيل المحفوظة مع الطلب.</p></header><div className="space-y-3">{assignments.map(a=><article key={a.id} className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_auto]"><div><div className="flex flex-wrap justify-between gap-2"><b>{a.order.reference} · {a.order.customerName}</b><span className="rounded bg-zinc-100 px-2 py-1 text-xs">{a.status}</span></div><div className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-3"><span>المحافظة: {a.order.shippingZoneNameSnapshot||'—'}</span><span>رسوم العميل: {filsToDisplay(a.customerDeliveryFee)}</span><span>تكلفة الناقل: {a.actualCarrierCost===null?'غير مسجلة':filsToDisplay(a.actualCarrierCost)}</span><span>المندوب: {a.captain.name}</span><span>أجر المندوب: {filsToDisplay(a.captainEarning)}</span><span>أُنشئ: {new Date(a.createdAt).toLocaleString('ar-JO')}</span><span>سُلّم: {a.deliveredAt?new Date(a.deliveredAt).toLocaleString('ar-JO'):'—'}</span></div></div>{!['DELIVERED','CANCELLED'].includes(a.status)&&captains.length>0&&<form action={async (fd:FormData)=>{'use server';const id=String(fd.get('captainId'));await reassignCaptain(a.id,id)}} className="flex items-center gap-2"><select name="captainId" required className="rounded border p-2 text-sm">{captains.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select><button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">إعادة التعيين</button></form>}</article>)}{assignments.length===0&&<p className="rounded border bg-white p-8 text-center text-zinc-500">لا توجد توصيلات مسجلة.</p>}</div></main></div>;
}
