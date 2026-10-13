'use client';

import React, { useTransition, useState } from 'react';
import { createCategory } from '@/actions/categories';
import { useRouter } from 'next/navigation';

export function CategoryNewForm({
  products = [],
}: {
  products?: { id: string, nameAr: string, nameEn: string, category: { name: string } }[],
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter(p =>
    p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await createCategory(formData);
      if (res.success) {
        alert('تمت إضافة المجموعة بنجاح');
        (e.target as HTMLFormElement).reset();
        router.refresh();
      } else {
        alert(res.error || 'حدث خطأ أثناء إضافة المجموعة');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm h-fit">
      <h3 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
        إضافة مجموعة جديدة
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">اسم المجموعة</label>
          <input
            type="text"
            name="name"
            required
            placeholder="مثال: مكياج صيفية"
            className="w-full border border-zinc-200 rounded px-3 py-2 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">تحديد منتجات للمجموعة (اختياري)</label>
          <input
            type="text"
            placeholder="البحث عن منتج..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-2 border border-zinc-200 rounded px-3 py-1.5 text-sm bg-white outline-none focus:border-[#2d3623]"
          />
          <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded p-2 text-sm bg-zinc-50 space-y-1">
            {filteredProducts.map(p => (
              <label key={p.id} className="flex items-center gap-2 p-1.5 hover:bg-zinc-100 rounded cursor-pointer">
                <input type="checkbox" name="productIds" value={p.id} className="w-4 h-4 rounded text-[#3F4B32] focus:ring-[#3F4B32]" />
                <span className="flex-1 truncate text-zinc-700 font-medium">{p.nameAr}</span>
                {p.category && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    {p.category.name}
                  </span>
                )}
              </label>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-xs text-zinc-500 text-center py-4">لا توجد منتجات مطابقة</div>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="w-full bg-[#3F4B32] text-white py-2.5 rounded font-bold text-sm hover:bg-[#2d3623] disabled:opacity-50 transition-colors"
        >
          {isPending ? 'جاري الإضافة...' : 'إضافة مجموعة'}
        </button>
      </div>
    </form>
  );
}
