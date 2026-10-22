'use client';

import React, { useTransition } from 'react';
import { createShade } from '@/actions/shades';
import { useRouter } from 'next/navigation';

export function ShadeNewForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await createShade(formData);
      if (res.success) {
        alert('تمت الإضافة بنجاح');
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        alert(res.error || 'حدث خطأ أثناء الإضافة');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm h-fit">
      <h3 className="text-lg font-bold text-[#3F4832] mb-4 border-b pb-2">
        إضافة درجة لون جديدة
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">اسم الدرجة (مطلوب)</label>
          <input 
            type="text" 
            name="name"
            required
            placeholder="مثال: أحمر غامق"
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">كود اللون (Hex)</label>
          <div className="flex gap-2">
            <input 
              type="color" 
              name="hexColorPicker"
              onChange={(e) => {
                const hexInput = document.getElementById('hexCodeInput') as HTMLInputElement;
                if(hexInput) hexInput.value = e.target.value;
              }}
              className="h-10 w-10 border border-zinc-200 rounded cursor-pointer"
            />
            <input 
              id="hexCodeInput"
              type="text" 
              name="hexCode"
              placeholder="#FF0000"
              className="flex-1 border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623] uppercase"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isActive" id="isActive" defaultChecked className="w-4 h-4 rounded text-[#3F4832]" />
          <label htmlFor="isActive" className="text-sm font-medium text-zinc-700">نشط</label>
        </div>
        <button 
          type="submit"
          disabled={isPending} 
          className="w-full bg-[#3F4832] text-white py-2.5 rounded font-bold text-sm hover:bg-[#2d3623] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'جاري الإضافة...' : 'إضافة'}
        </button>
      </div>
    </form>
  );
}
