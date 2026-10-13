import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { settleCaptain } from '@/actions/operations';
import { randomUUID } from 'crypto';
import { DeleteSettlement } from './DeleteSettlement';

export default async function CaptainSettlementsPage() {
  const session = await requirePermission('manage:settings');
  
  const [captains, settlements, allTransactions] = await Promise.all([
    prisma.captain.findMany({ 
      where: { isActive: true },
      orderBy: { name: 'asc' } 
    }),
    prisma.captainSettlement.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { captain: { select: { name: true } } }
    }),
    prisma.financialTransaction.findMany({
      where: { type: { in: ['CAPTAIN_EARNING', 'CAPTAIN_PAYMENT'] } },
      select: { captainId: true, type: true, amount: true }
    })
  ]);

  const captainsWithBalances = captains.map(c => {
    let earned = 0;
    let paid = 0;
    const txs = allTransactions.filter(tx => tx.captainId === c.id);
    for (const tx of txs) {
      if (tx.type === 'CAPTAIN_EARNING') earned += tx.amount;
      if (tx.type === 'CAPTAIN_PAYMENT') paid += tx.amount;
    }
    return { ...c, balance: earned - paid };
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">تسويات المندوبين</h1>
          <p className="mt-1 text-sm text-zinc-600">إدارة الدفعات المالية والتسويات لشركات التوصيل والمندوبين.</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Settlement */}
          <section className="rounded-lg border bg-white p-5">
            <h2 className="font-bold text-xl mb-4">إنشاء دفعة جديدة</h2>
            <form action={async (formData) => {
              'use server';
              const captainId = formData.get('captainId') as string;
              if (captainId) {
                await settleCaptain(captainId, formData);
              }
            }} className="space-y-4">
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              
              <div>
                <label className="block text-sm font-medium mb-1">المندوب / شركة التوصيل</label>
                <select name="captainId" required className="w-full rounded border p-2">
                  <option value="">-- اختر المندوب --</option>
                  {captainsWithBalances.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (المستحق: {filsToDisplay(c.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">المبلغ (دينار)</label>
                <input type="number" name="amount" min="0.001" step="0.001" required className="w-full rounded border p-2" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">طريقة الدفع</label>
                <select name="paymentMethod" required className="w-full rounded border p-2">
                  <option value="CASH">نقدي</option>
                  <option value="BANK_TRANSFER">حوالة بنكية / كليك</option>
                  <option value="OTHER">أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات / رقم الحوالة (اختياري)</label>
                <input type="text" name="notes" className="w-full rounded border p-2" />
              </div>

              <button type="submit" className="w-full rounded bg-zinc-900 px-4 py-2 text-white font-bold hover:bg-zinc-800">
                تسجيل الدفعة
              </button>
            </form>
          </section>

          {/* History */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold">سجل الدفعات السابقة</h2>
            <div className="space-y-3">
              {settlements.map(s => (
                <article key={s.id} className="grid gap-2 rounded-lg border bg-white p-4 text-sm">
                  <div className="flex justify-between font-bold">
                    <span>{s.captain.name}</span>
                    <span className="text-green-700">{filsToDisplay(s.amount)}</span>
                  </div>
                  <div className="text-zinc-600 grid grid-cols-2 gap-1 text-xs">
                    <span>تاريخ الدفع: {new Date(s.createdAt).toLocaleString('en-GB')}</span>
                    <span>طريقة الدفع: {s.paymentMethod}</span>
                    {s.notes && <span className="col-span-2 text-zinc-500">ملاحظات: {s.notes}</span>}
                  </div>
                  <div className="mt-2 text-left border-t pt-2">
                    <DeleteSettlement id={s.id} />
                  </div>
                </article>
              ))}
              {settlements.length === 0 && <p className="text-zinc-500 text-sm">لا يوجد سجل دفعات.</p>}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
