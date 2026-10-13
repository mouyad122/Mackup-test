import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { createCaptain, updateCaptain } from '@/actions/captains';
import Link from 'next/link';

export default async function CaptainsPage() {
  const session = await requirePermission('manage:orders');
  const captains = await prisma.captain.findMany({
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    include: {
      assignments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { order: { select: { id: true, reference: true, customerName: true } } },
      },
      settlements: { select: { amount: true } },
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 p-4 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">الكباتن ومندوبو التوصيل</h1>
            <p className="mt-1 text-sm text-zinc-600">إدارة المندوبين ومراجعة آخر التوصيلات المسندة لكل مندوب.</p>
          </div>
          <Link href="/admin/deliveries" className="rounded border bg-white px-4 py-2 text-sm font-bold hover:bg-zinc-50">
            فتح إدارة التوصيلات
          </Link>
        </header>

        <section className="rounded-lg border bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">إضافة مندوب</h2>
          <form action={createCaptain} className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input name="name" required minLength={2} placeholder="اسم المندوب" className="rounded border px-3 py-2" />
            <input name="phone" required placeholder="رقم الهاتف" className="rounded border px-3 py-2" dir="ltr" />
            <select name="status" defaultValue="AVAILABLE" className="rounded border px-3 py-2">
              <option value="AVAILABLE">متاح</option>
              <option value="BUSY">مشغول</option>
              <option value="OFFLINE">غير متاح</option>
            </select>
            <input name="notes" placeholder="ملاحظات" className="rounded border px-3 py-2" />
            <input type="hidden" name="isActive" value="true" />
            <button className="rounded bg-[#3F4B32] px-5 py-2 font-bold text-white">حفظ المندوب</button>
          </form>
        </section>

        <section className="space-y-4">
          {captains.map((captain) => {
            const earned = captain.assignments.reduce((sum, assignment) => sum + assignment.captainEarning, 0);
            const paid = captain.settlements.reduce((sum, settlement) => sum + settlement.amount, 0);
            return (
              <article key={captain.id} className="overflow-hidden rounded-lg border bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                  <div>
                    <h2 className="font-bold">{captain.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500" dir="ltr">{captain.phone}</p>
                  </div>
                  <div className="text-sm text-zinc-600">
                    <p>{captain.isActive ? 'فعال' : 'معطل'} · {captain.status}</p>
                    <p>المستحق: {filsToDisplay(earned)} · المدفوع: {filsToDisplay(paid)}</p>
                  </div>
                </div>

                <details className="border-b p-4">
                  <summary className="cursor-pointer font-bold">تعديل بيانات المندوب</summary>
                  <form action={updateCaptain.bind(null, captain.id)} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <input name="name" required minLength={2} defaultValue={captain.name} className="rounded border px-3 py-2" />
                    <input name="phone" required defaultValue={captain.phone} className="rounded border px-3 py-2" dir="ltr" />
                    <select name="status" defaultValue={captain.status} className="rounded border px-3 py-2">
                      <option value="AVAILABLE">متاح</option>
                      <option value="BUSY">مشغول</option>
                      <option value="OFFLINE">غير متاح</option>
                    </select>
                    <select name="isActive" defaultValue={String(captain.isActive)} className="rounded border px-3 py-2">
                      <option value="true">فعال</option>
                      <option value="false">معطل</option>
                    </select>
                    <input name="notes" defaultValue={captain.notes || ''} placeholder="ملاحظات" className="rounded border px-3 py-2" />
                    <button className="justify-self-start rounded bg-zinc-900 px-4 py-2 text-white">حفظ التعديل</button>
                  </form>
                </details>

                <div className="p-4">
                  <h3 className="mb-3 text-sm font-bold">آخر التوصيلات</h3>
                  <div className="space-y-2">
                    {captain.assignments.map((assignment) => (
                      <div key={assignment.id} className="flex flex-wrap justify-between gap-2 rounded bg-zinc-50 p-3 text-sm">
                        <Link href={`/admin/orders/${assignment.order.id}`} className="font-bold underline">
                          {assignment.order.reference} · {assignment.order.customerName}
                        </Link>
                        <span>{assignment.status} · {filsToDisplay(assignment.captainEarning)}</span>
                      </div>
                    ))}
                    {captain.assignments.length === 0 && <p className="text-sm text-zinc-500">لا توجد توصيلات مسندة.</p>}
                  </div>
                </div>
              </article>
            );
          })}
          {captains.length === 0 && <p className="rounded-lg border bg-white p-8 text-center text-zinc-500">لا يوجد مندوبون بعد.</p>}
        </section>
      </main>
    </div>
  );
}
