import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { reassignCaptain } from '@/actions/operations';
import { initializeShippingZones, updateShippingZone } from '@/actions/shipping';

export default async function DeliveriesPage() {
  const session = await requirePermission('manage:settings');
  
  await initializeShippingZones();

  const [assignments, captains, zones] = await Promise.all([
    prisma.deliveryAssignment.findMany({ include: { order: true, captain: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.captain.findMany({ where: { isActive: true, status: 'AVAILABLE' }, orderBy: { name: 'asc' } }),
    prisma.shippingZone.findMany({ orderBy: { nameAr: 'asc' } })
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/>
      <main className="w-full flex-1 space-y-8 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">إدارة التوصيلات والتسعير</h1>
          <p className="mt-1 text-sm text-zinc-600">تتبع التوصيلات الحالية وتعديل تسعيرة التوصيل للمحافظات.</p>
        </header>

        {/* Shipping Zones Management */}
        <section className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
          <div className="bg-zinc-50 p-4 border-b border-zinc-200">
            <h2 className="text-xl font-bold text-zinc-900 font-heading">أسعار التوصيل حسب المنطقة</h2>
            <p className="text-zinc-500 text-sm mt-1">تعديل تكلفة التوصيل، تكلفة الشركة، وأرباح المندوب لكل محافظة.</p>
          </div>
          <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4">
            <table className="w-full text-right text-sm">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 font-bold">المحافظة</th>
                  <th className="px-6 py-4 font-bold">الحالة</th>
                  <th className="px-6 py-4 font-bold">رسوم التوصيل والتكلفة</th>
                  <th className="px-6 py-4 font-bold">تحديث الرسوم والتكاليف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <span className="font-bold text-zinc-900">{zone.nameAr}</span>
                      <span className="text-xs text-zinc-500 block">{zone.nameEn}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${zone.isEnabled ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                        {zone.isEnabled ? 'فعال' : 'معطل'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-[#3F4832]">
                      {filsToDisplay(zone.fee, 'ar')}
                    </td>
                    <td className="px-6 py-4">
                      <form action={async (formData: FormData) => {
                        'use server';
                        const feeJD = parseFloat(formData.get('fee') as string);
                        const isEnabled = formData.get('isEnabled') === 'on';
                        if (!Number.isFinite(feeJD)) return;
                        await updateShippingZone(zone.id, {
                          fee: Math.round(feeJD * 1000),
                          actualDeliveryCost: Math.round(feeJD * 1000),
                          captainEarning: Math.round(feeJD * 1000),
                          isEnabled,
                          estimatedDeliveryTime: zone.estimatedDeliveryTime || '2-3 أيام',
                        });
                      }} className="flex items-center gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-zinc-500">رسوم التوصيل والتكلفة</label>
                          <input 
                            type="number" name="fee" min="0" step="0.001"
                            defaultValue={(zone.fee / 1000).toFixed(3)} 
                            className="w-24 border border-zinc-300 rounded px-2 py-1 outline-none focus:border-[var(--color-champagne-600)]"
                          />
                        </div>
                        <label className="flex items-center gap-1 text-xs text-zinc-600 mt-4">
                          <input type="checkbox" name="isEnabled" defaultChecked={zone.isEnabled} />
                          تفعيل
                        </label>
                        <button type="submit" className="bg-zinc-800 hover:bg-black text-white px-3 py-1 rounded text-xs font-bold transition-colors mt-4">
                          حفظ
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Existing Deliveries */}
        <section>
          <h2 className="text-xl font-bold mb-4">التوصيلات الميدانية الحالية</h2>
          <div className="space-y-3">
            {assignments.map(a => (
              <article key={a.id} className="grid gap-3 rounded-lg border bg-white p-4 lg:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <b>{a.order.reference} · {a.order.customerName}</b>
                    <span className="rounded bg-zinc-100 px-2 py-1 text-xs">{a.status}</span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm text-zinc-600 sm:grid-cols-2 lg:grid-cols-3">
                    <span>المحافظة: {a.order.shippingZoneNameSnapshot||'—'}</span>
                    <span>رسوم العميل: {filsToDisplay(a.customerDeliveryFee)}</span>
                    <span>تكلفة الناقل: {a.actualCarrierCost===null?'غير مسجلة':filsToDisplay(a.actualCarrierCost)}</span>
                    <span>المندوب: {a.captain.name}</span>
                    <span>أجر المندوب: {filsToDisplay(a.captainEarning)}</span>
                    <span>أُنشئ: {new Date(a.createdAt).toLocaleString('en-GB')}</span>
                    <span>سُلّم: {a.deliveredAt?new Date(a.deliveredAt).toLocaleString('en-GB'):'—'}</span>
                  </div>
                </div>
                {!['DELIVERED','CANCELLED'].includes(a.status) && captains.length > 0 && (
                  <form action={async (fd:FormData)=>{
                    'use server';
                    const id=String(fd.get('captainId'));
                    await reassignCaptain(a.id,id)
                  }} className="flex items-center gap-2">
                    <select name="captainId" required className="rounded border p-2 text-sm">
                      {captains.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">إعادة التعيين</button>
                  </form>
                )}
              </article>
            ))}
            {assignments.length===0 && <p className="rounded border bg-white p-8 text-center text-zinc-500">لا توجد توصيلات مسجلة.</p>}
          </div>
        </section>
      </main>
    </div>
  );
}
