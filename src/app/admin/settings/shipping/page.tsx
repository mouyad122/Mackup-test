import React from 'react';
import { prisma } from '@/lib/db';
import { requireAuth, requirePermission } from '@/lib/dal';
import { initializeShippingZones, updateShippingZone } from '@/actions/shipping';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';

export default async function AdminShippingPage() {
  const session = await requireAuth();
  await requirePermission('manage:settings');
  await requirePermission('manage:settings');

  // Auto-initialize if empty
  const count = await prisma.shippingZone.count();
  if (count === 0) {
    await initializeShippingZones();
  }

  const zones = await prisma.shippingZone.findMany({
    orderBy: { nameAr: 'asc' }
  });

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[var(--color-ivory-100)] overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 font-sans w-full max-w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 font-heading">أسعار التوصيل حسب المنطقة</h1>
          <p className="text-zinc-500 mt-1">إدارة رسوم التوصيل لمحافظات الأردن</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto w-full max-w-[90vw] md:max-w-full pb-4"><table className="w-full text-right text-sm">
          <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 font-bold">المحافظة</th>
              <th className="px-6 py-4 font-bold">الحالة</th>
              <th className="px-6 py-4 font-bold">رسوم التوصيل (الحالية)</th>
              <th className="px-6 py-4 font-bold">تكلفة شركة التوصيل</th>
              <th className="px-6 py-4 font-bold">تكلفة المندوب</th>
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
                <td className="px-6 py-4 font-bold text-[var(--color-charcoal-900)]">
                  {filsToDisplay(zone.fee, 'ar')}
                </td>
                <td className="px-6 py-4 font-bold text-zinc-700">
                  {zone.actualDeliveryCost === null ? 'غير محددة' : filsToDisplay(zone.actualDeliveryCost, 'ar')}
                </td>
                <td className="px-6 py-4 font-bold text-zinc-700">
                  {zone.captainEarning === null ? 'غير محدد' : filsToDisplay(zone.captainEarning, 'ar')}
                </td>
                <td className="px-6 py-4">
                  <form action={async (formData: FormData) => {
                    'use server';
                    const feeJD = parseFloat(formData.get('fee') as string);
                    const actualCostJD = parseFloat(formData.get('actualDeliveryCost') as string);
                    const captainEarningJD = parseFloat(formData.get('captainEarning') as string);
                    const isEnabled = formData.get('isEnabled') === 'on';
                    const estimatedDeliveryTime = String(formData.get('estimatedDeliveryTime') || '').trim();
                    if (!Number.isFinite(feeJD) || !Number.isFinite(actualCostJD) || !Number.isFinite(captainEarningJD)) return;
                    await updateShippingZone(zone.id, {
                      fee: Math.round(feeJD * 1000),
                      actualDeliveryCost: Math.round(actualCostJD * 1000),
                      captainEarning: Math.round(captainEarningJD * 1000),
                      isEnabled,
                      estimatedDeliveryTime,
                    });
                  }} className="flex items-center gap-3">
                    <input 
                      type="number" 
                      name="fee" 
                      min="0"
                      step="0.001"
                      defaultValue={(zone.fee / 1000).toFixed(2)} 
                      aria-label="رسوم العميل بالدينار"
                      className="w-24 border border-zinc-300 rounded px-2 py-1 outline-none focus:border-[var(--color-champagne-600)]"
                    />
                    <input
                      type="number"
                      name="actualDeliveryCost"
                      min="0"
                      step="0.001"
                      defaultValue={zone.actualDeliveryCost === null ? '' : (zone.actualDeliveryCost / 1000).toFixed(2)}
                      aria-label="تكلفة شركة التوصيل بالدينار"
                      className="w-24 border border-zinc-300 rounded px-2 py-1 outline-none focus:border-[var(--color-champagne-600)]"
                    />
                    <input
                      type="number"
                      name="captainEarning"
                      min="0"
                      step="0.001"
                      defaultValue={zone.captainEarning === null ? '' : (zone.captainEarning / 1000).toFixed(2)}
                      aria-label="أجر المندوب بالدينار"
                      className="w-24 border border-zinc-300 rounded px-2 py-1 outline-none focus:border-[var(--color-champagne-600)]"
                    />
                    <input type="text" name="estimatedDeliveryTime" defaultValue={zone.estimatedDeliveryTime} aria-label="مدة التوصيل" className="w-28 border border-zinc-300 rounded px-2 py-1" />
                    <label className="flex items-center gap-1 text-xs text-zinc-600">
                      <input type="checkbox" name="isEnabled" defaultChecked={zone.isEnabled} />
                      تفعيل
                    </label>
                    <button type="submit" className="bg-zinc-800 hover:bg-black text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                      حفظ
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
      </main>
    </div>
  );
}
