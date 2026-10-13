'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createProduct } from '@/actions/products';
import { Loader2, Plus, Trash2 } from 'lucide-react';

interface Variant {
  name: string;
  sku: string;
  price: string;
  colorHex?: string;
  isActive: boolean;
  shadeId?: string | null;
  supplierId?: string;
  supplierUnitCost?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  nameAr: string;
  nameEn: string;
}

interface ProductAttribute {
  key: string;
  value: string;
}

interface ShadeOption {
  id: string;
  name: string;
  hexCode: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
  profitMargin: number;
}

export function ProductNewForm({ 
  categories, 
  brands,
  nextSku,
  shades = [],
  suppliers = []
}: { 
  categories: Category[], 
  brands: Brand[],
  nextSku?: string,
  shades?: ShadeOption[],
  suppliers?: SupplierOption[]
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [autoSku] = useState(() => nextSku || 'DHB-' + Math.floor(1000 + Math.random() * 9000).toString());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  
  const [variants, setVariants] = useState<Variant[]>([
    { name: 'Standard', sku: '', price: '25.000', colorHex: '', isActive: true, shadeId: null, supplierId: '', supplierUnitCost: '' }
  ]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [catalogType, setCatalogType] = useState('MAKEUP');
  const isFashion = ['DRESS', 'ABAYA', 'CLOTHING'].includes(catalogType);

  const [newImages, setNewImages] = useState<{ id: string, file: File, preview: string }[]>([]);
  const [mainImageId, setMainImageId] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImgs = files.map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: URL.createObjectURL(file)
      }));
      setNewImages(prev => {
        const next = [...prev, ...newImgs];
        if (!mainImageId && next.length > 0) {
          setMainImageId(next[0].id);
        }
        return next;
      });
    }
    e.target.value = '';
  };
  
  const removeNewImage = (id: string) => {
    setNewImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (mainImageId === id) {
        setMainImageId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', sku: '', price: '', colorHex: '', isActive: true, shadeId: null, supplierId: '', supplierUnitCost: '' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | boolean) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const addAttribute = () => {
    setAttributes(prev => [...prev, { key: '', value: '' }]);
  };

  const removeAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  const updateAttribute = (index: number, field: 'key' | 'value', val: string) => {
    setAttributes(prev => prev.map((a, i) => i === index ? { ...a, [field]: val } : a));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);
      formData.set('sku', autoSku);

      const variantsForAction = variants.map(v => ({
        name: v.name,
        sku: `${autoSku}-${v.name.toUpperCase().replace(/\s+/g, '')}`,
        price: Math.round(parseFloat(v.price) * 1000),
        colorHex: v.colorHex || null,
        stock: 0,
        isActive: v.isActive,
        inventorySource: v.supplierId ? 'SUPPLIER' : 'INTERNAL',
        shadeId: v.shadeId,
        supplierId: v.supplierId || null,
        supplierUnitCost: v.supplierUnitCost ? parseFloat(v.supplierUnitCost) : null,
      }));
      formData.set('variants', JSON.stringify(variantsForAction));
      formData.set('attributes', JSON.stringify(attributes.filter(a => a.key.trim() !== '' && a.value.trim() !== '')));

      newImages.forEach(img => {
        formData.append('newImages', img.file);
      });
      
      const imageMetadata = {
        newImages: newImages.map((img, index) => ({ id: img.id, index })),
        mainImageId: mainImageId
      };
      formData.set('imageMetadata', JSON.stringify(imageMetadata));

      const res = await createProduct(formData);
      if (res.success) {
        window.location.href = '/admin/products';
      } else {
        setError(res.error || 'حدث خطأ');
        setPending(false);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl bg-white p-6 rounded-lg shadow-sm border border-[var(--color-ivory-200)] space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">اسم المنتج (عربي) *</label>
          <input type="text" name="nameAr" required className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">اسم المنتج (إنجليزي) *</label>
          <input type="text" name="nameEn" required className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">SKU الأساسي *</label>
          <input type="text" name="sku" readOnly value={autoSku} required className="w-full border border-zinc-200 rounded px-3 py-2 text-sm outline-none bg-zinc-50 cursor-not-allowed" dir="ltr" />
          <p className="text-xs text-zinc-400 mt-1">يتم إنشاؤه تلقائياً</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">الفئة *</label>
          <select name="categoryId" required className="w-full border rounded p-2 text-sm outline-none bg-white focus:border-[var(--color-rose-600)]">
            <option value="">-- اختر الفئة --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">الماركة (Brand)</label>
          <select name="brandId" className="w-full border rounded p-2 text-sm outline-none bg-white focus:border-[var(--color-rose-600)]">
            <option value="">-- اختر الماركة --</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.nameAr}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product-specific attributes */}
      <div className="bg-[var(--color-ivory-50)] p-4 rounded-lg border border-[var(--color-ivory-200)]">
        <h3 className="text-md font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <span className="text-[var(--color-rose-600)]">{isFashion ? '👗' : '✨'}</span> {isFashion ? 'بيانات الأزياء' : 'خصائص التجميل'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">نوع القسم *</label>
            <select name="productType" value={catalogType} onChange={event => setCatalogType(event.target.value)} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]">
              <option value="MAKEUP">مكياج</option><option value="SKINCARE">عناية بالبشرة</option><option value="PERFUME">عطور</option>
              <option value="DRESS">فساتين</option><option value="ABAYA">عبايات</option><option value="CLOTHING">ملابس / أثواب</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">{isFashion ? 'القصة / التصميم' : 'اللمسة النهائية (Finish)'}</label>
            <input type="text" name="finish" placeholder={isFashion ? 'مثال: واسع، رسمي، كاجوال' : 'Matte, Dewy, Glossy...'} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">{isFashion ? 'المقاس / الملاءمة' : 'التغطية (Coverage)'}</label>
            <input type="text" name="coverage" placeholder={isFashion ? 'مثال: S–XL أو مقاس حر' : 'Full, Medium, Light...'} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">{isFashion ? 'اللون / الموسم' : 'نوع البشرة (Skin Type)'}</label>
            <input type="text" name="skinType" placeholder={isFashion ? 'مثال: أسود، صيفي، شتوي' : 'Oily, Dry, Normal, All...'} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold text-zinc-600">خصائص إضافية (Dynamic Attributes)</label>
            <button type="button" onClick={addAttribute} className="text-xs text-[var(--color-rose-600)] border border-[var(--color-rose-600)] px-2 py-1 rounded hover:bg-[var(--color-rose-50)]">
              + إضافة خاصية
            </button>
          </div>
          {attributes.map((attr, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input type="text" value={attr.key} onChange={e => updateAttribute(index, 'key', e.target.value)} placeholder={isFashion ? 'الخاصية (مثال: الخامة)' : 'الخاصية (مثال: Texture)'} className="w-1/3 border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
              <input type="text" value={attr.value} onChange={e => updateAttribute(index, 'value', e.target.value)} placeholder={isFashion ? 'القيمة (مثال: كريب)' : 'القيمة (مثال: Liquid)'} className="flex-1 border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
              <button type="button" onClick={() => removeAttribute(index)} className="text-red-500 hover:text-red-700 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {attributes.length === 0 && <div className="text-xs text-zinc-400 italic">لا توجد خصائص إضافية.</div>}
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">الوصف القصير</label>
        <textarea name="shortDescription" rows={2} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" placeholder="وصف مختصر يظهر في قائمة المنتجات..."></textarea>
      </div>

      <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">{isFashion ? 'تفاصيل ومميزات القطعة' : 'الفوائد والمميزات (Benefits)'}</label>
        <textarea name="benefits" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">{isFashion ? 'تعليمات العناية والغسيل' : 'طريقة الاستخدام (How to Use)'}</label>
          <textarea name="howToUse" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">{isFashion ? 'الخامة / القماش' : 'المكونات (Ingredients)'}</label>
          <textarea name="ingredients" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
      </div>

      {/* Variants / Shades */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-bold text-zinc-700">{isFashion ? 'المقاسات أو الألوان' : 'الدرجات أو الأحجام (Variants / Shades)'} *</label>
          <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-bold text-[var(--color-rose-600)] border border-[var(--color-rose-600)] px-3 py-1.5 rounded hover:bg-[var(--color-rose-50)] transition-colors">
            <Plus className="w-3 h-3" /> إضافة درجة
          </button>
        </div>

        <div className="border rounded-lg divide-y divide-zinc-100 overflow-hidden">
          <div className="bg-zinc-50 grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-zinc-500">
            <div className="col-span-2">الاسم (الدرجة)</div>
            <div className="col-span-2">الدرجة (Shade)</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-3">السعر (د.أ)</div>
            <div className="col-span-2 text-center">لون / حالة التوفر</div>
            <div className="col-span-1 text-center">إجراء</div>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
              <div className="col-span-2">
                <input type="text" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required placeholder="Ruby Red" className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" />
              </div>
              <div className="col-span-2">
                <select value={v.shadeId || ''} onChange={e => updateVariant(i, 'shadeId', e.target.value)} className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]">
                  <option value="">بدون</option>
                  {shades?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <input type="text" value={v.name ? `${autoSku}-${v.name.toUpperCase().replace(/\s+/g, '')}` : ''} readOnly className="w-full border rounded p-1.5 text-xs font-mono outline-none bg-zinc-50 cursor-not-allowed text-zinc-500" dir="ltr" />
              </div>
              <div className="col-span-3">
                <input type="number" step="0.001" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required placeholder="25.000" className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" dir="ltr" />
              </div>
              <div className="col-span-2 flex items-center justify-center gap-2">
                <input type="color" value={v.colorHex || '#ffffff'} onChange={e => updateVariant(i, 'colorHex', e.target.value)} className="w-6 h-6 rounded border cursor-pointer p-0" />
                <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={v.isActive} onChange={e => updateVariant(i, 'isActive', e.target.checked)} className="w-4 h-4 accent-[var(--color-rose-600)]" />متوفر</label>
              </div>
              <div className="col-span-1 text-center">
                {variants.length > 1 && (
                  <button type="button" onClick={() => removeVariant(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {variants.map((v, i) => (
            <div key={`source-${i}`} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200">
              <label className="block text-xs font-semibold text-zinc-600 mb-2">{v.name || `Variant ${i + 1}`} · المورد (اختياري)</label>
                <div className="flex gap-4 mt-2 p-2 bg-white rounded border border-rose-100">
                  <div className="flex-1">
                    <label className="flex items-center text-xs font-bold text-zinc-700 mb-1">
                      المورد
                      <Link href="/admin/suppliers" target="_blank" className="text-[10px] text-[var(--color-rose-600)] hover:underline mr-auto">
                        + إضافة مورد جديد
                      </Link>
                    </label>
                    <select 
                      value={v.supplierId || ''} 
                      onChange={e => updateVariant(i, 'supplierId', e.target.value)} 
                      className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]"
                    >
                      <option value="">-- اختر المورد --</option>
                      {suppliers?.map(s => (
                        <option key={s.id} value={s.id}>{s.name} (ربح: {s.profitMargin}%)</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">تكلفة المورد (د.أ){v.supplierId ? ' *' : ''}</label>
                    <input 
                      type="number" 
                      step="0.001" 
                      min="0" 
                      required={!!v.supplierId}
                      value={v.supplierUnitCost || ''} 
                      onChange={e => updateVariant(i, 'supplierUnitCost', e.target.value)} 
                      placeholder="التكلفة من المورد" 
                      className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" 
                    />
                  </div>
                </div>
            </div>
          ))}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-bold text-zinc-700">صور المنتج</label>
        </div>
        <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 bg-zinc-50 flex flex-col items-center justify-center hover:bg-zinc-100 transition-colors relative">
          <input
            type="file"
            multiple
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleImageChange}
          />
          <div className="text-zinc-500 mb-2 pointer-events-none">
            <Plus className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
            <p className="text-sm font-medium">اضغط أو اسحب الصور هنا</p>
          </div>
          <p className="text-xs text-zinc-400 pointer-events-none">PNG, JPG up to 5MB</p>
        </div>
        
        {newImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {newImages.map((img) => (
              <div key={img.id} className={`relative border rounded-lg overflow-hidden ${mainImageId === img.id ? 'ring-2 ring-[var(--color-rose-600)]' : 'border-zinc-200'}`}>
                <div className="aspect-square bg-zinc-100">
                  <img src={img.preview} alt="Preview" className="w-full h-full object-cover" />
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                  <button type="button" onClick={() => removeNewImage(img.id)} className="bg-white/90 p-1.5 rounded-md shadow-sm text-red-600 hover:bg-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-2 bg-white/90 backdrop-blur-sm border-t border-zinc-100 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                    <input type="radio" name="mainImage" checked={mainImageId === img.id} onChange={() => setMainImageId(img.id)} className="w-3.5 h-3.5 accent-[var(--color-rose-600)]" />
                    صورة رئيسية
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isVisible" value="true" defaultChecked id="isVisible" className="w-4 h-4 rounded accent-[var(--color-rose-600)]" />
          <label htmlFor="isVisible" className="text-sm font-bold text-zinc-700 cursor-pointer">عرض المنتج في المتجر الإلكتروني ونظام البيع</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" value="true" id="isFeatured" className="w-4 h-4 rounded accent-[var(--color-rose-600)]" />
          <label htmlFor="isFeatured" className="text-sm font-bold text-zinc-700 cursor-pointer">تمييز كأكثر مبيعاً (Best Seller)</label>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Link href="/admin/products" className="px-6 py-2 border rounded font-bold text-zinc-600 hover:bg-zinc-50 transition-colors text-sm">
          إلغاء
        </Link>
        <button type="submit" disabled={pending} className="bg-[#3F4B32] text-white px-8 py-2 rounded font-bold hover:bg-[#2d3623] transition-colors text-sm shadow-sm disabled:opacity-60 flex items-center gap-2">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {pending ? 'جاري الحفظ...' : 'حفظ وإضافة المنتج'}
        </button>
      </div>

    </form>
  );
}
