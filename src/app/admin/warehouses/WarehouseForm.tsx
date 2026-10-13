'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createWarehouse, updateWarehouse } from '@/actions/warehouses';
import { Save, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type Warehouse = {
  id?: string;
  name: string;
  code: string;
  location?: string | null;
  isActive: boolean;
};

export function WarehouseForm({ initialData }: { initialData?: Warehouse }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    
    let res;
    if (initialData?.id) {
      res = await updateWarehouse(initialData.id, formData);
    } else {
      res = await createWarehouse(formData);
    }

    if (res.success) {
      router.push('/admin/warehouses');
      router.refresh();
    } else {
      setError(res.error || 'حدث خطأ غير متوقع');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] p-6">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {error && (
          <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded-md">
            <p className="text-red-700 text-sm font-bold">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label htmlFor="name" className="block text-sm font-bold text-zinc-700">اسم المستودع <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={initialData?.name}
              required
              className="w-full p-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)] text-zinc-800"
              placeholder="مثال: المستودع الرئيسي"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="code" className="block text-sm font-bold text-zinc-700">كود المستودع <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="code"
              name="code"
              defaultValue={initialData?.code}
              required
              className="w-full p-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)] text-zinc-800 font-mono text-left"
              placeholder="مثال: WH-01"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="location" className="block text-sm font-bold text-zinc-700">الموقع</label>
          <input
            type="text"
            id="location"
            name="location"
            defaultValue={initialData?.location || ''}
            className="w-full p-3 border border-zinc-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-500)] text-zinc-800"
            placeholder="عنوان أو وصف الموقع"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            defaultChecked={initialData ? initialData.isActive : true}
            className="w-5 h-5 text-[var(--color-gold-500)] rounded border-zinc-300 focus:ring-[var(--color-gold-500)] cursor-pointer"
          />
          <label htmlFor="isActive" className="text-sm font-bold text-zinc-700 cursor-pointer">
            المستودع نشط وجاهز للعمليات
          </label>
        </div>

        <div className="pt-6 border-t border-zinc-100 flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-[#3F4B32] hover:bg-[#2d3623] text-white p-3 rounded-md font-bold transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>حفظ البيانات</span>
              </>
            )}
          </button>
          
          <Link
            href="/admin/warehouses"
            className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 p-3 rounded-md font-bold transition-colors flex justify-center items-center gap-2"
          >
            <ArrowRight className="w-5 h-5" />
            <span>إلغاء والعودة</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
