'use client';

import { useState } from 'react';
import { ShippingZoneForm } from './ShippingZoneForm';
import { deleteShippingZone } from '@/actions/shipping-zones';

type Zone = {
  id: string;
  nameAr: string;
  nameEn: string;
  fee: number;
  actualDeliveryCost: number | null;
  captainEarning: number | null;
  estimatedDeliveryTime: string;
  isEnabled: boolean;
  freeShippingThreshold: number | null;
};

export default function ShippingZonesClient({ initialZones }: { initialZones: Zone[] }) {
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-emerald-950">مناطق وتكاليف التوصيل وهامش ربح المنصة</h1>
          <p className="text-xs text-zinc-500 mt-1">
            إدارة تسعير الشحن للزبائن وأجور شركات التوصيل وحساب أرباح المنصة الصافية من كل طلب.
          </p>
        </div>
        {!isAdding && !editingZone && (
          <button 
            onClick={() => setIsAdding(true)}
            className="rounded-xl bg-zinc-900 hover:bg-zinc-800 px-4 py-2 text-white font-bold text-xs transition"
          >
            + إضافة منطقة
          </button>
        )}
      </div>

      {/* Info Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🚚</span>
            <strong className="font-bold text-sm">سياسة تسعير التوصيل المعتمدة:</strong>
          </div>
          <p className="text-emerald-900 leading-relaxed">
            يدفع العميل بشكل افتراضي <strong>3.00 د.أ</strong>، وتدفع المنصة لشركة التوصيل <strong>2.00 د.أ</strong>، والفرق <strong>(1.00 د.أ)</strong> هو ربح خالص للمنصة يسجل في جرد الأرباح، ولا علاقة للمحلات به، كما يُحجب هذا الفارق بالكامل عن شركة التوصيل.
          </p>
        </div>
      </div>

      {(isAdding || editingZone) && (
        <ShippingZoneForm 
          zone={editingZone} 
          onClose={() => { setIsAdding(false); setEditingZone(null); }} 
        />
      )}

      {!isAdding && !editingZone && (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-x-auto w-full shadow-sm">
          <table className="w-full text-xs text-right">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-bold">
              <tr>
                <th className="px-4 py-3">المنطقة</th>
                <th className="px-4 py-3">سعر الزبون (تحصيل)</th>
                <th className="px-4 py-3">أجرة شركة التوصيل</th>
                <th className="px-4 py-3">ربح المنصة (الصافي)</th>
                <th className="px-4 py-3">الشحن المجاني</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {initialZones.map(zone => {
                const carrierCost = zone.actualDeliveryCost ?? 2000;
                const margin = zone.fee - carrierCost;
                return (
                  <tr key={zone.id} className="hover:bg-zinc-50/70 transition">
                    <td className="px-4 py-3">
                      <p className="font-bold text-zinc-900 text-sm">{zone.nameAr}</p>
                      <p className="text-[11px] text-zinc-400 font-mono">{zone.nameEn} ({zone.estimatedDeliveryTime})</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-zinc-900 text-sm" dir="ltr">{(zone.fee / 1000).toFixed(2)} د.أ</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-zinc-600 text-sm" dir="ltr">{(carrierCost / 1000).toFixed(2)} د.أ</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                        margin > 0
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                          : 'bg-zinc-100 text-zinc-600'
                      }`} dir="ltr">
                        +{(margin / 1000).toFixed(2)} د.أ
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600 font-mono">
                      {zone.freeShippingThreshold ? `عند ${(zone.freeShippingThreshold / 1000).toFixed(2)} د.أ` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {zone.isEnabled 
                        ? <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">مفعل</span>
                        : <span className="inline-block rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-bold text-zinc-600">معطل</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => setEditingZone(zone)} className="text-zinc-900 hover:text-emerald-800 text-xs font-bold underline">تعديل</button>
                        <button onClick={async () => {
                          if (confirm('هل أنت متأكد من حذف هذه المنطقة؟')) {
                            await deleteShippingZone(zone.id);
                          }
                        }} className="text-rose-600 hover:text-rose-800 text-xs font-bold underline">حذف</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {initialZones.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                    لا توجد مناطق توصيل مضافة حالياً.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
