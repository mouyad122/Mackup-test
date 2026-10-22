'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { createProduct, updateProduct } from '@/actions/products';
import { detectTemplateCode } from '@/lib/product-template-detection';

type Variant = {
  id?: string;
  size: string;
  sku?: string;
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
  categoryId: string;
  productTemplateId?: string | null;
  attributeValues?: Record<string, string>;
  shortDescription: string | null;
  longDescription: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  variants: Variant[];
  images: { id: string; url: string; isMain: boolean }[];
};

export function ProductCatalogForm({
  productId,
  initialData,
  categories,
  suppliers,
  templates = [],
}: {
  productId?: string;
  initialData?: InitialData;
  categories: { id: string; name: string; slug?: string }[];
  suppliers: { id: string; name: string; profitMargin: number }[];
  templates?: {
    id: string;
    code: string;
    nameAr: string;
    fields: {
      attributeDefinitionId: string;
      isRequired: boolean;
      useAsVariant: boolean;
      attributeDefinition: {
        nameAr: string;
        inputType: string;
        optionsJson: string | null;
      };
    }[];
  }[];
}) {
  const [nameAr, setNameAr] = useState(initialData?.nameAr || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [templateId, setTemplateId] = useState(initialData?.productTemplateId || '');
  const [isTemplateManuallyChanged, setIsTemplateManuallyChanged] = useState(Boolean(initialData?.productTemplateId));
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(initialData?.attributeValues || {});

  const [variants, setVariants] = useState<Variant[]>(
    initialData?.variants.length
      ? initialData.variants
      : [{ size: 'قياسي', price: 25000, isActive: true, inventorySource: 'INTERNAL', supplierId: '', supplierUnitCost: '' }]
  );
  const [images, setImages] = useState(initialData?.images || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  // Automatic Template Detection based on Category & Product Name
  useEffect(() => {
    if (isTemplateManuallyChanged) return;
    const currentCategory = categories.find(c => c.id === categoryId);
    const detectedCode = detectTemplateCode(currentCategory?.name || currentCategory?.slug || '', nameAr);
    if (detectedCode) {
      const match = templates.find(t => t.code === detectedCode);
      if (match && match.id !== templateId) {
        setTemplateId(match.id);
      }
    }
  }, [categoryId, nameAr, isTemplateManuallyChanged, categories, templates, templateId]);

  const activeTemplate = useMemo(() => templates.find(item => item.id === templateId), [templateId, templates]);

  function updateVariant(index: number, patch: Partial<Variant>) {
    setVariants(current => current.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    formData.set('categoryId', categoryId);
    formData.set('variants', JSON.stringify(variants));
    formData.set('existingImageIds', JSON.stringify(images.map(image => image.id)));
    formData.set('productTemplateId', templateId);
    formData.set(
      'templateAttributes',
      JSON.stringify(
        Object.entries(templateValues)
          .filter(([, value]) => value !== '')
          .map(([attributeDefinitionId, value]) => ({ attributeDefinitionId, value }))
      )
    );
    const result = productId ? await updateProduct(productId, formData) : await createProduct(formData);
    if (result.success) {
      window.location.href = '/admin/products';
    } else {
      setError(result.error || 'تعذر حفظ المنتج.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-5xl space-y-6 rounded-xl border bg-white p-6 shadow-sm font-sans" dir="rtl">
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800">
          اسم المنتج بالعربية *
          <input
            name="nameAr"
            required
            value={nameAr}
            onChange={e => setNameAr(e.target.value)}
            placeholder="مثال: أحمر شفاه مخملي مطفي / عباية كريب مطرزة"
            className="rounded-lg border border-zinc-300 p-2.5 font-normal focus:border-[#3F4832] focus:outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800">
          اسم المنتج بالإنجليزية *
          <input
            name="nameEn"
            required
            defaultValue={initialData?.nameEn}
            placeholder="e.g. Velvet Matte Lipstick"
            className="rounded-lg border border-zinc-300 p-2.5 font-normal focus:border-[#3F4832] focus:outline-none"
            dir="ltr"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800 md:col-span-2">
          القسم الأساسي *
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={e => {
              setCategoryId(e.target.value);
              setIsTemplateManuallyChanged(false);
            }}
            className="rounded-lg border border-zinc-300 bg-white p-2.5 font-normal focus:border-[#3F4832] focus:outline-none"
          >
            <option value="">اختر القسم المناسب</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800 md:col-span-2">
          الوصف المختصر
          <textarea
            name="shortDescription"
            rows={2}
            defaultValue={initialData?.shortDescription || ''}
            className="rounded-lg border border-zinc-300 p-2.5 font-normal focus:border-[#3F4832] focus:outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800 md:col-span-2">
          الوصف التفصيلي
          <textarea
            name="longDescription"
            rows={4}
            defaultValue={initialData?.longDescription || ''}
            className="rounded-lg border border-zinc-300 p-2.5 font-normal focus:border-[#3F4832] focus:outline-none"
          />
        </label>
      </section>

      {/* Automatic Template & Attributes Section */}
      <section className="overflow-hidden rounded-xl border border-[#D9D3C7] bg-[#FAF8F5]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EAE5DC] bg-[#F4EFE6] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3F4832] text-xs text-white">✨</span>
            <div>
              <span className="text-xs text-zinc-500 block">نظام القوالب والخصائص الذكي:</span>
              <span className="font-bold text-sm text-[#3F4832]">
                {activeTemplate ? `قالب مفعّل: ${activeTemplate.nameAr}` : 'منتج عام (بدون خصائص إضافية)'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-600">تغيير يدوي:</span>
            <select
              value={templateId}
              onChange={e => {
                setTemplateId(e.target.value);
                setIsTemplateManuallyChanged(true);
              }}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 focus:border-[#3F4832] focus:outline-none"
            >
              <option value="">منتج عام</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nameAr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeTemplate && (
          <div className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {activeTemplate.fields
                .filter(field => !field.useAsVariant)
                .map(field => {
                  const options = field.attributeDefinition.optionsJson
                    ? (JSON.parse(field.attributeDefinition.optionsJson) as string[])
                    : [];
                  const val = templateValues[field.attributeDefinitionId] || '';

                  return (
                    <label key={field.attributeDefinitionId} className="grid gap-1.5 text-xs font-bold text-zinc-700">
                      <span>{field.attributeDefinition.nameAr}</span>
                      {field.attributeDefinition.inputType === 'SELECT' ? (
                        <select
                          value={val}
                          onChange={e =>
                            setTemplateValues(cur => ({ ...cur, [field.attributeDefinitionId]: e.target.value }))
                          }
                          className="rounded-lg border border-zinc-300 bg-white p-2 text-sm font-normal focus:border-[#3F4832] focus:outline-none"
                        >
                          <option value="">اختر {field.attributeDefinition.nameAr}</option>
                          {options.map(option => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : field.attributeDefinition.inputType === 'BOOLEAN' ? (
                        <select
                          value={val}
                          onChange={e =>
                            setTemplateValues(cur => ({ ...cur, [field.attributeDefinitionId]: e.target.value }))
                          }
                          className="rounded-lg border border-zinc-300 bg-white p-2 text-sm font-normal focus:border-[#3F4832] focus:outline-none"
                        >
                          <option value="">غير محدد</option>
                          <option value="true">نعم</option>
                          <option value="false">لا</option>
                        </select>
                      ) : field.attributeDefinition.inputType === 'TEXTAREA' ? (
                        <textarea
                          rows={2}
                          value={val}
                          onChange={e =>
                            setTemplateValues(cur => ({ ...cur, [field.attributeDefinitionId]: e.target.value }))
                          }
                          className="rounded-lg border border-zinc-300 p-2 text-sm font-normal focus:border-[#3F4832] focus:outline-none"
                        />
                      ) : (
                        <input
                          type={
                            field.attributeDefinition.inputType === 'NUMBER'
                              ? 'number'
                              : field.attributeDefinition.inputType === 'COLOR'
                              ? 'color'
                              : 'text'
                          }
                          value={val}
                          onChange={e =>
                            setTemplateValues(cur => ({ ...cur, [field.attributeDefinitionId]: e.target.value }))
                          }
                          className="rounded-lg border border-zinc-300 p-2 text-sm font-normal focus:border-[#3F4832] focus:outline-none"
                        />
                      )}
                    </label>
                  );
                })}
            </div>
          </div>
        )}
      </section>

      {/* Variants & Pricing Section - SKU is 100% hidden and auto-managed */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h2 className="font-bold text-zinc-900 text-base">المقاسات / الخيارات والأسعار</h2>
            <p className="text-xs text-zinc-500">حدد المقاس أو الدرجة وسعر البيع. رمز المنتج التلقائي يتم توليده وحمايته تلقائياً.</p>
          </div>
          <button
            type="button"
            onClick={() =>
              setVariants(current => [
                ...current,
                { size: '', price: 0, isActive: true, inventorySource: 'INTERNAL' },
              ])
            }
            className="rounded-lg border border-[#3F4832] px-4 py-1.5 text-xs font-bold text-[#3F4832] hover:bg-[#3F4832] hover:text-white transition-colors"
          >
            + إضافة خيار
          </button>
        </div>

        {variants.map((variant, index) => (
          <div key={variant.id || index} className="grid gap-3 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 md:grid-cols-5 items-end">
            <label className="grid gap-1 text-xs font-bold text-zinc-700">
              المقاس / الدرجة *
              <input
                required
                value={variant.size}
                placeholder="مثال: قياسي، S، 01 أحمر كلاسيكي"
                onChange={e => updateVariant(index, { size: e.target.value })}
                className="rounded-lg border border-zinc-300 bg-white p-2 font-normal focus:border-[#3F4832] focus:outline-none"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-zinc-700">
              السعر (د.أ) *
              <input
                required
                type="number"
                min="0"
                step="0.001"
                value={(variant.price / 1000).toFixed(3)}
                onChange={e => updateVariant(index, { price: Math.round(Number(e.target.value) * 1000) })}
                className="rounded-lg border border-zinc-300 bg-white p-2 font-normal focus:border-[#3F4832] focus:outline-none"
                dir="ltr"
              />
            </label>
            <label className="grid gap-1 text-xs font-bold text-zinc-700">
              مصدر المخزون
              <select
                value={variant.inventorySource}
                onChange={e =>
                  updateVariant(index, {
                    inventorySource: e.target.value as Variant['inventorySource'],
                    supplierId: e.target.value === 'INTERNAL' ? '' : variant.supplierId,
                  })
                }
                className="rounded-lg border border-zinc-300 bg-white p-2 font-normal focus:border-[#3F4832] focus:outline-none"
              >
                <option value="INTERNAL">مخزون المتجر الداخلي</option>
                <option value="SUPPLIER">مخزون مورد خارجي</option>
              </select>
            </label>

            {variant.inventorySource === 'SUPPLIER' ? (
              <>
                <label className="grid gap-1 text-xs font-bold text-zinc-700">
                  المورد *
                  <select
                    required
                    value={variant.supplierId || ''}
                    onChange={e => updateVariant(index, { supplierId: e.target.value })}
                    className="rounded-lg border border-zinc-300 bg-white p-2 font-normal focus:border-[#3F4832] focus:outline-none"
                  >
                    <option value="">اختر المورد</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.profitMargin}%)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-bold text-zinc-700">
                  تكلفة المورد (د.أ) *
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.001"
                    value={variant.supplierUnitCost || ''}
                    onChange={e => updateVariant(index, { supplierUnitCost: e.target.value })}
                    className="rounded-lg border border-zinc-300 bg-white p-2 font-normal focus:border-[#3F4832] focus:outline-none"
                  />
                </label>
              </>
            ) : (
              <div className="hidden md:block md:col-span-2" />
            )}

            <div className="flex items-center justify-between md:col-span-5 pt-2 border-t border-zinc-200">
              <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={variant.isActive}
                  onChange={e => updateVariant(index, { isActive: e.target.checked })}
                  className="rounded text-[#3F4832] focus:ring-[#3F4832]"
                />
                خيار معروض ومتاح للطلب
              </label>
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants(current => current.filter((_, i) => i !== index))}
                  className="text-xs text-red-600 hover:underline"
                >
                  حذف هذا الخيار
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Product Images */}
      <section className="space-y-3">
        <label className="grid gap-1.5 text-sm font-bold text-zinc-800">
          صور المنتج
          <input
            name="newImages"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="rounded-lg border border-zinc-300 p-2 font-normal"
          />
        </label>
        {images.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-4">
            {images.map(image => (
              <div key={image.id} className="relative rounded-lg border bg-zinc-50 p-2">
                <img src={image.url} alt="" className="aspect-square w-full rounded object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(current => current.filter(item => item.id !== image.id))}
                  className="mt-2 w-full text-center text-xs text-red-600 hover:underline"
                >
                  حذف الصورة
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Visibility Flags */}
      <section className="flex flex-wrap gap-6 pt-2">
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-800 cursor-pointer">
          <input
            name="isVisible"
            value="true"
            type="checkbox"
            defaultChecked={initialData?.isVisible ?? true}
            className="rounded text-[#3F4832] focus:ring-[#3F4832]"
          />
          ظاهر في المتجر
        </label>
        <label className="flex items-center gap-2 text-sm font-bold text-zinc-800 cursor-pointer">
          <input
            name="isFeatured"
            value="true"
            type="checkbox"
            defaultChecked={initialData?.isFeatured ?? false}
            className="rounded text-[#3F4832] focus:ring-[#3F4832]"
          />
          منتج مميز في الصفحة الرئيسية
        </label>
      </section>

      {/* Actions */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Link href="/admin/products" className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
          إلغاء
        </Link>
        <button
          disabled={pending}
          className="rounded-lg bg-[#3F4832] px-7 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#2d3623] transition-colors disabled:opacity-50"
        >
          {pending ? 'جاري الحفظ…' : 'حفظ المنتج'}
        </button>
      </div>
    </form>
  );
}
