'use client';

import React, { useTransition } from 'react';
import { createIngredient } from '@/actions/ingredients';
import { useRouter } from 'next/navigation';

export function IngredientNewForm() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      const res = await createIngredient(formData);
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
        إضافة مكون جديد
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">الاسم بالإنجليزي (مطلوب)</label>
          <input 
            type="text" 
            name="nameEn"
            required
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">الاسم بالعربي (مطلوب)</label>
          <input 
            type="text" 
            name="nameAr"
            required
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">الوصف</label>
          <textarea 
            name="description"
            rows={3}
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
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
