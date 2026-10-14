'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { createProduct, updateProduct } from '@/actions/products';

type Variant = {
  id?: string;
  size: string;
  sku: string;
  price: number;
  isActive: boolean;
  inventorySource: 'INTERNAL' | 'SUPPLIER';
  supplierId?: string;
  supplierUnitCost?: string;
  supplierOfferUpdatedAt?: string | null;
};

type InitialData = {
  nameAr: string;
  nameEn: string;
  sku: string;
  categoryId: string;
  shortDescription: string | null;
  longDescription: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  variants: Variant[];
  images: { id: string; url: string; isMain: boolean }[];
};

export function ProductCatalogForm({ productId, initialData, categories, suppliers, nextSku, templates = [] }: {
  productId?: string;
  initialData?: InitialData;
  categories: { id: string; name: string }[];
  suppliers: { id: string; name: string; profitMargin: number }[];
  nextSku?: string;
  templates?: { id: string; nameAr: string; fields: { attributeDefinitionId: string; isRequired: boolean; useAsVariant: boolean; attributeDefinition: { nameAr: string; inputType: string; optionsJson: string | null } }[] }[];
}) {
  const baseSku = initialData?.sku || nextSku || 'RAW-PRODUCT';
  const [variants, setVariants] = useState<Variant[]>(initialData?.variants.length ? initialData.variants : [{
    size: 'قياسي', sku: `${baseSku}-STD`, price: 25000, isActive: true, inventorySource: 'INTERNAL', supplierId: '', supplierUnitCost: '',
  }]);
  const [images, setImages] = useState(initialData?.images || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const template = useMemo(() => templates.find(item => item.id === templateId), [templateId, templates]);

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants(current => current.map((variant, i) => i === index ? { ...variant, ...patch } : variant));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('sku', baseSku);
    formData.set('variants', JSON.stringify(variants));
    formData.set('existingImageIds', JSON.stringify(images.map(image => image.id)));
    formData.set('productTemplateId', templateId);
    formData.set('templateAttributes', JSON.stringify(Object.entries(templateValues).filter(([, value]) => value !== '').map(([attributeDefinitionId, value]) => ({ attributeDefinitionId, value }))));
    const result = productId ? await updateProduct(productId, formData) : await createProduct(formData);
    if (result.success) window.location.href = '/admin/products';
    else { setError(result.error || 'تعذر حفظ المنتج.'); setPending(false); }
  }

  return <form onSubmit={submit} className="max-w-5xl space-y-6 rounded-xl border bg-white p-6 shadow-sm">
    {error && <div role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}
    <section className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-bold">اسم المنتج بالعربية<input name="nameAr" required defaultValue={initialData?.nameAr} className="rounded border p-2 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold">اسم المنتج بالإنجليزية<input name="nameEn" required defaultValue={initialData?.nameEn} className="rounded border p-2 font-normal" dir="ltr" /></label>
      <label className="grid gap-1 text-sm font-bold">SKU<input value={baseSku} readOnly className="rounded border bg-zinc-50 p-2 font-mono font-normal" dir="ltr" /></label>
      <label className="grid gap-1 text-sm font-bold">القسم<select name="categoryId" required defaultValue={initialData?.categoryId || ''} className="rounded border bg-white p-2 font-normal"><option value="">اختر القسم</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold">نوع المنتج<select value={templateId} onChange={event => { setTemplateId(event.target.value); setTemplateValues({}); }} className="rounded border bg-white p-2 font-normal"><option value="">منتج عام</option>{templates.map(item => <option key={item.id} value={item.id}>{item.nameAr}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-bold md:col-span-2">الوصف المختصر<textarea name="shortDescription" rows={2} defaultValue={initialData?.shortDescription || ''} className="rounded border p-2 font-normal" /></label>
      <label className="grid gap-1 text-sm font-bold md:col-span-2">الوصف التفصيلي<textarea name="longDescription" rows={4} defaultValue={initialData?.longDescription || ''} className="rounded border p-2 font-normal" /></label>
    </section>
    {template && <section className="rounded-lg border bg-[#F7F3EA] p-4"><h2 className="mb-3 font-bold">خصائص {template.nameAr}</h2><div className="grid gap-3 md:grid-cols-2">{template.fields.filter(field => !field.useAsVariant).map(field => { const options = field.attributeDefinition.optionsJson ? JSON.parse(field.attributeDefinition.optionsJson) as string[] : []; return <label key={field.attributeDefinitionId} className="grid gap-1 text-sm font-bold">{field.attributeDefinition.nameAr}{field.isRequired ? ' *' : ''}{field.attributeDefinition.inputType === 'SELECT' ? <select required={field.isRequired} value={templateValues[field.attributeDefinitionId] || ''} onChange={event => setTemplateValues(current => ({ ...current, [field.attributeDefinitionId]: event.target.value }))} className="rounded border p-2 font-normal"><option value="">اختر</option>{options.map(option => <option key={option}>{option}</option>)}</select> : field.attributeDefinition.inputType === 'BOOLEAN' ? <select value={templateValues[field.attributeDefinitionId] || ''} onChange={event => setTemplateValues(current => ({ ...current, [field.attributeDefinitionId]: event.target.value }))} className="rounded border p-2 font-normal"><option value="">اختر</option><option value="true">نعم</option><option value="false">لا</option></select> : <input required={field.isRequired} type={field.attributeDefinition.inputType === 'NUMBER' ? 'number' : field.attributeDefinition.inputType === 'COLOR' ? 'color' : 'text'} value={templateValues[field.attributeDefinitionId] || ''} onChange={event => setTemplateValues(current => ({ ...current, [field.attributeDefinitionId]: event.target.value }))} className="rounded border p-2 font-normal" />}</label>; })}</div><p className="mt-3 text-xs text-zinc-600">الحقول المعلَّمة كمتغير تُدار من جدول الخيارات أدناه؛ أنشئ فقط التركيبات المتاحة فعليًا.</p></section>}

    <section className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-bold">المقاسات / الخيارات</h2><button type="button" onClick={() => setVariants(current => [...current, { size: '', sku: `${baseSku}-${current.length + 1}`, price: 0, isActive: true, inventorySource: 'INTERNAL' }])} className="rounded border px-3 py-1 text-sm">+ إضافة خيار</button></div>
      {variants.map((variant, index) => <div key={variant.id || index} className="grid gap-3 rounded-lg border bg-zinc-50 p-4 md:grid-cols-6">
        <label className="grid gap-1 text-xs font-bold">المقاس<input required value={variant.size} onChange={e => updateVariant(index, { size: e.target.value })} className="rounded border p-2 font-normal" /></label>
        <label className="grid gap-1 text-xs font-bold">SKU<input required value={variant.sku} onChange={e => updateVariant(index, { sku: e.target.value })} className="rounded border p-2 font-mono font-normal" dir="ltr" /></label>
        <label className="grid gap-1 text-xs font-bold">السعر د.أ<input required type="number" min="0" step="0.001" value={(variant.price / 1000).toFixed(3)} onChange={e => updateVariant(index, { price: Math.round(Number(e.target.value) * 1000) })} className="rounded border p-2 font-normal" dir="ltr" /></label>
        <label className="grid gap-1 text-xs font-bold">مصدر المخزون<select value={variant.inventorySource} onChange={e => updateVariant(index, { inventorySource: e.target.value as Variant['inventorySource'], supplierId: e.target.value === 'INTERNAL' ? '' : variant.supplierId })} className="rounded border bg-white p-2 font-normal"><option value="INTERNAL">مخزون المتجر</option><option value="SUPPLIER">مخزون مورد</option></select></label>
        {variant.inventorySource === 'SUPPLIER' ? <>
          <label className="grid gap-1 text-xs font-bold">المورد<select required value={variant.supplierId || ''} onChange={e => updateVariant(index, { supplierId: e.target.value })} className="rounded border bg-white p-2 font-normal"><option value="">اختر المورد</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name} ({supplier.profitMargin}%)</option>)}</select></label>
          <label className="grid gap-1 text-xs font-bold">تكلفة المورد<input required type="number" min="0" step="0.001" value={variant.supplierUnitCost || ''} onChange={e => updateVariant(index, { supplierUnitCost: e.target.value })} className="rounded border p-2 font-normal" /></label>
        </> : <div className="md:col-span-2" />}
        <div className="flex items-center gap-3 md:col-span-6"><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={variant.isActive} onChange={e => updateVariant(index, { isActive: e.target.checked })} /> فعال</label>{variants.length > 1 && <button type="button" onClick={() => setVariants(current => current.filter((_, i) => i !== index))} className="text-xs text-red-600">إزالة الخيار</button>}</div>
      </div>)}
    </section>

    <section className="space-y-3"><label className="grid gap-1 text-sm font-bold">صور جديدة<input name="newImages" type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" className="rounded border p-2 font-normal" /></label>{images.length > 0 && <div className="grid gap-2 sm:grid-cols-4">{images.map(image => <div key={image.id} className="rounded border p-2"><img src={image.url} alt="" className="aspect-square w-full object-cover" /><button type="button" onClick={() => setImages(current => current.filter(item => item.id !== image.id))} className="mt-2 text-xs text-red-600">حذف الصورة عند الحفظ</button></div>)}</div>}</section>

    <section className="flex flex-wrap gap-5"><label className="flex items-center gap-2 text-sm font-bold"><input name="isVisible" value="true" type="checkbox" defaultChecked={initialData?.isVisible ?? true} /> ظاهر في المتجر</label><label className="flex items-center gap-2 text-sm font-bold"><input name="isFeatured" value="true" type="checkbox" defaultChecked={initialData?.isFeatured ?? false} /> منتج مميز</label></section>
    <div className="flex justify-end gap-3 border-t pt-4"><Link href="/admin/products" className="rounded border px-5 py-2">إلغاء</Link><button disabled={pending} className="rounded bg-[#3F4B32] px-6 py-2 font-bold text-white disabled:opacity-50">{pending ? 'جاري الحفظ…' : 'حفظ المنتج'}</button></div>
  </form>;
}
