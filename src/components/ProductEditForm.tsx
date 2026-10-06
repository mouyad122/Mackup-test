'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateProduct } from '@/actions/products';
import { Loader2, Plus, Trash2, Search, X } from 'lucide-react';

interface Variant {
  id?: string;
  name: string;
  sku: string;
  price: number;
  colorHex?: string | null;
  stock: number;
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

interface ProductImage {
  id: string;
  url: string;
  isMain: boolean;
}

interface ProductOption {
  id: string;
  nameAr: string;
  nameEn: string;
  sku: string;
  imageUrl: string | null;
}

interface ProductEditFormProps {
  productId: string;
  initialData: {
    nameAr: string;
    nameEn: string;
    sku: string;
    shortDescription: string | null;
    longDescription: string | null;
    isVisible: boolean;
    isFeatured: boolean;
    categoryId: string;
    brandId: string | null;
    productType: string | null;
    finish: string | null;
    coverage: string | null;
    skinType: string | null;
    benefits: string | null;
    ingredients: string | null;
    howToUse: string | null;
    variants: Variant[];
    images: ProductImage[];
    similarProductIds: string[];
  };
  categories: Category[];
  brands: Brand[];
  allProducts?: ProductOption[];
}

export function ProductEditForm({
  productId,
  initialData,
  categories,
  brands,
  allProducts = [],
}: ProductEditFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [variants, setVariants] = useState<Variant[]>(initialData.variants.length > 0 ? initialData.variants : [{ name: 'Standard', sku: `${initialData.sku}-STD`, price: 25000, colorHex: '', stock: 0, isActive: true, inventorySource: 'INTERNAL' }]);

  const [similarSearch, setSimilarSearch] = useState('');
  const [selectedSimilarIds, setSelectedSimilarIds] = useState<string[]>(initialData.similarProductIds);

  const addVariant = () => {
    setVariants(prev => [...prev, { name: '', sku: '', price: 25000, colorHex: '', stock: 0, isActive: true, inventorySource: 'INTERNAL' }]);
  };

  const removeVariant = (index: number) => {
    setVariants(prev => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: string | boolean | number | null) => {
    setVariants(prev => prev.map((v, i) => i === index ? { ...v, [field]: value } : v));
  };

  const toggleSimilar = (productId: string) => {
    setSelectedSimilarIds(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const filteredProducts = allProducts.filter(p =>
    p.nameAr.toLowerCase().includes(similarSearch.toLowerCase()) ||
    p.nameEn.toLowerCase().includes(similarSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(similarSearch.toLowerCase())
  );

  const mainImage = initialData.images.find(img => img.isMain) || initialData.images[0];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError('');

    try {
      const formData = new FormData(e.currentTarget);

      const variantsForAction = variants.map(v => ({
        id: v.id,
        name: v.name,
        sku: v.name ? `${initialData.sku}-${v.name.toUpperCase().replace(/\s+/g, '')}` : v.sku,
        price: typeof v.price === 'string' ? Math.round(parseFloat(v.price) * 1000) : v.price,
        colorHex: v.colorHex || null,
        stock: typeof v.stock === 'string' ? parseInt(v.stock, 10) : v.stock,
        isActive: v.isActive,
        inventorySource: v.inventorySource,
      }));
      formData.set('variants', JSON.stringify(variantsForAction));
      formData.set('similarProductIds', JSON.stringify(selectedSimilarIds));

      const res = await updateProduct(productId, formData);
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
          <input type="text" name="nameAr" defaultValue={initialData.nameAr} required className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">اسم المنتج (إنجليزي) *</label>
          <input type="text" name="nameEn" defaultValue={initialData.nameEn} required className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">SKU الأساسي *</label>
          <input type="text" name="sku" readOnly value={initialData.sku} required dir="ltr" className="w-full border rounded p-2 text-sm font-mono text-left outline-none bg-zinc-50 cursor-not-allowed text-zinc-500" />
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">الفئة *</label>
          <select name="categoryId" defaultValue={initialData.categoryId} required className="w-full border rounded p-2 text-sm outline-none bg-white focus:border-[var(--color-rose-600)]">
            <option value="">-- اختر الفئة --</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">الماركة (Brand)</label>
          <select name="brandId" defaultValue={initialData.brandId || ''} className="w-full border rounded p-2 text-sm outline-none bg-white focus:border-[var(--color-rose-600)]">
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
            <input type="text" name="productType" defaultValue={initialData.productType || ''} placeholder="Lipstick, Foundation..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">اللمسة النهائية (Finish)</label>
            <input type="text" name="finish" defaultValue={initialData.finish || ''} placeholder="Matte, Dewy, Glossy..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">التغطية (Coverage)</label>
            <input type="text" name="coverage" defaultValue={initialData.coverage || ''} placeholder="Full, Medium, Light..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-600 mb-2">نوع البشرة (Skin Type)</label>
            <input type="text" name="skinType" defaultValue={initialData.skinType || ''} placeholder="Oily, Dry, Normal, All..." className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]" />
          </div>
        </div>
      </div>

      {/* Descriptions */}
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">الوصف القصير</label>
        <textarea name="shortDescription" defaultValue={initialData.shortDescription || ''} rows={2} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
      </div>

      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">الفوائد والمميزات (Benefits)</label>
        <textarea name="benefits" defaultValue={initialData.benefits || ''} rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">طريقة الاستخدام (How to Use)</label>
          <textarea name="howToUse" defaultValue={initialData.howToUse || ''} rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
        <div>
          <label className="block text-sm font-bold text-zinc-700 mb-2">المكونات (Ingredients)</label>
          <textarea name="ingredients" defaultValue={initialData.ingredients || ''} rows={3} className="w-full border rounded p-2 text-sm outline-none focus:border-[var(--color-rose-600)]"></textarea>
        </div>
      </div>

      {/* Variants / Shades */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <label className="text-sm font-bold text-zinc-700">الدرجات أو الأحجام (Variants / Shades)</label>
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
                <input type="text" value={v.name ? `${initialData.sku}-${v.name.toUpperCase().replace(/\s+/g, '')}` : ''} readOnly className="w-full border rounded p-1.5 text-xs font-mono outline-none bg-zinc-50 cursor-not-allowed text-zinc-500" dir="ltr" />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.001"
                  value={(v.price / 1000).toFixed(3)}
                  onChange={e => updateVariant(i, 'price', Math.round(parseFloat(e.target.value) * 1000))}
                  required
                  className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]"
                  dir="ltr"
                />
              </div>
              <div className="col-span-1">
                <input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value) || 0)} className="w-full border rounded p-1.5 text-xs outline-none focus:border-[var(--color-rose-600)]" />
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

      {/* Similar Products */}
      <div className="border border-zinc-200 rounded-lg p-4 space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-zinc-700">✨ المنتجات المشابهة (المقترحة)</label>
          <span className="text-xs text-zinc-400">
            {selectedSimilarIds.length === 0 ? 'افتراضي: أول 3 منتجات' : `${selectedSimilarIds.length} منتج محدد`}
          </span>
        </div>
        
        <div className="flex items-center gap-2 border rounded p-2 bg-white focus-within:border-[var(--color-rose-600)] transition-colors">
          <Search className="w-4 h-4 text-zinc-400 flex-shrink-0" />
          <input type="text" placeholder="ابحث عن منتج..." value={similarSearch} onChange={e => setSimilarSearch(e.target.value)} className="flex-1 text-sm outline-none bg-transparent" />
        </div>

        <div className="max-h-64 overflow-y-auto border border-zinc-100 rounded-lg divide-y divide-zinc-50">
          {filteredProducts.map(product => {
            const isSelected = selectedSimilarIds.includes(product.id);
            return (
              <label key={product.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${isSelected ? 'bg-[var(--color-rose-50)]' : 'hover:bg-zinc-50'}`}>
                <input type="checkbox" checked={isSelected} onChange={() => toggleSimilar(product.id)} className="w-4 h-4 accent-[var(--color-rose-600)]" />
                {product.imageUrl && <div className="w-10 h-10 rounded-md bg-zinc-100 flex-shrink-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${product.imageUrl.startsWith('local://') ? product.imageUrl.replace('local://', '/') : product.imageUrl}")` }} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800 truncate">{product.nameAr}</p>
                  <p className="text-xs text-zinc-400">{product.sku}</p>
                </div>
              </label>
            );
          })}
        </div>

        {selectedSimilarIds.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedSimilarIds.map(sid => {
              const p = allProducts.find(p => p.id === sid);
              if (!p) return null;
              return (
                <span key={sid} className="flex items-center gap-1 bg-[var(--color-rose-100)] text-[var(--color-rose-800)] text-xs px-2 py-1 rounded-full border border-[var(--color-rose-300)]">
                  {p.nameAr}
                  <button type="button" onClick={() => toggleSimilar(sid)} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Image */}
      <div className="flex gap-6 items-start">
        <div className="flex-1">
          <label className="block text-sm font-bold text-zinc-700 mb-2">تحديث صورة المنتج الأساسية</label>
          <input type="file" name="image" accept="image/*" className="w-full border rounded p-2 text-sm bg-zinc-50 outline-none" onChange={e => {
            const file = e.target.files?.[0];
            if (file) setPreview(URL.createObjectURL(file));
          }} />
        </div>
        <div className="w-24 h-24 border rounded-lg overflow-hidden bg-zinc-50 flex items-center justify-center flex-shrink-0">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          ) : mainImage ? (
            <img src={mainImage.url} alt="Current" className="w-full h-full object-contain" />
          ) : (
            <span className="text-xs text-zinc-400">بدون صورة</span>
          )}
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3 border-t pt-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isVisible" value="true" defaultChecked={initialData.isVisible} id="isVisible" className="w-4 h-4 rounded accent-[var(--color-rose-600)]" />
          <label htmlFor="isVisible" className="text-sm font-bold text-zinc-700 cursor-pointer">عرض المنتج في المتجر الإلكتروني ونظام البيع</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" name="isFeatured" value="true" defaultChecked={initialData.isFeatured} id="isFeatured" className="w-4 h-4 rounded accent-[var(--color-rose-600)]" />
          <label htmlFor="isFeatured" className="text-sm font-bold text-zinc-700 cursor-pointer">تمييز كأكثر مبيعاً (Best Seller)</label>
        </div>
      </div>

      {/* Submit */}
      <div className="pt-4 flex justify-end gap-3">
        <Link href="/admin/products" className="px-6 py-2 border rounded font-bold text-zinc-600 hover:bg-zinc-50 transition-colors text-sm">
          إلغاء
        </Link>
        <button type="submit" disabled={pending} className="bg-[var(--color-charcoal-900)] text-white px-8 py-2 rounded font-bold hover:bg-[var(--color-charcoal-800)] transition-colors text-sm shadow-sm disabled:opacity-60 flex items-center gap-2">
          {pending && <Loader2 className="w-4 h-4 animate-spin" />}
          {pending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        </button>
      </div>
    </form>
  );
}
