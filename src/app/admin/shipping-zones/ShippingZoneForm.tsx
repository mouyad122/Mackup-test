'use client';

import { useState } from 'react';
import { createShippingZone, updateShippingZone } from '@/actions/shipping-zones';

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

export function ShippingZoneForm({ zone, onClose }: { zone?: Zone | null, onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerFee, setCustomerFee] = useState<string>(
    zone ? (zone.fee / 1000).toString() : '3'
  );
  const [carrierCost, setCarrierCost] = useState<string>(
    zone && zone.actualDeliveryCost !== null ? (zone.actualDeliveryCost / 1000).toString() : '2'
  );

  const numCustomerFee = parseFloat(customerFee || '0');
  const numCarrierCost = parseFloat(carrierCost || '0');
  const margin = Math.max(0, numCustomerFee - numCarrierCost);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    try {
      if (zone) {
        await updateShippingZone(zone.id, formData);
      } else {
        await createShippingZone(formData);
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء حفظ المنطقة');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-black text-emerald-950 mb-2">
        {zone ? `تعديل تسعير التوصيل: ${zone.nameAr}` : 'إضافة منطقة توصيل جديدة'}
      </h2>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">الاسم بالعربية</label>
          <input
            type="text"
            name="nameAr"
            defaultValue={zone?.nameAr}
            required
            placeholder="مثال: عمان"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">الاسم بالإنجليزية</label>
          <input
            type="text"
            name="nameEn"
            defaultValue={zone?.nameEn}
            required
            dir="ltr"
            placeholder="e.g. Amman"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-mono text-zinc-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">
            سعر التوصيل على الزبون (دينار)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="fee"
            value={customerFee}
            onChange={(e) => setCustomerFee(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-900"
          />
          <p className="text-xs text-zinc-500 mt-1">
            المبلغ المحصل من الزبونة في الفاتورة (الافتراضي: 3.00 د.أ)
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">
            أجرة شركة التوصيل / الناقل (دينار)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="actualDeliveryCost"
            value={carrierCost}
            onChange={(e) => setCarrierCost(e.target.value)}
            required
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-900"
          />
          <p className="text-xs text-zinc-500 mt-1">
            المبلغ الفعلي المستحق لشركة التوصيل للطلب (الافتراضي: 2.00 د.أ)
          </p>
        </div>
      </div>

      {/* Delivery Margin Pill */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-950 font-bold">
          <span>📈</span>
          <span>هامش ربح المنصة من التوصيل:</span>
          <span className="font-mono text-base font-black text-emerald-900 bg-white px-2 py-0.5 rounded-lg border border-emerald-200" dir="ltr">
            {margin.toFixed(2)} د.أ
          </span>
        </div>
        <span className="text-[11px] text-emerald-800">
          (ربح صافٍ للمنصة فقط — المحل لا علاقة له به، ومحجوب تماماً عن شركة التوصيل)
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">حد الشحن المجاني - دينار (اختياري)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            name="freeShippingThreshold"
            defaultValue={zone?.freeShippingThreshold ? zone.freeShippingThreshold / 1000 : ''}
            placeholder="اترك فارغاً لإلغاء الشحن المجاني"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">وقت التوصيل المقدر</label>
          <input
            type="text"
            name="estimatedDeliveryTime"
            defaultValue={zone?.estimatedDeliveryTime || '2-3 أيام'}
            required
            placeholder="مثال: 24-48 ساعة"
            className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" name="isEnabled" id="isEnabled" value="true" defaultChecked={zone ? zone.isEnabled : true} className="w-4 h-4 rounded text-emerald-950" />
        <label htmlFor="isEnabled" className="text-sm font-bold text-zinc-700">تفعيل هذه المنطقة في المتجر</label>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-zinc-100 pt-4">
        <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-zinc-600 hover:bg-zinc-100 font-bold text-xs">إلغاء</button>
        <button type="submit" disabled={isSubmitting} className="rounded-xl bg-zinc-900 hover:bg-zinc-800 px-6 py-2 text-white font-bold text-xs disabled:opacity-50">
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ تسعير المنطقة'}
        </button>
      </div>
    </form>
  );
}
