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
  stock: string;
  isActive: boolean;
  inventorySource: 'INTERNAL' | 'SUPPLIER';
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

export function ProductNewForm({ 
  categories, 
  brands,
  nextSku 
}: { 
  categories: Category[], 
  brands: Brand[],
  nextSku?: string
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [autoSku] = useState(() => nextSku || 'DHB-' + Math.floor(1000 + Math.random() * 9000).toString());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  
  const [variants, setVariants] = useState<Variant[]>([
    { name: 'Standard', sku: '', price: '25.000', colorHex: '', stock: '0', isActive: true, inventorySource: 'INTERNAL' }
  ]);

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', sku: '', price: '', colorHex: '', stock: '0', isActive: true, inventorySource: 'INTERNAL' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | boolean) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
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
        stock: parseInt(v.stock) || 0,
        isActive: v.isActive,
        inventorySource: v.inventorySource,
      }));
      formData.set('variants', JSON.stringify(variantsForAction));

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

      {/* Beauty Attributes */}
      <div className="bg-[var(--color-ivory-50)] p-4 rounded-lg border border-[var(--color-ivory-200)]">
        <h3 className="text-md font-bold text-zinc-800 mb-4 flex items-center gap-2">
          <span className="text-[var(--color-rose-600)]">✨</span> خصائص التجميل (اختياري)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">نوع المنتج (Product Type)</label>
            <input type="text" name="productType" placeholder="Lipstick, Foundation..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">اللمسة النهائية (Finish)</label>
            <input type="text" name="finish" placeholder="Matte, Dewy, Glossy..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">التغطية (Coverage)</label>
            <input type="text" name="coverage" placeholder="Full, Medium, Light..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">نوع البشرة (Skin Type)</label>
            <input type="text" name="skinType" placeholder="Oily, Dry, Normal, All..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">الوصف القصير</label>
        <textarea name="shortDescription" rows={2} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" placeholder="وصف مختصر يظهر في قائمة المنتجات..."></textarea>
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">الفوائد والمميزات (Benefits)</label>
        <textarea name="benefits" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">طريقة الاستخدام (How to Use)</label>
          <textarea name="howToUse" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">المكونات (Ingredients)</label>
          <textarea name="ingredients" rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
      </div>

      {/* Variants / Shades */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-bold text-zinc-700">الدرجات أو الأحجام (Variants / Shades) *</label>
          <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-bold text-[var(--color-rose-600)] border border-[var(--color-rose-600)] px-3 py-1.5 rounded hover:bg-[var(--color-rose-50)] transition-colors">
            <Plus className="w-3 h-3" /> إضافة درجة
          </button>
        </div>

        <div className="border rounded-lg divide-y divide-zinc-100 overflow-hidden">
          <div className="bg-zinc-50 grid grid-cols-12 gap-2 px-4 py-2 text-xs font-bold text-zinc-500">
            <div className="col-span-3">الاسم (الدرجة)</div>
            <div className="col-span-2">لون (Hex)</div>
            <div className="col-span-2">SKU</div>
            <div className="col-span-2">السعر (د.أ)</div>
            <div className="col-span-1">المخزون</div>
            <div className="col-span-1 text-center">نشط</div>
            <div className="col-span-1 text-center">حذف</div>
          </div>
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
              <div className="col-span-3">
                <input type="text" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} required placeholder="Ruby Red" className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="color" value={v.colorHex || '#ffffff'} onChange={e => updateVariant(i, 'colorHex', e.target.value)} className="w-8 h-8 rounded border cursor-pointer p-0" />
                <input type="text" value={v.colorHex || ''} onChange={e => updateVariant(i, 'colorHex', e.target.value)} placeholder="#FF0000" className="flex-1 border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" dir="ltr" />
              </div>
              <div className="col-span-2">
                <input type="text" value={v.name ? `${autoSku}-${v.name.toUpperCase().replace(/\s+/g, '')}` : ''} readOnly className="w-full border rounded p-1.5 text-xs font-mono outline-none bg-zinc-50 cursor-not-allowed text-zinc-500" dir="ltr" />
              </div>
              <div className="col-span-2">
                <input type="number" step="0.001" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value)} required placeholder="25.000" className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" dir="ltr" />
              </div>
              <div className="col-span-1">
                <input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)} className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" />
              </div>
              <div className="col-span-1 text-center">
                <input type="checkbox" checked={v.isActive} onChange={e => updateVariant(i, 'isActive', e.target.checked)} className="w-4 h-4 accent-[var(--color-rose-600)]" />
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
          {variants.map((v, i) => <label key={`source-${i}`} className="flex items-center gap-3 text-xs font-semibold text-zinc-600">
            {v.name || `Variant ${i + 1}`} · مصدر المخزون
            <select value={v.inventorySource} onChange={e => updateVariant(i, 'inventorySource', e.target.value)} className="rounded border bg-white p-2">
              <option value="INTERNAL">مخزون داخلي</option><option value="SUPPLIER">مخزون مورد (يتطلب عرضاً متاحاً)</option>
            </select>
          </label>)}
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">صورة المنتج الأساسية</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)] bg-zinc-50"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }}
        />
        {preview && (
          <div className="mt-3 w-24 h-24 border rounded-lg overflow-hidden bg-zinc-50">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
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
        <button type="submit" disabled={pending} className="bg-[var(--color-charcoal-900)] text-white px-8 py-2 rounded font-bold hover:bg-[var(--color-charcoal-800)] transition-colors text-sm shadow-sm disabled:opacity-60 flex items-center gap-2">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {pending ? 'جاري الحفظ...' : 'حفظ وإضافة المنتج'}
        </button>
      </div>

    </form>
  );
}
