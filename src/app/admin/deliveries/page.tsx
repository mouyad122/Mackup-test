import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { reassignCaptain } from '@/actions/operations';
import { initializeShippingZones, updateShippingZone, updateAllShippingZonesAction } from '@/actions/shipping';
import { Truck, DollarSign, ShieldAlert, CheckCircle2, ArrowUpDown, Sparkles, Building2 } from 'lucide-react';

export default async function DeliveriesPage() {
  const session = await requirePermission('manage:settings');
  
  await initializeShippingZones();

  const [assignments, captains, zones] = await Promise.all([
    prisma.deliveryAssignment.findMany({
      include: { order: true, captain: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    }),
    prisma.captain.findMany({
      where: { isActive: true, status: 'AVAILABLE' },
      orderBy: { name: 'asc' },
    }),
    prisma.shippingZone.findMany({
      orderBy: { nameAr: 'asc' },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row font-sans" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      
      <main className="min-w-0 max-w-full w-full flex-1 space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-2xl bg-[#2d3623] text-white flex items-center justify-center shadow-xs">
                <Truck className="w-5 h-5 text-amber-300" />
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-stone-900 tracking-tight">
                إدارة التوصيل وأرباح المنصة
              </h1>
            </div>
            <p className="mt-1 text-xs md:text-sm text-stone-600 font-medium">
              ضبط رسوم التوصيل على الزبائن وسعر التكلفة لشركة التوصيل ومطابقة ربح المنصة (فارق 1.00 د.أ لكل طلب).
            </p>
          </div>

          {/* Quick Bulk Setup Button */}
          <form
            action={async () => {
              'use server';
              await updateAllShippingZonesAction(3.0, 2.0);
            }}
          >
            <button
              type="submit"
              className="rounded-2xl bg-[#2d3623] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#3F4832] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>تطبيق التسعيرة القياسية (3د زبائن / 2د تكلفة) لكافة المحافظات</span>
            </button>
          </form>
        </header>

        {/* ── Platform Delivery Margin Overview Cards ── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Customer Delivery Fee */}
          <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500">رسوم التوصيل على الزبائن (سعر البيع)</span>
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-800 flex items-center justify-center text-xs font-bold">1</span>
            </div>
            <strong className="text-2xl md:text-3xl font-black text-stone-900 font-mono block">
              3.000 د.أ
            </strong>
            <p className="text-[11px] text-stone-500 font-medium">
              القيمة الافتراضية المضافة إلى فاتورة الزبونة عند الشراء.
            </p>
          </article>

          {/* 2. Delivery Cost */}
          <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-500">سعر التكلفة لشركة التوصيل</span>
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center text-xs font-bold">2</span>
            </div>
            <strong className="text-2xl md:text-3xl font-black text-stone-900 font-mono block">
              2.000 د.أ
            </strong>
            <p className="text-[11px] text-stone-500 font-medium">
              أجرة التوصيل المستحقة لشركة التوصيل عن كل طلب ناجح التسليم.
            </p>
          </article>

          {/* 3. Platform Profit Margin */}
          <article className="rounded-3xl border border-emerald-300 bg-emerald-50/70 p-5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900">صافي ربح المنصة من التوصيل</span>
              <span className="rounded-full bg-emerald-200 text-emerald-900 px-2 py-0.5 text-[10px] font-bold">حساب المنصة حصراً</span>
            </div>
            <strong className="text-2xl md:text-3xl font-black text-emerald-950 font-mono block">
              +1.000 د.أ
            </strong>
            <p className="text-[11px] text-emerald-900 font-medium">
              ربح خالص لرَواق فقط • لا علاقة للمحل به • مخفي تماماً عن شركة التوصيل.
            </p>
          </article>
        </section>

        {/* Informative Security & Accounting Policy Note */}
        <section className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 text-xs text-stone-700 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-bold text-stone-900 block">
              قواعد الخصوصية والمحاسبة لأجور التوصيل:
            </strong>
            <p className="leading-relaxed">
              تلتزم كشوفات وتقارير شركة التوصيل بإظهار سعر التكلفة المتفق عليه (2.000 د.أ) فقط دون إبراز فارق الربح المحصل من الزبائن. كما أن تسويات المحلات التجارية مستثناة بالكامل من أجور التوصيل حيث تؤول عائدات وفروقات التوصيل إلى حساب رَواق مباشرة.
            </p>
          </div>
        </section>

        {/* ── Shipping Zones Pricing Management Table ── */}
        <section className="bg-white rounded-3xl shadow-xs border border-stone-200 overflow-hidden">
          <div className="bg-stone-50/80 p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-stone-900">
                تسعيرة المحافظات وفوارق الأرباح
              </h2>
              <p className="text-stone-500 text-xs mt-0.5">
                تعديل رسوم التوصيل على الزبائن وتكلفة شركة التوصيل لكل محافظة على حدة.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-stone-500 bg-white px-3 py-1 rounded-full border border-stone-200 w-fit">
              إجمالي المحافظات: {zones.length}
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-100/70 text-stone-600 border-b border-stone-200 font-bold">
                <tr>
                  <th className="px-5 py-3.5">المحافظة</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5">رسوم الزبونة (سعر البيع)</th>
                  <th className="px-5 py-3.5">تكلفة شركة التوصيل</th>
                  <th className="px-5 py-3.5 text-emerald-900">ربح المنصة</th>
                  <th className="px-5 py-3.5">تحديث الرسوم والتكلفة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {zones.map((zone) => {
                  const feeJD = (zone.fee / 1000).toFixed(3);
                  const costJD = ((zone.actualDeliveryCost ?? 2000) / 1000).toFixed(3);
                  const marginFils = Math.max(0, zone.fee - (zone.actualDeliveryCost ?? 2000));
                  const marginJD = (marginFils / 1000).toFixed(3);

                  return (
                    <tr key={zone.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-black text-stone-900 text-sm block">{zone.nameAr}</span>
                        <span className="text-[11px] text-stone-400 font-mono block">{zone.nameEn}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            zone.isEnabled
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-stone-100 text-stone-500 border-stone-200'
                          }`}
                        >
                          {zone.isEnabled ? 'مفعلة' : 'معطلة'}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 font-bold font-mono text-stone-900 text-sm">
                        {filsToDisplay(zone.fee, 'ar')}
                      </td>

                      <td className="px-5 py-3.5 font-bold font-mono text-stone-700 text-sm">
                        {filsToDisplay(zone.actualDeliveryCost ?? 2000, 'ar')}
                      </td>

                      <td className="px-5 py-3.5 font-black font-mono text-emerald-800 text-sm">
                        +{marginJD} د.أ
                      </td>

                      <td className="px-5 py-3.5">
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            const customerFeeJD = parseFloat(formData.get('fee') as string);
                            const carrierCostJD = parseFloat(formData.get('actualDeliveryCost') as string);
                            const isEnabled = formData.get('isEnabled') === 'on';
                            const time = (formData.get('estimatedDeliveryTime') as string) || '2-3 أيام';

                            if (!Number.isFinite(customerFeeJD) || !Number.isFinite(carrierCostJD)) return;

                            await updateShippingZone(zone.id, {
                              fee: Math.round(customerFeeJD * 1000),
                              actualDeliveryCost: Math.round(carrierCostJD * 1000),
                              captainEarning: Math.round(carrierCostJD * 1000),
                              isEnabled,
                              estimatedDeliveryTime: time,
                            });
                          }}
                          className="flex flex-wrap items-center gap-2.5"
                        >
                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-stone-400 font-bold">رسوم الزبونة</label>
                            <input
                              type="number"
                              name="fee"
                              min="0"
                              step="0.001"
                              defaultValue={feeJD}
                              className="w-20 border border-stone-300 bg-stone-50 rounded-xl px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-[#2d3623] focus:bg-white"
                            />
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <label className="text-[10px] text-stone-400 font-bold">تكلفة الشركة</label>
                            <input
                              type="number"
                              name="actualDeliveryCost"
                              min="0"
                              step="0.001"
                              defaultValue={costJD}
                              className="w-20 border border-stone-300 bg-stone-50 rounded-xl px-2.5 py-1 text-xs font-mono font-bold outline-none focus:border-[#2d3623] focus:bg-white"
                            />
                          </div>

                          <label className="flex items-center gap-1 text-[11px] font-bold text-stone-600 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name="isEnabled"
                              defaultChecked={zone.isEnabled}
                              className="rounded accent-[#2d3623]"
                            />
                            تفعيل
                          </label>

                          <button
                            type="submit"
                            className="bg-[#2d3623] hover:bg-[#3F4832] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs mt-3 cursor-pointer"
                          >
                            حفظ
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Existing Deliveries & Assignments ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="text-lg font-black text-stone-900">سجل التوصيلات الميدانية الحالية</h2>
              <p className="text-xs text-stone-500">تتبع المهام وحساب فوارق رسوم التوصيل وهوامش أرباح المنصة.</p>
            </div>
            <span className="font-mono text-xs font-bold text-stone-600 bg-white px-3 py-1 rounded-full border border-stone-200">
              {assignments.length} توصيلة
            </span>
          </div>

          <div className="space-y-3">
            {assignments.map((a) => {
              const customerFee = a.customerDeliveryFee || a.order.shippingCost || 3000;
              const carrierCost = a.actualCarrierCost ?? a.order.actualDeliveryCost ?? 2000;
              const platformMargin = Math.max(0, customerFee - carrierCost);

              return (
                <article
                  key={a.id}
                  className="rounded-3xl border border-stone-200 bg-white p-4 sm:p-5 transition shadow-xs hover:shadow-sm"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm font-black text-stone-900 font-mono">
                          {a.order.reference}
                        </strong>
                        <span className="text-xs text-stone-500">•</span>
                        <span className="text-xs font-bold text-stone-700">
                          {a.order.customerName}
                        </span>
                        <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-700 border border-stone-200">
                          {a.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">المحافظة</span>
                          <strong className="text-stone-800 font-bold">
                            {a.order.shippingZoneNameSnapshot || 'عمان'}
                          </strong>
                        </div>

                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">رسوم العميل</span>
                          <strong className="text-stone-900 font-mono font-bold">
                            {filsToDisplay(customerFee)}
                          </strong>
                        </div>

                        <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200">
                          <span className="text-stone-400 block text-[10px]">تكلفة الناقل</span>
                          <strong className="text-stone-700 font-mono font-bold">
                            {filsToDisplay(carrierCost)}
                          </strong>
                        </div>

                        <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                          <span className="text-emerald-800 block text-[10px] font-bold">ربح المنصة</span>
                          <strong className="text-emerald-950 font-mono font-black">
                            +{filsToDisplay(platformMargin)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-500 font-medium pt-1">
                        <span>المندوب: <strong className="text-stone-800">{a.captain.name}</strong></span>
                        <span>أجر المندوب: <strong className="font-mono text-stone-800">{filsToDisplay(a.captainEarning)}</strong></span>
                        <span>أُنشئ: <strong className="font-mono text-stone-700">{new Date(a.createdAt).toLocaleString('en-GB')}</strong></span>
                        {a.deliveredAt && (
                          <span>سُلّم: <strong className="font-mono text-emerald-800">{new Date(a.deliveredAt).toLocaleString('en-GB')}</strong></span>
                        )}
                      </div>
                    </div>

                    {!['DELIVERED', 'CANCELLED'].includes(a.status) && captains.length > 0 && (
                      <form
                        action={async (fd: FormData) => {
                          'use server';
                          const id = String(fd.get('captainId'));
                          await reassignCaptain(a.id, id);
                        }}
                        className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100"
                      >
                        <select
                          name="captainId"
                          required
                          className="rounded-xl border border-stone-300 p-2 text-xs bg-white focus:border-[#2d3623] focus:outline-none"
                        >
                          {captains.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-black transition-colors"
                        >
                          إعادة التعيين
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}

            {assignments.length === 0 && (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500">
                لا توجد توصيلات ميدانية مسجلة حالياً.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
