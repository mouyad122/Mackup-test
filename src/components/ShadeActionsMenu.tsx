'use client';

import React, { useState, useTransition } from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { updateShade, deleteShade } from '@/actions/shades';

export function ShadeActionsMenu({ 
  shade 
}: { 
  shade: { id: string, name: string, hexCode: string | null, isActive: boolean };
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [editName, setEditName] = useState(shade.name);
  const [editHexCode, setEditHexCode] = useState(shade.hexCode || '');
  const [editIsActive, setEditIsActive] = useState(shade.isActive);

  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    if (!editName) return alert('الاسم مطلوب');

    const formData = new FormData();
    formData.append('name', editName);
    formData.append('hexCode', editHexCode);
    if (editIsActive) {
      formData.append('isActive', 'true');
    }

    startTransition(async () => {
      const res = await updateShade(shade.id, formData);
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
      const res = await deleteShade(shade.id);
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
            <h3 className="text-xl font-bold mb-4">تعديل الدرجة</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">الاسم</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">كود اللون</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={editHexCode || '#000000'}
                    onChange={e => setEditHexCode(e.target.value)}
                    className="h-10 w-10 border border-zinc-200 rounded cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={editHexCode}
                    onChange={e => setEditHexCode(e.target.value)}
                    className="flex-1 border border-zinc-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none uppercase"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editIsActive" checked={editIsActive} onChange={e => setEditIsActive(e.target.checked)} className="w-4 h-4" />
                <label htmlFor="editIsActive" className="text-sm font-bold text-zinc-700">نشط</label>
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
              أنت على وشك حذف &quot;{shade.name}&quot;. هل أنت متأكد؟
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
