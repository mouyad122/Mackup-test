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
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold mb-4">{zone ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}</h2>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">الاسم بالعربية</label>
          <input type="text" name="nameAr" defaultValue={zone?.nameAr} required className="w-full rounded border px-3 py-2" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">الاسم بالإنجليزية</label>
          <input type="text" name="nameEn" defaultValue={zone?.nameEn} required dir="ltr" className="w-full rounded border px-3 py-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">رسوم التوصيل والتكلفة - دينار</label>
          <input type="number" step="0.01" min="0" name="fee" defaultValue={zone ? zone.fee / 1000 : ''} required className="w-full rounded border px-3 py-2" />
          <p className="text-xs text-zinc-500 mt-1">يتم تحصيل هذا المبلغ من العميل، ويُدفع بالكامل لشركة التوصيل</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-bold text-zinc-700">حد الشحن المجاني - دينار</label>
          <input type="number" step="0.01" min="0" name="freeShippingThreshold" defaultValue={zone?.freeShippingThreshold ? zone.freeShippingThreshold / 1000 : ''} className="w-full rounded border px-3 py-2" />
          <p className="text-xs text-zinc-500 mt-1">اختياري: اترك فارغاً للإلغاء</p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-zinc-700">وقت التوصيل المقدر</label>
        <input type="text" name="estimatedDeliveryTime" defaultValue={zone?.estimatedDeliveryTime} required placeholder="مثال: 24-48 ساعة" className="w-full rounded border px-3 py-2" />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <input type="checkbox" name="isEnabled" id="isEnabled" value="true" defaultChecked={zone ? zone.isEnabled : true} className="w-4 h-4" />
        <label htmlFor="isEnabled" className="text-sm font-bold text-zinc-700">تفعيل هذه المنطقة</label>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t pt-4">
        <button type="button" onClick={onClose} className="rounded px-4 py-2 text-zinc-600 hover:bg-zinc-100">إلغاء</button>
        <button type="submit" disabled={isSubmitting} className="rounded bg-zinc-900 px-6 py-2 text-white font-bold disabled:opacity-50">
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </form>
  );
}
