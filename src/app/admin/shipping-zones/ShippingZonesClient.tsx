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
        <h1 className="text-3xl font-bold">مناطق التوصيل والتسعير</h1>
        {!isAdding && !editingZone && (
          <button 
            onClick={() => setIsAdding(true)}
            className="rounded bg-zinc-900 px-4 py-2 text-white font-bold"
          >
            + إضافة منطقة
          </button>
        )}
      </div>

      {(isAdding || editingZone) && (
        <ShippingZoneForm 
          zone={editingZone} 
          onClose={() => { setIsAdding(false); setEditingZone(null); }} 
        />
      )}

      {!isAdding && !editingZone && (
        <div className="rounded-lg border bg-white overflow-hidden shadow-sm">
          <table className="w-full text-sm text-right">
            <thead className="bg-zinc-50 border-b">
              <tr>
                <th className="px-4 py-3 font-bold text-zinc-900">المنطقة</th>
                <th className="px-4 py-3 font-bold text-zinc-900">رسوم التوصيل</th>
                <th className="px-4 py-3 font-bold text-zinc-900">الشحن المجاني</th>
                <th className="px-4 py-3 font-bold text-zinc-900">الحالة</th>
                <th className="px-4 py-3 font-bold text-zinc-900">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {initialZones.map(zone => (
                <tr key={zone.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <p className="font-bold">{zone.nameAr}</p>
                    <p className="text-xs text-zinc-500">{zone.nameEn}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-emerald-700">{(zone.fee / 1000).toFixed(2)} د.أ</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {zone.freeShippingThreshold ? `عند ${zone.freeShippingThreshold / 1000} د.أ` : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {zone.isEnabled 
                      ? <span className="inline-block rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">مفعل</span>
                      : <span className="inline-block rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">معطل</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditingZone(zone)} className="text-blue-600 hover:underline text-xs font-bold">تعديل</button>
                      <button onClick={async () => {
                        if (confirm('هل أنت متأكد من حذف هذه المنطقة؟')) {
                          await deleteShippingZone(zone.id);
                        }
                      }} className="text-red-600 hover:underline text-xs font-bold">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {initialZones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
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
