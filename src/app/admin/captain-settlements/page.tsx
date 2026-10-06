import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { settleCaptain } from '@/actions/operations';

export default async function CaptainSettlementsPage() {
  const session = await requirePermission('manage:settings');
  const captains = await prisma.captain.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  const settlements = await prisma.captainSettlement.findMany({ include: { captain: true }, orderBy: { createdAt: 'desc' }, take: 200 });
  const balances = await Promise.all(captains.map(async captain => {
    const [earnings, payments] = await Promise.all([
      prisma.financialTransaction.aggregate({ where: { captainId: captain.id, type: 'CAPTAIN_EARNING' }, _sum: { amount: true } }),
      prisma.financialTransaction.aggregate({ where: { captainId: captain.id, type: 'CAPTAIN_PAYMENT' }, _sum: { amount: true } }),
    ]);
    return { captain, earned: earnings._sum.amount ?? 0, paid: payments._sum.amount ?? 0 };
  }));
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} /><main className="w-full flex-1 space-y-6 p-4 md:p-8"><header><h1 className="text-3xl font-bold">تسويات المندوبين</h1></header>
    <div className="grid gap-4 lg:grid-cols-2">{balances.map(({captain,earned,paid})=><article key={captain.id} className="space-y-3 rounded-lg border bg-white p-5"><div className="flex justify-between"><h2 className="font-bold">{captain.name}</h2><span>المتبقي: {filsToDisplay(earned-paid)}</span></div><p className="text-sm text-zinc-600">المكتسب {filsToDisplay(earned)} · المدفوع {filsToDisplay(paid)}</p><form action={settleCaptain.bind(null,captain.id)} className="grid gap-2 sm:grid-cols-2"><input type="hidden" name="idempotencyKey" value={crypto.randomUUID()}/><input name="amount" type="number" min="0.001" step="0.001" required placeholder="المبلغ د.أ" className="rounded border px-3 py-2"/><select name="paymentMethod" className="rounded border px-3 py-2"><option value="CASH">نقداً</option><option value="BANK_TRANSFER">تحويل بنكي</option><option value="CARD">بطاقة</option><option value="OTHER">أخرى</option></select><input name="reference" placeholder="مرجع" className="rounded border px-3 py-2"/><input name="notes" placeholder="ملاحظة" className="rounded border px-3 py-2"/><button className="rounded bg-zinc-900 px-4 py-2 text-white sm:col-span-2">تسجيل دفعة</button></form></article>)}</div>
    <section className="overflow-x-auto rounded-lg border bg-white"><h2 className="p-4 font-bold">سجل التسويات</h2><table className="w-full min-w-[650px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">المندوب</th><th className="p-3">المبلغ</th><th className="p-3">طريقة الدفع</th><th className="p-3">المرجع / الملاحظة</th><th className="p-3">التاريخ</th></tr></thead><tbody className="divide-y">{settlements.map(s=><tr key={s.id}><td className="p-3">{s.captain.name}</td><td className="p-3">{filsToDisplay(s.amount)}</td><td className="p-3">{s.paymentMethod}</td><td className="p-3">{s.reference||s.notes||'—'}</td><td className="p-3">{new Date(s.createdAt).toLocaleString('ar-JO')}</td></tr>)}</tbody></table></section>
  </main></div>;
}
