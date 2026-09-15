'use client';

import React, { useState, useTransition } from 'react';
import { MoreHorizontal, Edit, Trash2, Search, Check } from 'lucide-react';
import { updateCategory, deleteCategory } from '@/actions/categories';

export function CategoryActionsMenu({ 
  category, 
  allCategories,
  allProducts = []
}: { 
  category: { id: string, name: string, imagePath: string | null, products?: {id: string, nameAr: string, nameEn: string}[] };
  allCategories: { id: string, name: string }[];
  allProducts?: { id: string, nameAr: string, nameEn: string, categoryId: string, category: { name: string } }[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit State
  const [editName, setEditName] = useState(category.name);
  const [editImage, setEditImage] = useState<File | null>(null);
  
  // Products Selection State
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    category.products?.map(p => p.id) || []
  );

  const filteredProducts = allProducts.filter(p => 
    p.nameAr.includes(productSearchTerm) || p.nameEn.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Delete State
  const [deleteWithProducts, setDeleteWithProducts] = useState(false);
  const [fallbackCategoryId, setFallbackCategoryId] = useState('');

  const [isPending, startTransition] = useTransition();

  const handleUpdate = () => {
    if (!editName) return alert('اسم المجموعة مطلوب');

    const formData = new FormData();
    formData.append('name', editName);
    if (editImage) {
      formData.append('image', editImage);
    }
    selectedProductIds.forEach(id => {
      formData.append('productIds', id);
    });

    startTransition(async () => {
      const res = await updateCategory(category.id, formData);
      if (res.success) {
        setIsEditModalOpen(false);
        setIsOpen(false);
      } else {
        alert(res.error || 'حدث خطأ أثناء التعديل');
      }
    });
  };

  const handleDelete = () => {
    if (!deleteWithProducts && !fallbackCategoryId) {
      return alert('يرجى اختيار مجموعة بديلة لنقل المنتجات إليها');
    }

    if (confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذا الإجراء.')) {
      startTransition(async () => {
        const res = await deleteCategory(category.id, deleteWithProducts, fallbackCategoryId);
        if (res.success) {
          setIsDeleteModalOpen(false);
          setIsOpen(false);
        } else {
          alert(res.error || 'حدث خطأ أثناء الحذف');
        }
      });
    }
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
              تعديل المجموعة
            </button>
            <button
              onClick={() => { setIsDeleteModalOpen(true); setIsOpen(false); }}
              className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف المجموعة
            </button>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4">تعديل المجموعة</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">اسم المجموعة</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full border border-zinc-300 rounded-md p-2 focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-zinc-700 mb-1">صورة جديدة (اختياري)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => setEditImage(e.target.files?.[0] || null)}
                  className="w-full border border-zinc-300 rounded-md p-2 text-sm"
                />
              </div>

              {/* Product Selection */}
              <div className="pt-2 border-t border-zinc-200">
                <label className="block text-sm font-bold text-zinc-700 mb-2">
                  تحديد منتجات لهذه المجموعة (اختياري)
                </label>
                <div className="relative mb-3">
                  <input
                    type="text"
                    placeholder="ابحث عن مكياج لإضافته..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full border border-zinc-300 rounded-md pl-4 pr-10 py-2 text-sm focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5" />
                </div>
                
                <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-md p-2 space-y-1 bg-zinc-50">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isSelected = selectedProductIds.includes(product.id);
                      return (
                        <div 
                          key={product.id}
                          onClick={() => toggleProduct(product.id)}
                          className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors text-sm ${isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-zinc-100 border border-transparent'}`}
                        >
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800">{product.nameAr}</span>
                            <span className="text-xs text-zinc-500">مجموعته الحالية: {product.category?.name || 'بدون'}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-green-600" />}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-zinc-500 text-sm py-4">لا توجد منتجات مطابقة للبحث</div>
                  )}
                </div>
                <div className="mt-2 text-xs text-zinc-500 font-bold">
                  المنتجات المحددة: {selectedProductIds.length} عطر
                </div>
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
                className="px-4 py-2 bg-[var(--color-charcoal-900)] text-white rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-red-600">حذف المجموعة</h3>
            <p className="text-sm text-zinc-600 mb-4">
              أنت على وشك حذف مجموعة &quot;{category.name}&quot;. ماذا تريد أن تفعل بالمنتجات التابعة لها؟
            </p>
            
            <div className="space-y-4 bg-zinc-50 p-4 rounded-md border border-zinc-200">
              <label className="flex items-start gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="deleteOption" 
                  checked={!deleteWithProducts}
                  onChange={() => setDeleteWithProducts(false)}
                  className="mt-1 accent-[var(--color-charcoal-900)]"
                />
                <div>
                  <span className="block font-bold text-sm">الاحتفاظ بالمنتجات (موصى به)</span>
                  <span className="text-xs text-zinc-500">نقل المنتجات إلى مجموعة أخرى لتجنب مسحها من الموقع.</span>
                </div>
              </label>

              {!deleteWithProducts && (
                <div className="mr-6 mt-2">
                  <select 
                    value={fallbackCategoryId}
                    onChange={e => setFallbackCategoryId(e.target.value)}
                    className="w-full border border-zinc-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
                  >
                    <option value="">-- اختر مجموعة بديلة --</option>
                    {allCategories.filter(c => c.id !== category.id).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <label className="flex items-start gap-2 cursor-pointer pt-2 border-t border-zinc-200 mt-2">
                <input 
                  type="radio" 
                  name="deleteOption" 
                  checked={deleteWithProducts}
                  onChange={() => setDeleteWithProducts(true)}
                  className="mt-1 accent-red-600"
                />
                <div>
                  <span className="block font-bold text-sm text-red-600">حذف المجموعة وجميع منتجاتها</span>
                  <span className="text-xs text-red-500/80">سيتم حذف كافة المنتجات التابعة بشكل نهائي ولا يمكن التراجع.</span>
                </div>
              </label>
            </div>

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
                disabled={isPending || (!deleteWithProducts && !fallbackCategoryId)}
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
