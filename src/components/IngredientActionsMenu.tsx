'use client';

import React, { useState, useTransition } from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { updateIngredient, deleteIngredient } from '@/actions/ingredients';

export function IngredientActionsMenu({ 
  ingredient 
}: { 
  ingredient: { id: string, nameEn: string, nameAr: string, description: string | null };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editNameEn, setEditNameEn] = useState(ingredient.nameEn);
  const [editNameAr, setEditNameAr] = useState(ingredient.nameAr);
  const [editDescription, setEditDescription] = useState(ingredient.description || '');

  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    if (!editNameEn || !editNameAr) return alert('الاسم مطلوب');

    const formData = new FormData();
    formData.append('nameEn', editNameEn);
    formData.append('nameAr', editNameAr);
    formData.append('description', editDescription);

    startTransition(async () => {
      const res = await updateIngredient(ingredient.id, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        setIsOpen(false);
      } else {
        alert(res.error || 'حدث خطأ أثناء التعديل');
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteIngredient(ingredient.id);
      if (res.success) {
        setIsDeleteModalOpen(false);
        setIsOpen(false);
      } else {
        alert(res.error || 'حدث خطأ أثناء الحذف');
      }
    });
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-md transition-colors"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-md shadow-lg z-20 py-1 text-sm font-medium">
            <button
              onClick={() => { setIsEditModalOpen(true); setIsOpen(false); }}
              className="w-full text-right px-4 py-2 hover:bg-zinc-50 text-zinc-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              تعديل
            </button>
            <button
              onClick={() => { setIsDeleteModalOpen(true); setIsOpen(false); }}
              className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">تعديل المكون</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">الاسم بالإنجليزي</label>
                <input 
                  type="text" 
                  value={editNameEn}
                  onChange={e => setEditNameEn(e.target.value)}
                  className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">الاسم بالعربي</label>
                <input 
                  type="text" 
                  value={editNameAr}
                  onChange={e => setEditNameAr(e.target.value)}
                  className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">الوصف</label>
                <textarea 
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                disabled={isPending}
              >
                إلغاء
              </button>
              <button 
                onClick={handleUpdate}
                disabled={isPending}
                className="px-4 py-2 bg-[#3F4B32] text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-red-600">حذف</h3>
            <p className="text-sm text-zinc-600 mb-4">
              أنت على وشك حذف &quot;{ingredient.nameAr}&quot;. هل أنت متأكد؟
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                disabled={isPending}
              >
                إلغاء
              </button>
              <button 
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
