import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { saveCoupon, toggleCoupon } from '@/actions/marketing';

export default async function CouponsAdminPage() {
  const session = await requirePermission('manage:settings');
  const [coupons, products, categories, brands] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' }, include: { targets: true } }),
    prisma.product.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
  ]);
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} /><main className="w-full flex-1 space-y-6 p-4 md:p-8">
    <header><h1 className="text-3xl font-bold">القسائم والخصومات</h1><p className="mt-1 text-sm text-zinc-600">تُتحقق القسائم من الخادم وتُحفظ لقطتها مع الطلب.</p></header>
    <form action={saveCoupon} className="grid gap-3 rounded-lg border bg-white p-5 md:grid-cols-3">
      <input name="code" required placeholder="رمز القسيمة" className="rounded border px-3 py-2 uppercase" /><input name="name" placeholder="اسم داخلي" className="rounded border px-3 py-2" />
      <select name="discountType" className="rounded border px-3 py-2"><option value="PERCENT">نسبة خصم</option><option value="FIXED">خصم ثابت</option><option value="FREE_DELIVERY">توصيل مجاني</option></select>
      <label className="grid gap-1 text-xs">قيمة الخصم (% أو د.أ)<input name="discountValue" type="number" min="0" step="0.001" defaultValue="0" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">الحد الأدنى (د.أ)<input name="minimumOrderAmount" type="number" min="0" step="0.001" defaultValue="0" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">أقصى خصم (د.أ)<input name="maximumDiscount" type="number" min="0" step="0.001" placeholder="بدون حد" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">حد الاستخدام العام<input name="usageLimit" type="number" min="1" placeholder="غير محدود" className="rounded border px-3 py-2 text-sm" /></label>
      <label className="grid gap-1 text-xs">لكل عميل<input name="perCustomerLimit" type="number" min="1" placeholder="غير محدود" className="rounded border px-3 py-2 text-sm" /></label>
      <div className="flex gap-2"><input name="startsAt" type="date" className="min-w-0 rounded border px-2 py-2" /><input name="endsAt" type="date" className="min-w-0 rounded border px-2 py-2" /></div>
      <label className="grid gap-1 text-xs">منتجات (اختياري، اختر منتجات لتقييد القسيمة)<select name="productIds" multiple className="h-24 rounded border px-2">{products.map(p => <option key={p.id} value={p.id}>{p.nameAr}</option>)}</select></label>
      <label className="grid gap-1 text-xs">فئات<select name="categoryIds" multiple className="h-24 rounded border px-2">{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs">علامات تجارية<select name="brandIds" multiple className="h-24 rounded border px-2">{brands.map(b => <option key={b.id} value={b.id}>{b.nameAr}</option>)}</select></label>
      <p className="text-xs text-zinc-500 md:col-span-3">للتقييد بأكثر من معيار استخدم Ctrl/Cmd للاختيار؛ القسيمة تنطبق عند مطابقة أحد الأهداف المحددة.</p>
      <button className="rounded bg-[var(--color-charcoal-900)] px-5 py-2 font-bold text-white md:col-span-3 md:justify-self-start">إنشاء قسيمة</button>
    </form>
    <div className="overflow-x-auto rounded-lg border bg-white"><table className="w-full min-w-[1180px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">الرمز</th><th className="p-3">النوع والقيمة</th><th className="p-3">الحد الأدنى</th><th className="p-3">أقصى خصم</th><th className="p-3">الاستخدام العام</th><th className="p-3">لكل عميل</th><th className="p-3">البداية</th><th className="p-3">الانتهاء</th><th className="p-3">الأهداف</th><th className="p-3">الحالة</th></tr></thead><tbody className="divide-y">{coupons.map(coupon => <tr key={coupon.id}><td className="p-3 font-mono font-bold">{coupon.code}</td><td className="p-3">{coupon.discountType === 'FIXED' ? filsToDisplay(coupon.discountValue) : coupon.discountType === 'PERCENT' ? `${coupon.discountValue}%` : 'توصيل مجاني'}</td><td className="p-3">{filsToDisplay(coupon.minimumOrderAmount)}</td><td className="p-3">{coupon.maximumDiscount===null?'—':filsToDisplay(coupon.maximumDiscount)}</td><td className="p-3">{coupon.usageCount}{coupon.usageLimit === null ? ' / بلا حد' : ` / ${coupon.usageLimit}`}</td><td className="p-3">{coupon.perCustomerLimit??'بلا حد'}</td><td className="p-3">{coupon.startsAt?.toLocaleDateString('ar-JO')||'فوراً'}</td><td className="p-3">{coupon.endsAt?.toLocaleDateString('ar-JO')||'بلا انتهاء'}</td><td className="p-3">{coupon.targets.length || 'كل السلة'}</td><td className="p-3"><form action={toggleCoupon.bind(null, coupon.id, !coupon.isActive)}><button className="underline">{coupon.isActive ? 'فعال · إيقاف' : 'متوقف · تفعيل'}</button></form></td></tr>)}</tbody></table></div>
  </main></div>;
}
