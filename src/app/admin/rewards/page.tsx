import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { saveRewardRule, toggleRewardRule } from '@/actions/marketing';

export default async function RewardsAdminPage() {
  const session = await requirePermission('manage:settings');
  const rules = await prisma.rewardRule.findMany({ orderBy: [{ priority: 'desc' }, { minimumAmount: 'asc' }] });
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} /><main className="w-full flex-1 space-y-6 p-4 md:p-8">
    <header><h1 className="text-3xl font-bold">مكافآت السلة</h1><p className="mt-1 text-sm text-zinc-600">تُطبق أعلى مكافأة مستوفاة تلقائياً على الطلب، وتحسب قيمتها على الخادم.</p></header>
    <form action={saveRewardRule} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-3">
      <input name="name" required placeholder="اسم المكافأة" className="rounded border px-3 py-2" />
      <label className="grid gap-1 text-xs">الحد الأدنى (د.أ)<input name="minimumAmount" type="number" min="0" step="0.001" required className="rounded border px-3 py-2 text-sm" /></label>
      <select name="rewardType" className="rounded border px-3 py-2"><option value="FREE_DELIVERY">توصيل مجاني</option><option value="PERCENT">نسبة خصم</option><option value="FIXED">خصم ثابت</option></select>
      <label className="grid gap-1 text-xs">قيمة المكافأة (% أو د.أ)<input name="rewardValue" type="number" min="0" step="0.001" defaultValue="0" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">حد الاستخدام<input name="usageLimit" type="number" min="1" placeholder="غير محدود" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">الأولوية<input name="priority" type="number" defaultValue="0" className="rounded border px-3 py-2 text-sm" /></label>
      <div className="flex gap-2"><input name="startsAt" type="date" className="min-w-0 rounded border px-2 py-2" /><input name="endsAt" type="date" className="min-w-0 rounded border px-2 py-2" /></div>
      <button className="rounded bg-[#3F4B32] px-5 py-2 font-bold text-white md:col-span-3 md:justify-self-start">إضافة مكافأة</button>
    </form>
    <div className="space-y-3">{rules.map(rule=><details key={rule.id} className="rounded-lg border bg-white p-4"><summary className="flex cursor-pointer list-none flex-wrap justify-between gap-2"><span className="font-bold">{rule.name} · {rule.rewardType} · أولوية {rule.priority}</span><span className="text-sm">حد {filsToDisplay(rule.minimumAmount)} · استخدام {rule.usageCount}{rule.usageLimit===null?'':` / ${rule.usageLimit}`} · {rule.isActive?'فعال':'متوقف'}</span></summary><form action={saveRewardRule} className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-3"><input type="hidden" name="id" value={rule.id}/><input name="name" required defaultValue={rule.name} className="rounded border p-2"/><label className="grid gap-1 text-xs">الحد الأدنى<input name="minimumAmount" type="number" step="0.001" defaultValue={(rule.minimumAmount/1000).toFixed(3)} className="rounded border p-2 text-sm"/></label><select name="rewardType" defaultValue={rule.rewardType} className="rounded border p-2"><option value="FREE_DELIVERY">توصيل مجاني</option><option value="PERCENT">نسبة خصم</option><option value="FIXED">خصم ثابت</option></select><label className="grid gap-1 text-xs">القيمة<input name="rewardValue" type="number" step="0.001" defaultValue={rule.rewardType==='FIXED'?(rule.rewardValue/1000).toFixed(3):rule.rewardValue} className="rounded border p-2 text-sm"/></label><label className="grid gap-1 text-xs">حد الاستخدام<input name="usageLimit" type="number" min="1" defaultValue={rule.usageLimit??''} className="rounded border p-2 text-sm"/></label><label className="grid gap-1 text-xs">الأولوية<input name="priority" type="number" defaultValue={rule.priority} className="rounded border p-2 text-sm"/></label><label className="grid gap-1 text-xs">يبدأ<input name="startsAt" type="date" defaultValue={rule.startsAt?.toISOString().slice(0,10)} className="rounded border p-2 text-sm"/></label><label className="grid gap-1 text-xs">ينتهي<input name="endsAt" type="date" defaultValue={rule.endsAt?.toISOString().slice(0,10)} className="rounded border p-2 text-sm"/></label><button className="rounded bg-zinc-900 p-2 text-white">حفظ التعديل</button><button formAction={toggleRewardRule.bind(null,rule.id,!rule.isActive)} className="rounded border p-2">{rule.isActive?'إيقاف':'تفعيل'}</button></form></details>)}</div>
  </main></div>;
}
