import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { createExpense } from '@/actions/operations';

export default async function ExpensesPage() {
  const session = await requirePermission('manage:settings');
  const [expenses, totalRow, employees] = await Promise.all([prisma.expense.findMany({ orderBy: { expenseDate: 'desc' }, take: 500 }), prisma.expense.aggregate({ _sum: { amount: true }, _count: true }), prisma.employee.findMany({ select: { id: true, name: true } })]);
  const employeeNames = new Map(employees.map(e=>[e.id,e.name]));
  const total = totalRow._sum.amount ?? 0;
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} /><main className="w-full flex-1 space-y-6 p-4 md:p-8"><header><h1 className="text-3xl font-bold">المصروفات</h1><p className="mt-1 text-sm text-zinc-600">إجمالي {totalRow._count} مصروف مسجل: {filsToDisplay(total)}</p></header>
    <form action={createExpense} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-3"><select name="category" className="rounded border px-3 py-2"><option value="MARKETING">تسويق</option><option value="PACKAGING">تغليف</option><option value="SOFTWARE">برمجيات</option><option value="SALARIES">رواتب</option><option value="OPERATIONS">عمليات</option><option value="MISC">متفرقات</option><option value="OTHER">أخرى</option></select><input name="amount" type="number" min="0.001" step="0.001" required placeholder="المبلغ د.أ" className="rounded border px-3 py-2"/><input name="expenseDate" type="date" className="rounded border px-3 py-2"/><input name="description" required minLength={2} placeholder="الوصف" className="rounded border px-3 py-2"/><input name="reference" placeholder="المرجع" className="rounded border px-3 py-2"/><button className="rounded bg-zinc-900 px-4 py-2 text-white">تسجيل المصروف</button></form>
    <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full min-w-[750px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">التاريخ</th><th className="p-3">الفئة</th><th className="p-3">الوصف</th><th className="p-3">المرجع</th><th className="p-3">المبلغ</th><th className="p-3">أنشأه</th></tr></thead><tbody className="divide-y">{expenses.map(e=><tr key={e.id}><td className="p-3">{new Date(e.expenseDate).toLocaleDateString('en-GB')}</td><td className="p-3">{e.category}</td><td className="p-3">{e.description}</td><td className="p-3">{e.reference||'—'}</td><td className="p-3">{filsToDisplay(e.amount)}</td><td className="p-3">{e.createdByEmployeeId?employeeNames.get(e.createdByEmployeeId)||'—':'النظام'}</td></tr>)}</tbody></table></div>
  </main></div>;
}
