'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createProduct, updateProduct, duplicateProduct } from '@/actions/products';
import { detectTemplateCode } from '@/lib/product-template-detection';
import { calculateSupplierSplit } from '@/lib/business-finance';

export type TemplateField = {
  attributeDefinitionId: string;
  isRequired: boolean;
  useAsVariant: boolean;
  sortOrder: number;
  attributeDefinition: {
    id?: string;
    key: string;
    nameAr: string;
    nameEn?: string | null;
    inputType: string;
    optionsJson: string | null;
  };
};

export type ProductTemplateItem = {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  fields: TemplateField[];
};

export type VariantRow = {
  id?: string;
  size: string;
  sku?: string;
  price: number; // in fils
  compareAt?: number | null; // in fils
  isActive: boolean;
  inventorySource: 'INTERNAL' | 'SUPPLIER';
  supplierId?: string;
  supplierUnitCost?: string; // in JOD for display
  supplierOfferUpdatedAt?: string | null;
};

export type ProductImageData = {
  id?: string;
  url: string;
  isMain: boolean;
  file?: File;
};

export type UnifiedProductInitialData = {
  nameAr: string;
  nameEn: string;
  categoryId: string;
  brandId?: string | null;
  productTemplateId?: string | null;
  attributeValues?: Record<string, string>;
  shortDescription: string | null;
  longDescription: string | null;
  isVisible: boolean;
  isFeatured: boolean;
  isBestSeller?: boolean;
  isNew?: boolean;
  isTrending?: boolean;
  tags?: string | null;
  barcode?: string | null;
  ingredients?: string | null;
  howToUse?: string | null;
  warnings?: string | null;
  finish?: string | null;
  coverage?: string | null;
  skinType?: string | null;
  benefits?: string | null;
  inventoryMode?: string;
  variants: VariantRow[];
  images: { id: string; url: string; isMain: boolean }[];
};

export type CategoryOption = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  defaultTemplateId?: string | null;
};

interface UnifiedProductManagerProps {
  productId?: string;
  initialData?: UnifiedProductInitialData;
  categories: CategoryOption[];
  brands?: { id: string; nameAr: string; nameEn?: string }[];
  suppliers: { id: string; name: string; profitMargin: number }[];
  warehouses?: { id: string; name: string }[];
  templates: ProductTemplateItem[];
}

const TEMPLATE_ICONS: Record<string, string> = {
  PERFUME: '✨',
  LIPSTICK: '💄',
  FOUNDATION: '🧴',
  SERUM: '💧',
  ABAYA: '🧕',
  JORDANIAN_DRESS: '🪡',
  DRESS: '👗',
  GIFTS: '🎁',
  ACCESSORIES: '💍',
  CUSTOM: '⚙️',
};

const SECTIONS = [
  { id: 'sec-basic', label: 'المعلومات الأساسية', icon: '📝' },
  { id: 'sec-template-attrs', label: 'خصائص نوع المنتج', icon: '🏷️' },
  { id: 'sec-variants', label: 'المتغيرات والمقاسات', icon: '🎛️' },
  { id: 'sec-pricing', label: 'الأسعار والربحية', icon: '💰' },
  { id: 'sec-suppliers', label: 'الموردون والتوريد', icon: '🤝' },
  { id: 'sec-inventory', label: 'المخزون والمستودع', icon: '📦' },
  { id: 'sec-media', label: 'الصور والوسائط', icon: '📸' },
  { id: 'sec-shipping', label: 'الشحن والقياسات', icon: '🚚' },
  { id: 'sec-seo', label: 'التسويق وSEO', icon: '🔍' },
  { id: 'sec-publish', label: 'النشر وحالة المنتج', icon: '🚀' },
  { id: 'sec-formulas', label: 'التركيبة والتعليمات', icon: '🧪' },
];

export function UnifiedProductManager({
  productId,
  initialData,
  categories,
  brands = [],
  suppliers,
  templates = [],
}: UnifiedProductManagerProps) {
  const router = useRouter();

  // Basic Information
  const [nameAr, setNameAr] = useState(initialData?.nameAr || '');
  const [nameEn, setNameEn] = useState(initialData?.nameEn || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
  const [brandId, setBrandId] = useState(initialData?.brandId || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [longDescription, setLongDescription] = useState(initialData?.longDescription || '');
  const [barcode, setBarcode] = useState(initialData?.barcode || '');
  const [tags, setTags] = useState(initialData?.tags || '');

  // Hierarchical category selection state (Level 1 -> Level 2 -> Level 3)
  const [selectedL1, setSelectedL1] = useState<string>('');
  const [selectedL2, setSelectedL2] = useState<string>('');
  const [selectedL3, setSelectedL3] = useState<string>('');

  // Template & Dynamic Attributes
  const [templateId, setTemplateId] = useState(initialData?.productTemplateId || '');
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(initialData?.attributeValues || {});
  const [isTemplateManuallyChosen, setIsTemplateManuallyChosen] = useState(Boolean(initialData?.productTemplateId));
  const [showTemplateSelector, setShowTemplateSelector] = useState(!productId && !initialData?.productTemplateId);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const [confirmSwitchDialogOpen, setConfirmSwitchDialogOpen] = useState(false);

  // Initialize hierarchical state from categoryId
  useEffect(() => {
    const targetCatId = categoryId || initialData?.categoryId;
    if (!targetCatId || !categories.length) return;
    const cat = categories.find(c => c.id === targetCatId);
    if (!cat) return;

    if (cat.parentId) {
      const p1 = categories.find(c => c.id === cat.parentId);
      if (p1?.parentId) {
        // cat is Level 3
        setSelectedL1(p1.parentId);
        setSelectedL2(p1.id);
        setSelectedL3(cat.id);
      } else if (p1) {
        // cat is Level 2
        setSelectedL1(p1.id);
        setSelectedL2(cat.id);
      }
    } else {
      // cat is Level 1
      setSelectedL1(cat.id);
    }
  }, [initialData?.categoryId, categories, categoryId]);

  const level1Categories = useMemo(() => categories.filter(c => !c.parentId), [categories]);
  const level2Categories = useMemo(() => categories.filter(c => c.parentId === selectedL1), [categories, selectedL1]);
  const level3Categories = useMemo(() => categories.filter(c => c.parentId === selectedL2), [categories, selectedL2]);

  function handleSelectL1(l1Id: string) {
    setSelectedL1(l1Id);
    setSelectedL2('');
    setSelectedL3('');
    setIsDirty(true);

    const hasChildren = categories.some(c => c.parentId === l1Id);
    if (!hasChildren) {
      setCategoryId(l1Id);
      const cat = categories.find(c => c.id === l1Id);
      if (cat?.defaultTemplateId) {
        setTemplateId(cat.defaultTemplateId);
        setIsTemplateManuallyChosen(true);
      }
    } else {
      setCategoryId('');
    }
  }

  function handleSelectL2(l2Id: string) {
    setSelectedL2(l2Id);
    setSelectedL3('');
    setIsDirty(true);

    const hasChildren = categories.some(c => c.parentId === l2Id);
    if (!hasChildren) {
      setCategoryId(l2Id);
      const cat = categories.find(c => c.id === l2Id);
      if (cat?.defaultTemplateId) {
        setTemplateId(cat.defaultTemplateId);
        setIsTemplateManuallyChosen(true);
      }
    } else {
      setCategoryId('');
    }
  }

  function handleSelectL3(l3Id: string) {
    setSelectedL3(l3Id);
    setCategoryId(l3Id);
    setIsDirty(true);

    const cat = categories.find(c => c.id === l3Id);
    if (cat?.defaultTemplateId) {
      setTemplateId(cat.defaultTemplateId);
      setIsTemplateManuallyChosen(true);
    }
  }

  const categoryBreadcrumbs = useMemo(() => {
    const parts: string[] = [];
    if (selectedL1) {
      const c1 = categories.find(c => c.id === selectedL1);
      if (c1) parts.push(c1.name);
    }
    if (selectedL2) {
      const c2 = categories.find(c => c.id === selectedL2);
      if (c2) parts.push(c2.name);
    }
    if (selectedL3) {
      const c3 = categories.find(c => c.id === selectedL3);
      if (c3) parts.push(c3.name);
    }
    return parts;
  }, [selectedL1, selectedL2, selectedL3, categories]);

  // Variants & Matrix
  const [variants, setVariants] = useState<VariantRow[]>(
    initialData?.variants?.length
      ? initialData.variants
      : [{ size: 'قياسي', price: 25000, compareAt: null, isActive: true, inventorySource: 'INTERNAL', supplierId: '', supplierUnitCost: '' }]
  );
  const [matrixSizes, setMatrixSizes] = useState('');
  const [matrixColors, setMatrixColors] = useState('');
  const [bulkPriceJOD, setBulkPriceJOD] = useState('');
  const [bulkCostJOD, setBulkCostJOD] = useState('');

  // Media
  const [images, setImages] = useState<ProductImageData[]>(
    initialData?.images?.map(img => ({ id: img.id, url: img.url, isMain: img.isMain })) || []
  );

  // Status & Flags
  const [isVisible, setIsVisible] = useState(initialData?.isVisible ?? false); // Draft by default for new
  const [isFeatured, setIsFeatured] = useState(initialData?.isFeatured ?? false);
  const [isBestSeller, setIsBestSeller] = useState(initialData?.isBestSeller ?? false);
  const [isNew, setIsNew] = useState(initialData?.isNew ?? true);
  const [isTrending, setIsTrending] = useState(initialData?.isTrending ?? false);
  const [inventoryMode, setInventoryMode] = useState(initialData?.inventoryMode || 'FINISHED_PRODUCT');

  // Formulations & Advanced Info
  const [ingredients, setIngredients] = useState(initialData?.ingredients || '');
  const [howToUse, setHowToUse] = useState(initialData?.howToUse || '');
  const [warnings, setWarnings] = useState(initialData?.warnings || '');

  // UI state
  const [activeSection, setActiveSection] = useState('sec-basic');
  const [pending, setPending] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mark dirty on any change
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Automatic Template Detection if not chosen manually
  useEffect(() => {
    if (isTemplateManuallyChosen) return;
    const cat = categories.find(c => c.id === categoryId);
    const detectedCode = detectTemplateCode(cat?.name || cat?.slug || '', nameAr);
    if (detectedCode) {
      const match = templates.find(t => t.code === detectedCode);
      if (match && match.id !== templateId) {
        setTemplateId(match.id);
      }
    }
  }, [categoryId, nameAr, isTemplateManuallyChosen, categories, templates, templateId]);

  const activeTemplate = useMemo(() => templates.find(t => t.id === templateId), [templateId, templates]);

  // Quality / Completion checklist calculation
  const completionStats = useMemo(() => {
    let completed = 0;
    const total = 7;

    if (nameAr.trim().length >= 3) completed++;
    if (categoryId) completed++;
    if (images.length > 0) completed++;
    if (variants.length > 0 && variants.every(v => v.price > 0 && v.size)) completed++;
    if (shortDescription.trim() || longDescription.trim()) completed++;
    if (templateId) completed++;
    if (brandId || tags) completed++;

    const percent = Math.round((completed / total) * 100);
    return { completed, total, percent };
  }, [nameAr, categoryId, images, variants, shortDescription, longDescription, templateId, brandId, tags]);

  // Pre-flight publish validation
  const publishErrors = useMemo(() => {
    const errs: string[] = [];
    if (!nameAr.trim()) errs.push('اسم المنتج باللغة العربية إلزامي.');
    if (!categoryId) errs.push('يرجى تحديد قسم وتصنيف المنتج.');
    if (!variants.length) errs.push('يجب إضافة خيار أو مقاس واحد على الأقل.');
    if (variants.some(v => !v.size || v.price <= 0)) errs.push('جميع المتغيرات يجب أن تحتوي على مقاس/اسم وسعر أكبر من صفر.');
    if (!images.length) errs.push('يجب إرفاق صورة واحدة على الأقل للمنتج قبل النشر.');
    
    // Check required template fields
    if (activeTemplate) {
      for (const field of activeTemplate.fields) {
        if (field.isRequired && !templateValues[field.attributeDefinitionId]?.trim()) {
          errs.push(`الحقل "${field.attributeDefinition.nameAr}" إلزامي لهذا النوع من المنتجات.`);
        }
      }
    }

    return errs;
  }, [nameAr, categoryId, variants, images, activeTemplate, templateValues]);

  // Live financial preview for first variant
  const financialPreview = useMemo(() => {
    const first = variants[0];
    if (!first) return null;
    const priceFils = first.price || 0;
    const costFils = first.supplierUnitCost ? Math.round(parseFloat(first.supplierUnitCost) * 1000) : 0;
    
    const supplier = suppliers.find(s => s.id === first.supplierId);
    const marginBps = supplier ? Math.round(supplier.profitMargin * 100) : 0;

    const split = calculateSupplierSplit(priceFils, costFils, marginBps);
    const grossMarginPercent = priceFils > 0 ? (((priceFils - costFils) / priceFils) * 100).toFixed(1) : '0';

    return {
      priceFils,
      costFils,
      grossProfit: split.profitBeforeShare,
      supplierObligation: split.supplierObligation,
      platformProfit: split.platformProductProfit,
      grossMarginPercent,
    };
  }, [variants, suppliers]);

  // Template switch handler with warning
  function requestTemplateChange(newId: string) {
    if (templateId && templateId !== newId && Object.keys(templateValues).length > 0) {
      setPendingTemplateId(newId);
      setConfirmSwitchDialogOpen(true);
    } else {
      setTemplateId(newId);
      setIsTemplateManuallyChosen(true);
      setShowTemplateSelector(false);
      setIsDirty(true);
    }
  }

  function confirmTemplateSwitch() {
    if (pendingTemplateId) {
      setTemplateId(pendingTemplateId);
      setIsTemplateManuallyChosen(true);
      setTemplateValues({}); // reset previous attributes
      setPendingTemplateId(null);
      setIsDirty(true);
    }
    setConfirmSwitchDialogOpen(false);
    setShowTemplateSelector(false);
  }

  // Variant operations
  function updateVariant(index: number, patch: Partial<VariantRow>) {
    setIsDirty(true);
    setVariants(curr => curr.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  function addVariant() {
    setIsDirty(true);
    setVariants(curr => [
      ...curr,
      {
        size: `خيار ${curr.length + 1}`,
        price: curr[0]?.price || 25000,
        compareAt: null,
        isActive: true,
        inventorySource: 'INTERNAL',
        supplierId: '',
        supplierUnitCost: '',
      },
    ]);
  }

  function removeVariant(index: number) {
    if (variants.length <= 1) {
      setError('لا يمكن حذف الخيار الوحيد للمنتج.');
      return;
    }
    setIsDirty(true);
    setVariants(curr => curr.filter((_, i) => i !== index));
  }

  // Matrix Generator
  function generateMatrix() {
    const rawSizes = matrixSizes.split(',').map(s => s.trim()).filter(Boolean);
    const rawColors = matrixColors.split(',').map(c => c.trim()).filter(Boolean);

    if (!rawSizes.length && !rawColors.length) {
      setError('أدخل مقاسات أو ألوان مفصولة بفواصل لتوليد المصفوفة.');
      return;
    }

    const sizes = rawSizes.length ? rawSizes : ['قياسي'];
    const colors = rawColors.length ? rawColors : [''];

    const newVariants: VariantRow[] = [];
    const defaultPrice = bulkPriceJOD ? Math.round(parseFloat(bulkPriceJOD) * 1000) : (variants[0]?.price || 25000);
    const defaultCost = bulkCostJOD || '';

    for (const size of sizes) {
      for (const color of colors) {
        const label = color ? `${size} - ${color}` : size;
        newVariants.push({
          size: label,
          price: defaultPrice,
          compareAt: null,
          isActive: true,
          inventorySource: 'INTERNAL',
          supplierId: '',
          supplierUnitCost: defaultCost,
        });
      }
    }

    if (newVariants.length > 0) {
      setVariants(newVariants);
      setIsDirty(true);
      setSuccessMessage(`تم توليد ${newVariants.length} خيار بنجاح!`);
      setTimeout(() => setSuccessMessage(''), 4000);
    }
  }

  function applyBulkPrice() {
    if (!bulkPriceJOD) return;
    const priceFils = Math.round(parseFloat(bulkPriceJOD) * 1000);
    setVariants(curr => curr.map(v => ({ ...v, price: priceFils })));
    setIsDirty(true);
  }

  function applyBulkCost() {
    if (!bulkCostJOD) return;
    setVariants(curr => curr.map(v => ({ ...v, supplierUnitCost: bulkCostJOD })));
    setIsDirty(true);
  }

  // Media handlers
  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newImgEntries: ProductImageData[] = files.map((file, idx) => ({
      url: URL.createObjectURL(file),
      isMain: images.length === 0 && idx === 0,
      file,
    }));

    setImages(curr => [...curr, ...newImgEntries]);
    setIsDirty(true);
    e.target.value = '';
  }

  function setMainImage(index: number) {
    setIsDirty(true);
    setImages(curr => curr.map((img, i) => ({ ...img, isMain: i === index })));
  }

  function removeImage(index: number) {
    setIsDirty(true);
    setImages(curr => {
      const filtered = curr.filter((_, i) => i !== index);
      if (filtered.length && !filtered.some(img => img.isMain)) {
        filtered[0].isMain = true;
      }
      return filtered;
    });
  }

  // Duplicate product
  async function handleDuplicate() {
    if (!productId) return;
    if (!confirm('هل تريد إنشاء نسخة مطابقة جديدة من هذا المنتج كمسودة؟')) return;

    setDuplicating(true);
    setError('');
    try {
      const res = await duplicateProduct(productId);
      if (!res.success || !res.productId) {
        throw new Error(res.error || 'فشل نسخ المنتج');
      }
      router.push(`/admin/products/${res.productId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر نسخ المنتج.');
      setDuplicating(false);
    }
  }

  // Form submission: Draft or Published
  async function handleSubmit(saveAsPublished: boolean) {
    setPending(true);
    setError('');
    setSuccessMessage('');

    if (saveAsPublished && publishErrors.length > 0) {
      setError(publishErrors[0]);
      setPending(false);
      return;
    }

    if (!nameAr.trim()) {
      setError('يرجى كتابة اسم المنتج بالعربية.');
      setPending(false);
      return;
    }

    if (!categoryId) {
      setError('يرجى اختيار تصنيف المنتج.');
      setPending(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set('nameAr', nameAr.trim());
      formData.set('nameEn', nameEn.trim() || nameAr.trim());
      formData.set('categoryId', categoryId);
      formData.set('brandId', brandId);
      formData.set('shortDescription', shortDescription.trim());
      formData.set('longDescription', longDescription.trim());
      formData.set('productTemplateId', templateId);
      formData.set('barcode', barcode.trim());
      formData.set('tags', tags.trim());
      formData.set('isVisible', String(saveAsPublished));
      formData.set('isFeatured', String(isFeatured));
      formData.set('isBestSeller', String(isBestSeller));
      formData.set('isNew', String(isNew));
      formData.set('isTrending', String(isTrending));
      formData.set('inventoryMode', inventoryMode);
      formData.set('ingredients', ingredients.trim());
      formData.set('howToUse', howToUse.trim());
      formData.set('warnings', warnings.trim());

      // Prepare variants payload
      const variantsPayload = variants.map(v => ({
        id: v.id,
        size: v.size.trim(),
        sku: v.sku,
        price: v.price,
        compareAt: v.compareAt,
        isActive: v.isActive,
        inventorySource: v.inventorySource,
        supplierId: v.supplierId || null,
        supplierUnitCost: v.supplierUnitCost || null,
        supplierOfferUpdatedAt: v.supplierOfferUpdatedAt || null,
      }));
      formData.set('variants', JSON.stringify(variantsPayload));

      // Existing image IDs vs new images
      const existingIds = images.filter(img => img.id && !img.file).map(img => img.id);
      formData.set('existingImageIds', JSON.stringify(existingIds));

      // Append new files
      for (const img of images) {
        if (img.file) {
          formData.append('newImages', img.file);
        }
      }

      // Template attributes
      const attrs = Object.entries(templateValues)
        .filter(([_, val]) => val !== undefined && val !== '')
        .map(([attrDefId, val]) => ({
          attributeDefinitionId: attrDefId,
          value: val,
        }));
      formData.set('templateAttributes', JSON.stringify(attrs));

      let result;
      if (productId) {
        result = await updateProduct(productId, formData);
      } else {
        result = await createProduct(formData);
      }

      if (!result.success) {
        throw new Error(result.error || 'فشلت العملية.');
      }

      setIsDirty(false);
      setSuccessMessage(saveAsPublished ? 'تم حفظ ونشر المنتج بنجاح!' : 'تم حفظ مسودة المنتج بنجاح!');

      if (!productId && 'productId' in result && result.productId) {
        router.push(`/admin/products/${result.productId}`);
      } else {
        router.refresh();
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المنتج.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex flex-col xl:flex-row gap-8 items-start pb-24">
      {/* Visual Template Selector Modal / Drawer if activated */}
      {showTemplateSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-zinc-100 p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-6 border-b border-zinc-100">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#3F4832] bg-[#3F4832]/10 px-3 py-1 rounded-full">
                  الخطوة 0: اختيار نوع المنتج
                </span>
                <h2 className="text-2xl font-bold font-heading text-zinc-900 mt-2">ماذا تريد أن تضيف إلى متجر رَواق؟</h2>
                <p className="text-xs text-zinc-500 mt-1">
                  اختر نوع المنتج ليتم تهيئة الحقول التخصصية والخيارات وقواعد التسعير المناسبة له تلقائياً.
                </p>
              </div>
              {templateId && (
                <button
                  type="button"
                  onClick={() => setShowTemplateSelector(false)}
                  className="rounded-full p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-6 max-h-[60vh] overflow-y-auto p-1">
              {templates.map(tmpl => {
                const icon = TEMPLATE_ICONS[tmpl.code] || '✨';
                const isSelected = tmpl.id === templateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => requestTemplateChange(tmpl.id)}
                    className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border-2 transition-all group ${
                      isSelected
                        ? 'border-[#3F4832] bg-[#3F4832]/5 shadow-md shadow-[#3F4832]/10 scale-[1.02]'
                        : 'border-zinc-200 hover:border-[#3F4832]/40 hover:bg-zinc-50/80'
                    }`}
                  >
                    <span className="text-3xl mb-3 transform group-hover:scale-110 transition-transform">{icon}</span>
                    <span className="font-bold text-sm text-zinc-900 group-hover:text-[#3F4832]">{tmpl.nameAr}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">{tmpl.nameEn || tmpl.code}</span>
                    <span className="mt-2 text-[10px] bg-zinc-100 group-hover:bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">
                      {tmpl.fields.length} حقول تخصصية
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center text-xs text-zinc-500">
              <span>يمكنك دائماً تغيير نوع المنتج لاحقاً من قسم الخصائص.</span>
              {templateId && (
                <button
                  type="button"
                  onClick={() => setShowTemplateSelector(false)}
                  className="px-5 py-2 rounded-xl bg-zinc-100 font-bold text-zinc-700 hover:bg-zinc-200"
                >
                  إغلاق والمتابعة
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Template Switching */}
      {confirmSwitchDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-2xl border border-amber-200 animate-in fade-in">
            <div className="text-3xl mb-2 text-amber-500">⚠️</div>
            <h3 className="font-bold text-lg text-zinc-900">تأكيد تغيير نوع المنتج</h3>
            <p className="text-sm text-zinc-600 mt-2 leading-relaxed">
              سيتم الاحتفاظ بالاسم والتسعير والصور والموردين، بينما سيتم تصفير قيم الحقول الخاصة بالقالب السابق لتناسب القالب الجديد. هل أنت متأكد من المتابعة؟
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setConfirmSwitchDialogOpen(false);
                  setPendingTemplateId(null);
                }}
                className="px-4 py-2 text-sm rounded-xl font-bold text-zinc-600 hover:bg-zinc-100"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmTemplateSwitch}
                className="px-5 py-2 text-sm rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
              >
                نعم، تغيير القالب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form Working Area */}
      <div className="flex-1 w-full space-y-8">
        {/* Banner: Template Info & Switcher */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#3F4832]/10 text-[#3F4832] flex items-center justify-center text-2xl">
              {activeTemplate ? (TEMPLATE_ICONS[activeTemplate.code] || '✨') : '📦'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-400">القالب النشط:</span>
                <span className="text-base font-bold text-zinc-900">
                  {activeTemplate ? activeTemplate.nameAr : 'لم يتم اختيار قالب محدد'}
                </span>
                {activeTemplate && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    مفعّل
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeTemplate
                  ? `يقدم ${activeTemplate.fields.length} حقول تخصصية لـ ${activeTemplate.nameAr}.`
                  : 'اختر نوع المنتج لتفعيل الحقول الذكية والتوليد التلقائي للمقاسات.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTemplateSelector(true)}
              className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 hover:bg-[#3F4832]/20 px-4 py-2 rounded-xl transition-colors"
            >
              🔄 تغيير نوع المنتج
            </button>
            {productId && (
              <button
                type="button"
                disabled={duplicating}
                onClick={handleDuplicate}
                className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                {duplicating ? 'جارِ النسخ...' : '📋 تكرار المنتج (Duplicate)'}
              </button>
            )}
          </div>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 flex items-center gap-3">
            <span className="text-lg">❌</span>
            <span>{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 flex items-center gap-3">
            <span className="text-lg">✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= SECTION 1: BASIC INFO ================= */}
        <section id="sec-basic" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">📝</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">المعلومات الأساسية للمنتج</h2>
              <p className="text-xs text-zinc-500">اسم المنتج، التصنيف، العلامة التجارية، والوصف التسويقي.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">
                اسم المنتج باللغة العربية <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={nameAr}
                onChange={e => {
                  setNameAr(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="مثال: عطر رَواق الملكي، عباية حرير مطرزة"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-[#3F4832] focus:ring-1 focus:ring-[#3F4832] outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">اسم المنتج باللغة الإنجليزية</label>
              <input
                type="text"
                value={nameEn}
                onChange={e => {
                  setNameEn(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Example: Rawaq Royal Oud Eau De Parfum"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-[#3F4832] focus:ring-1 focus:ring-[#3F4832] outline-none"
                dir="ltr"
              />
            </div>

            {/* 3-Level Cascading Hierarchical Category Selector */}
            <div className="md:col-span-2 space-y-3 bg-[var(--color-ivory-100)] p-4 rounded-2xl border border-zinc-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                  <span>🗂️ التصنيف الهرمي ونوع الصنف</span>
                  <span className="text-red-500">*</span>
                </label>
                {categoryBreadcrumbs.length > 0 && (
                  <div className="text-[11px] font-bold text-[#3F4832] bg-white px-3 py-1 rounded-full border border-[#3F4832]/20 flex items-center gap-1.5 shadow-sm">
                    <span className="text-zinc-400">المسار:</span>
                    {categoryBreadcrumbs.map((crumb, idx) => (
                      <React.Fragment key={crumb}>
                        {idx > 0 && <span className="text-zinc-300 font-normal">›</span>}
                        <span>{crumb}</span>
                      </React.Fragment>
                    ))}
                    {activeTemplate && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full mr-2">
                        قالب: {activeTemplate.nameAr} ✨
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Level 1: القسم الرئيسي */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-600 block">1. القسم الرئيسي</span>
                  <select
                    value={selectedL1}
                    onChange={e => handleSelectL1(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-[#3F4832] outline-none bg-white font-medium"
                  >
                    <option value="">-- اختر القسم الرئيسي --</option>
                    {level1Categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 2: القسم الفرعي */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-600 block">2. القسم الفرعي</span>
                  <select
                    disabled={!selectedL1 || level2Categories.length === 0}
                    value={selectedL2}
                    onChange={e => handleSelectL2(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-[#3F4832] outline-none bg-white disabled:bg-zinc-100 disabled:text-zinc-400 font-medium"
                  >
                    <option value="">
                      {!selectedL1 ? '-- اختر القسم الرئيسي أولاً --' : level2Categories.length === 0 ? '-- لا توجد أقسام فرعية --' : '-- اختر القسم الفرعي --'}
                    </option>
                    {level2Categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Level 3: الصنف / النوع المتخصص */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-600 block">3. نوع الصنف المتخصص</span>
                  <select
                    disabled={!selectedL2 || level3Categories.length === 0}
                    value={selectedL3}
                    onChange={e => handleSelectL3(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs focus:border-[#3F4832] outline-none bg-white disabled:bg-zinc-100 disabled:text-zinc-400 font-medium"
                  >
                    <option value="">
                      {!selectedL2 ? '-- اختر القسم الفرعي أولاً --' : level3Categories.length === 0 ? '-- مباشر تحت الفرعي --' : '-- اختر الصنف المتخصص --'}
                    </option>
                    {level3Categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!categoryId && (
                <p className="text-[10px] text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg">
                  ⚠️ يرجى تحديد التفرع المناسب للمنتج لاكتمال إعداده وتحميل قالبه المناسب تلقائياً.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">العلامة التجارية (Brand)</label>
              <select
                value={brandId}
                onChange={e => {
                  setBrandId(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-[#3F4832] focus:ring-1 focus:ring-[#3F4832] outline-none bg-white"
              >
                <option value="">-- علامة خاصة بـ رَواق (Private Label) أو بدون --</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.nameAr} {b.nameEn ? `(${b.nameEn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-zinc-700">الوصف القصير (المقدمة والبطاقة)</label>
              <textarea
                rows={2}
                value={shortDescription}
                onChange={e => {
                  setShortDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="وصف مختصر يظهر في بطاقات المتجر ونتائج البحث وموجز المنتج..."
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-[#3F4832] focus:ring-1 focus:ring-[#3F4832] outline-none"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-bold text-zinc-700">الوصف التفصيلي وقصة المنتج</label>
              <textarea
                rows={4}
                value={longDescription}
                onChange={e => {
                  setLongDescription(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="اكتب تفاصيل المنتج، مميزاته، الإلهام خلف تصميمه، والمزايا التنافسية..."
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm focus:border-[#3F4832] focus:ring-1 focus:ring-[#3F4832] outline-none"
              />
            </div>
          </div>
        </section>

        {/* ================= SECTION 2: DYNAMIC EAV ATTRIBUTES ================= */}
        <section id="sec-template-attrs" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <h2 className="text-lg font-bold font-heading text-zinc-900">
                  خصائص نوع المنتج: {activeTemplate?.nameAr || 'غير محدد'}
                </h2>
                <p className="text-xs text-zinc-500">
                  الحقول التخصصية المحفوظة في نموذج EAV بدون الحاجة لتعديل قاعدة البيانات.
                </p>
              </div>
            </div>
            <Link
              href="/admin/product-templates"
              target="_blank"
              className="text-xs text-[#3F4832] hover:underline font-semibold"
            >
              إعدادات القوالب المتقدمة ↗
            </Link>
          </div>

          {!activeTemplate || activeTemplate.fields.length === 0 ? (
            <div className="text-center py-8 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200">
              <p className="text-sm text-zinc-500">لم يتم تعيين حقول تخصصية لهذا القالب أو لم يتم اختيار قالب بعد.</p>
              <button
                type="button"
                onClick={() => setShowTemplateSelector(true)}
                className="mt-3 px-4 py-2 bg-[#3F4832] text-white text-xs font-bold rounded-xl"
              >
                اختر نوع المنتج الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeTemplate.fields.map(field => {
                const def = field.attributeDefinition;
                const value = templateValues[field.attributeDefinitionId] || '';
                const options: string[] = def.optionsJson ? JSON.parse(def.optionsJson) : [];

                return (
                  <div key={field.attributeDefinitionId} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-zinc-700">
                        {def.nameAr}
                        {field.isRequired && <span className="text-red-500 mr-1">*</span>}
                      </label>
                      <div className="flex items-center gap-1.5">
                        {field.isRequired ? (
                          <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">إلزامي</span>
                        ) : (
                          <span className="text-[10px] font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">اختياري</span>
                        )}
                        {field.useAsVariant && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">متغير</span>
                        )}
                      </div>
                    </div>

                    {/* Field input type render */}
                    {def.inputType === 'SELECT' ? (
                      <select
                        value={value}
                        onChange={e => {
                          setTemplateValues(curr => ({ ...curr, [field.attributeDefinitionId]: e.target.value }));
                          setIsDirty(true);
                        }}
                        className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm bg-white focus:border-[#3F4832] outline-none"
                      >
                        <option value="">-- اختر {def.nameAr} --</option>
                        {options.map(opt => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : def.inputType === 'MULTISELECT' ? (
                      <div className="flex flex-wrap gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200">
                        {options.map(opt => {
                          const currentArr = value ? value.split(',').map(s => s.trim()) : [];
                          const checked = currentArr.includes(opt);
                          return (
                            <label
                              key={opt}
                              className={`text-xs px-3 py-1.5 rounded-lg cursor-pointer border transition-colors ${
                                checked
                                  ? 'bg-[#3F4832] text-white border-[#3F4832]'
                                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={checked}
                                onChange={e => {
                                  let nextArr = [...currentArr];
                                  if (e.target.checked) {
                                    nextArr.push(opt);
                                  } else {
                                    nextArr = nextArr.filter(x => x !== opt);
                                  }
                                  setTemplateValues(curr => ({
                                    ...curr,
                                    [field.attributeDefinitionId]: nextArr.join(','),
                                  }));
                                  setIsDirty(true);
                                }}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    ) : def.inputType === 'TEXTAREA' ? (
                      <textarea
                        rows={2}
                        value={value}
                        onChange={e => {
                          setTemplateValues(curr => ({ ...curr, [field.attributeDefinitionId]: e.target.value }));
                          setIsDirty(true);
                        }}
                        placeholder={`أدخل ${def.nameAr}...`}
                        className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:border-[#3F4832] outline-none"
                      />
                    ) : def.inputType === 'BOOLEAN' ? (
                      <label className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl border border-zinc-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={value === 'true'}
                          onChange={e => {
                            setTemplateValues(curr => ({
                              ...curr,
                              [field.attributeDefinitionId]: e.target.checked ? 'true' : 'false',
                            }));
                            setIsDirty(true);
                          }}
                          className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
                        />
                        <span className="text-xs font-semibold text-zinc-700">تفعيل هذه الخاصية</span>
                      </label>
                    ) : def.inputType === 'COLOR' ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value || '#000000'}
                          onChange={e => {
                            setTemplateValues(curr => ({ ...curr, [field.attributeDefinitionId]: e.target.value }));
                            setIsDirty(true);
                          }}
                          className="w-10 h-10 rounded-xl border border-zinc-200 p-1 cursor-pointer bg-white"
                        />
                        <input
                          type="text"
                          value={value}
                          onChange={e => {
                            setTemplateValues(curr => ({ ...curr, [field.attributeDefinitionId]: e.target.value }));
                            setIsDirty(true);
                          }}
                          placeholder="#000000 أو اسم اللون"
                          className="flex-1 rounded-xl border border-zinc-200 p-2 text-sm focus:border-[#3F4832] outline-none"
                        />
                      </div>
                    ) : (
                      <input
                        type={def.inputType === 'NUMBER' ? 'number' : 'text'}
                        value={value}
                        onChange={e => {
                          setTemplateValues(curr => ({ ...curr, [field.attributeDefinitionId]: e.target.value }));
                          setIsDirty(true);
                        }}
                        placeholder={`أدخل ${def.nameAr}...`}
                        className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm focus:border-[#3F4832] outline-none"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ================= SECTION 3: VARIANTS & MATRIX GENERATOR ================= */}
        <section id="sec-variants" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎛️</span>
              <div>
                <h2 className="text-lg font-bold font-heading text-zinc-900">المتغيرات والمقاسات ومصفوفة الخيارات</h2>
                <p className="text-xs text-zinc-500">
                  إدارة المقاسات، الأحجام، والدرجات، مع مولد المصفوفات وتعديل الأسعار والمخزون دفعة واحدة.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="text-xs font-bold text-white bg-[#3F4832] hover:bg-[#2d3623] px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              + إضافة خيار يدوي
            </button>
          </div>

          {/* Quick Matrix Generator Box */}
          <div className="bg-[var(--color-ivory-100)] border border-amber-200/80 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-900 flex items-center gap-2">
                <span>⚡ مولد المصفوفات التلقائي (Color × Size Matrix Generator)</span>
              </h3>
              <span className="text-[10px] text-zinc-500">فصل القيم بفاصلة (,)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">المقاسات / الأحجام</label>
                <input
                  type="text"
                  placeholder="S, M, L, XL أو 50ml, 100ml"
                  value={matrixSizes}
                  onChange={e => setMatrixSizes(e.target.value)}
                  className="w-full bg-white rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-[#3F4832]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">الألوان / الدرجات (اختياري)</label>
                <input
                  type="text"
                  placeholder="أسود, كحلي, بيج"
                  value={matrixColors}
                  onChange={e => setMatrixColors(e.target.value)}
                  className="w-full bg-white rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-[#3F4832]"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-zinc-600 block mb-1">السعر الموحد (د.أ)</label>
                <div className="flex gap-1">
                  <input
                    type="number"
                    step="0.001"
                    placeholder="25.000"
                    value={bulkPriceJOD}
                    onChange={e => setBulkPriceJOD(e.target.value)}
                    className="w-full bg-white rounded-xl border border-zinc-200 p-2 text-xs outline-none focus:border-[#3F4832]"
                  />
                  <button
                    type="button"
                    onClick={applyBulkPrice}
                    className="px-2 py-1 bg-zinc-200 text-zinc-700 text-[10px] font-bold rounded-lg hover:bg-zinc-300"
                  >
                    تطبيق
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={generateMatrix}
                  className="w-full bg-[#3F4832] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#2d3623] transition-colors"
                >
                  ⚡ توليد الخيارات الآن
                </button>
              </div>
            </div>
          </div>

          {/* Variants Table */}
          <div className="overflow-x-auto rounded-2xl border border-zinc-200">
            <table className="w-full text-right text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-bold">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 min-w-[140px]">المقاس / الدرجة <span className="text-red-500">*</span></th>
                  <th className="p-3 min-w-[120px]">سعر البيع (د.أ) <span className="text-red-500">*</span></th>
                  <th className="p-3 min-w-[120px]">السعر قبل الخصم (د.أ)</th>
                  <th className="p-3 min-w-[110px]">رمز التتبع (SKU)</th>
                  <th className="p-3 min-w-[140px]">مصدر التوريد</th>
                  <th className="p-3 min-w-[100px]">الكلفة التقديرية</th>
                  <th className="p-3 w-16 text-center">الحالة</th>
                  <th className="p-3 w-12 text-center">حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {variants.map((v, index) => {
                  const priceJOD = (v.price / 1000).toFixed(3);
                  const compareJOD = v.compareAt ? (v.compareAt / 1000).toFixed(3) : '';
                  return (
                    <tr key={v.id || index} className="hover:bg-zinc-50/50">
                      <td className="p-3 text-center text-zinc-400 font-mono">{index + 1}</td>
                      <td className="p-3">
                        <input
                          type="text"
                          required
                          value={v.size}
                          onChange={e => updateVariant(index, { size: e.target.value })}
                          placeholder="مثال: Large أو 100ml"
                          className="w-full rounded-lg border border-zinc-200 p-2 text-xs focus:border-[#3F4832] outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.001"
                          required
                          value={priceJOD}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            updateVariant(index, { price: isNaN(val) ? 0 : Math.round(val * 1000) });
                          }}
                          className="w-full rounded-lg border border-zinc-200 p-2 text-xs focus:border-[#3F4832] outline-none font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.001"
                          value={compareJOD}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            updateVariant(index, {
                              compareAt: isNaN(val) || val <= 0 ? null : Math.round(val * 1000),
                            });
                          }}
                          placeholder="اختياري"
                          className="w-full rounded-lg border border-zinc-200 p-2 text-xs focus:border-[#3F4832] outline-none font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-3 text-zinc-500 font-mono text-[11px]" dir="ltr">
                        {v.sku || <span className="text-zinc-400 italic">تلقائي فريد</span>}
                      </td>
                      <td className="p-3">
                        <select
                          value={v.inventorySource}
                          onChange={e =>
                            updateVariant(index, {
                              inventorySource: e.target.value as 'INTERNAL' | 'SUPPLIER',
                            })
                          }
                          className="w-full rounded-lg border border-zinc-200 p-1.5 text-xs bg-white"
                        >
                          <option value="INTERNAL">مخزون داخلي</option>
                          <option value="SUPPLIER">مورد خارجي</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          step="0.001"
                          value={v.supplierUnitCost || ''}
                          onChange={e => updateVariant(index, { supplierUnitCost: e.target.value })}
                          placeholder="0.000"
                          className="w-full rounded-lg border border-zinc-200 p-2 text-xs focus:border-[#3F4832] outline-none font-mono"
                          dir="ltr"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={e => updateVariant(index, { isActive: e.target.checked })}
                          className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
                          title="فعال / معطل"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-red-500 hover:text-red-700 font-bold text-sm"
                          title="حذف الخيار"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ================= SECTION 4: FINANCIAL HUB & PROFIT CALCULATOR ================= */}
        <section id="sec-pricing" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">💰</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">الأسعار والتكلفة والأرباح (حسابات فلسية دقيقة)</h2>
              <p className="text-xs text-zinc-500">
                جميع العمليات الحسابية تتم بالأفلاس الصحيحة بدون فواصل عائمة، لضمان النزاهة المحاسبية وحصص الشركاء.
              </p>
            </div>
          </div>

          {financialPreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#3F4832]/5 border border-[#3F4832]/20 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-[#3F4832] block mb-1">سعر البيع للعميل</span>
                <span className="text-2xl font-bold font-mono text-zinc-900">
                  {(financialPreview.priceFils / 1000).toFixed(3)} <span className="text-xs text-zinc-500">د.أ</span>
                </span>
                <span className="text-[10px] text-zinc-400 block mt-1">{financialPreview.priceFils.toLocaleString()} فلس</span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-zinc-600 block mb-1">التكلفة الأساسية (Acquisition)</span>
                <span className="text-2xl font-bold font-mono text-zinc-900">
                  {(financialPreview.costFils / 1000).toFixed(3)} <span className="text-xs text-zinc-500">د.أ</span>
                </span>
                <span className="text-[10px] text-zinc-400 block mt-1">{financialPreview.costFils.toLocaleString()} فلس</span>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-emerald-800 block mb-1">صافي ربح المنصة التقديري</span>
                <span className="text-2xl font-bold font-mono text-emerald-900">
                  {(financialPreview.platformProfit / 1000).toFixed(3)} <span className="text-xs text-zinc-500">د.أ</span>
                </span>
                <span className="text-[10px] text-emerald-700 block mt-1">هامش الربح: {financialPreview.grossMarginPercent}%</span>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <span className="text-[11px] font-bold text-amber-800 block mb-1">مستحقات المورد الإجمالية</span>
                <span className="text-2xl font-bold font-mono text-amber-900">
                  {(financialPreview.supplierObligation / 1000).toFixed(3)} <span className="text-xs text-zinc-500">د.أ</span>
                </span>
                <span className="text-[10px] text-amber-700 block mt-1">التكلفة + نسبة المشاركة بالأرباح</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">أدخل خياراً وسعراً لحساب الأرباح التقديرية.</p>
          )}
        </section>

        {/* ================= SECTION 5: SUPPLIERS ================= */}
        <section id="sec-suppliers" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">🤝</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">الموردون ومصادر التوريد</h2>
              <p className="text-xs text-zinc-500">ربط المتغيرات بالموردين وتحديد نسب المشاركة ونوع التوريد.</p>
            </div>
          </div>

          <div className="space-y-4">
            {variants.map((v, i) => (
              <div key={v.id || i} className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="font-bold text-xs text-zinc-900 block">{v.size}</span>
                  <span className="text-[11px] text-zinc-500">
                    المصدر: {v.inventorySource === 'SUPPLIER' ? 'توريد خارجي من تاجر/مورد' : 'مخزون رَواق الداخلي'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={v.supplierId || ''}
                    onChange={e => updateVariant(i, { supplierId: e.target.value })}
                    className="rounded-xl border border-zinc-200 p-2 text-xs bg-white outline-none focus:border-[#3F4832]"
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (هامش المنصة: {s.profitMargin}%)
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-zinc-500">الكلفة:</span>
                    <input
                      type="number"
                      step="0.001"
                      value={v.supplierUnitCost || ''}
                      onChange={e => updateVariant(i, { supplierUnitCost: e.target.value })}
                      placeholder="0.000"
                      className="w-24 rounded-xl border border-zinc-200 p-1.5 text-xs text-center font-mono outline-none"
                    />
                    <span className="text-[11px] text-zinc-500">د.أ</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ================= SECTION 6: INVENTORY & WAREHOUSES ================= */}
        <section id="sec-inventory" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">المخزون والمستودعات ونمط الصنف</h2>
              <p className="text-xs text-zinc-500">تحديد طبيعة تخزين المنتج (منتج نهائي جاهز، أو سائل بالمليلترات للتركيب).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">نمط إدارة المخزون (Inventory Mode)</label>
              <select
                value={inventoryMode}
                onChange={e => {
                  setInventoryMode(e.target.value);
                  setIsDirty(true);
                }}
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm bg-white outline-none focus:border-[#3F4832]"
              >
                <option value="FINISHED_PRODUCT">منتج نهائي معبأ وجاهز للشحن (قطعة / علبة)</option>
                <option value="LIQUID_BULK">سائل خام / زيوت عطرية بالمليلتر (تركيب وتعبئة فورية)</option>
                <option value="ON_DEMAND">تصنيع حسب الطلب (تفصيل / تطريز مخصص)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">رمز الباركود العام (Barcode / GTIN)</label>
              <input
                type="text"
                value={barcode}
                onChange={e => {
                  setBarcode(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="مثال: 6291100000000"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832] font-mono"
                dir="ltr"
              />
            </div>
          </div>
        </section>

        {/* ================= SECTION 7: MEDIA & IMAGES ================= */}
        <section id="sec-media" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <h2 className="text-lg font-bold font-heading text-zinc-900">الصور والوسائط</h2>
                <p className="text-xs text-zinc-500">ارفع صور عالية الدقة للمنتج، وحدد الصورة الرئيسية للعرض في المتجر.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 hover:bg-[#3F4832]/20 px-4 py-2 rounded-xl transition-colors"
            >
              + رفع صور جديدة
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </div>

          {images.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 hover:border-[#3F4832] rounded-3xl p-12 text-center cursor-pointer transition-colors bg-zinc-50/50"
            >
              <span className="text-4xl block mb-3">🖼️</span>
              <p className="text-sm font-bold text-zinc-700">اضغط لرفع صور المنتج أو اسحبها إلى هنا</p>
              <p className="text-xs text-zinc-400 mt-1">يدعم صيغ JPG, PNG, WEBP (الحد الأقصى 5 ميجابايت لكل صورة)</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, idx) => (
                <div
                  key={img.id || img.url || idx}
                  className={`group relative rounded-2xl overflow-hidden border-2 aspect-square bg-zinc-100 shadow-sm transition-all ${
                    img.isMain ? 'border-[#3F4832] ring-2 ring-[#3F4832]/30' : 'border-zinc-200'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="Product media" className="w-full h-full object-cover" />

                  {img.isMain && (
                    <span className="absolute top-2 right-2 bg-[#3F4832] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                      رئيسية ⭐
                    </span>
                  )}

                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                    {!img.isMain && (
                      <button
                        type="button"
                        onClick={() => setMainImage(idx)}
                        className="bg-white/90 text-zinc-900 text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-white"
                      >
                        تعيين كرئيسية
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="bg-red-600/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-red-600"
                    >
                      حذف الصورة
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================= SECTION 8: SHIPPING & MEASUREMENTS ================= */}
        <section id="sec-shipping" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">🚚</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">الشحن والقياسات الفيزيائية</h2>
              <p className="text-xs text-zinc-500">حسابات الوزن وأبعاد التغليف لشركات التوصيل والشحن الدولي والمحلي.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">الوزن التقديري للشحن (جرام)</label>
              <input
                type="number"
                placeholder="مثال: 350"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">الأبعاد (طول × عرض × ارتفاع سم)</label>
              <input
                type="text"
                placeholder="15 × 10 × 5"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">شروط الشحن والحفظ</label>
              <select className="w-full rounded-xl border border-zinc-200 p-3 text-sm bg-white outline-none focus:border-[#3F4832]">
                <option value="NORMAL">شحن عادي قياسي</option>
                <option value="FRAGILE">قابل للكسر (زجاج / عطور فاخرة)</option>
                <option value="TEMPERATURE_CONTROLLED">يحتاج تبريد / عناية بالحرارة</option>
              </select>
            </div>
          </div>
        </section>

        {/* ================= SECTION 9: SEO & MARKETING ================= */}
        <section id="sec-seo" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">🔍</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">التسويق ومحركات البحث (SEO & Badges)</h2>
              <p className="text-xs text-zinc-500">معاينة مباشرة لشكل ظهور المنتج في جوجل وشارات التمييز على الواجهة.</p>
            </div>
          </div>

          {/* Badges Toggle */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <label className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${isFeatured ? 'bg-[#3F4832]/5 border-[#3F4832]' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="text-xs font-bold text-zinc-800">منتج مميز ⭐</span>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={e => {
                  setIsFeatured(e.target.checked);
                  setIsDirty(true);
                }}
                className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
              />
            </label>

            <label className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${isBestSeller ? 'bg-amber-50 border-amber-300' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="text-xs font-bold text-zinc-800">الأكثر مبيعاً 🔥</span>
              <input
                type="checkbox"
                checked={isBestSeller}
                onChange={e => {
                  setIsBestSeller(e.target.checked);
                  setIsDirty(true);
                }}
                className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
              />
            </label>

            <label className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${isNew ? 'bg-blue-50 border-blue-300' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="text-xs font-bold text-zinc-800">وصل حديثاً ✨</span>
              <input
                type="checkbox"
                checked={isNew}
                onChange={e => {
                  setIsNew(e.target.checked);
                  setIsDirty(true);
                }}
                className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
              />
            </label>

            <label className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition-colors ${isTrending ? 'bg-rose-50 border-rose-300' : 'bg-zinc-50 border-zinc-200'}`}>
              <span className="text-xs font-bold text-zinc-800">ترند رَواق 🚀</span>
              <input
                type="checkbox"
                checked={isTrending}
                onChange={e => {
                  setIsTrending(e.target.checked);
                  setIsDirty(true);
                }}
                className="w-4 h-4 text-[#3F4832] rounded focus:ring-0"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">الكلمات الدلالية والوسوم (Tags)</label>
              <input
                type="text"
                value={tags}
                onChange={e => {
                  setTags(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="عطور, بخور, هدايا, مسك, عود (مفصولة بفواصل)"
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
              />
            </div>

            {/* Google SERP Live Preview */}
            <div className="mt-4 p-4 rounded-2xl bg-[#f8f9fa] border border-zinc-200" dir="ltr">
              <span className="text-[10px] font-bold text-zinc-400 block mb-2" dir="rtl">معاينة نتيجة بحث جوجل (SERP Preview):</span>
              <div className="text-xs text-[#202124]">https://rawaq.jo/products/{nameAr ? encodeURIComponent(nameAr.slice(0, 15)) : 'example-product'}</div>
              <div className="text-base text-[#1a0dab] font-medium hover:underline cursor-pointer">
                {nameAr || 'اسم المنتج'} | رَواق للأزياء والعطور الفاخرة
              </div>
              <div className="text-xs text-[#4d5156] mt-0.5 line-clamp-2">
                {shortDescription || longDescription || 'تسوق أرقى المنتجات التراثية والعطور والعناية من متجر رَواق مع شحن سريع وضمان الأصالة.'}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECTION 10: PUBLISHING & VALIDATION ================= */}
        <section id="sec-publish" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">🚀</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">النشر وقنوات البيع وحالة التوفر</h2>
              <p className="text-xs text-zinc-500">قائمة التحقق قبل النشر (Pre-flight launch checklist) وقنوات التوزيع.</p>
            </div>
          </div>

          {/* Pre-flight checklist */}
          <div className="rounded-2xl border border-zinc-200 p-5 bg-zinc-50 mb-6">
            <h3 className="text-xs font-bold text-zinc-900 mb-3">قائمة الجاهزية للنشر على المتجر:</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <span className={nameAr.trim() ? 'text-emerald-600' : 'text-red-500'}>
                  {nameAr.trim() ? '✓' : '✗'}
                </span>
                <span className={nameAr.trim() ? 'text-zinc-700' : 'text-zinc-400 font-bold'}>
                  اسم المنتج باللغة العربية
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className={categoryId ? 'text-emerald-600' : 'text-red-500'}>
                  {categoryId ? '✓' : '✗'}
                </span>
                <span className={categoryId ? 'text-zinc-700' : 'text-zinc-400 font-bold'}>
                  تحديد قسم وتصنيف المنتج
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className={variants.length && variants.every(v => v.price > 0) ? 'text-emerald-600' : 'text-red-500'}>
                  {variants.length && variants.every(v => v.price > 0) ? '✓' : '✗'}
                </span>
                <span className={variants.length && variants.every(v => v.price > 0) ? 'text-zinc-700' : 'text-zinc-400 font-bold'}>
                  تحديد سعر خيار واحد على الأقل للمنتج
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className={images.length > 0 ? 'text-emerald-600' : 'text-red-500'}>
                  {images.length > 0 ? '✓' : '✗'}
                </span>
                <span className={images.length > 0 ? 'text-zinc-700' : 'text-zinc-400 font-bold'}>
                  إرفاق صورة واحدة على الأقل للمنتج
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#3F4832]/5 border border-[#3F4832]/20">
            <div>
              <span className="text-xs font-bold text-zinc-900 block">حالة المنتج الحالية في النظام</span>
              <span className="text-[11px] text-zinc-500">
                {isVisible ? 'المنتج متاح ونشط لعملاء المتجر وقنوات البيع' : 'المنتج مسودة داخلية غير مرئي للعملاء'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSubmit(false)}
                className="px-5 py-2.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 transition-colors shadow-sm disabled:opacity-50"
              >
                💾 حفظ كمسودة (Draft)
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleSubmit(true)}
                className="px-6 py-2.5 rounded-xl bg-[#3F4832] hover:bg-[#2d3623] text-xs font-bold text-white transition-colors shadow-sm disabled:opacity-50"
              >
                🚀 {productId ? 'حفظ ونشر التعديلات' : 'نشر المنتج الآن'}
              </button>
            </div>
          </div>
        </section>

        {/* ================= SECTION 11: FORMULAS & INSTRUCTIONS ================= */}
        <section id="sec-formulas" className="bg-white rounded-3xl p-6 md:p-8 border border-zinc-200/80 shadow-sm scroll-mt-24">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
            <span className="text-2xl">🧪</span>
            <div>
              <h2 className="text-lg font-bold font-heading text-zinc-900">الخصائص المتقدمة والتركيبات والتعليمات</h2>
              <p className="text-xs text-zinc-500">قائمة المكونات، طريقة الاستخدام المثلى، والتحذيرات الطبية أو الاستهلاكية.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">المكونات الرئيسية (INCI Ingredients)</label>
              <textarea
                rows={2}
                value={ingredients}
                onChange={e => {
                  setIngredients(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="قائمة المكونات الفعالة والزيوت الطبيعية..."
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">طريقة الاستخدام وتوصيات العناية (How to use)</label>
              <textarea
                rows={2}
                value={howToUse}
                onChange={e => {
                  setHowToUse(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="إرشادات وضع العطر، أو غسل الثوب والعباية، أو روتين السيروم..."
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-700">التحذيرات وموانع الاستخدام (Warnings)</label>
              <textarea
                rows={2}
                value={warnings}
                onChange={e => {
                  setWarnings(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="للاستخدام الخارجي فقط، يُحفظ بعيداً عن متناول الأطفال، تجنب ملامسة العين..."
                className="w-full rounded-xl border border-zinc-200 p-3 text-sm outline-none focus:border-[#3F4832]"
              />
            </div>
          </div>
        </section>
      </div>

      {/* ================= STICKY RIGHT NAVIGATION SIDEBAR ================= */}
      <aside className="w-full xl:w-72 xl:sticky xl:top-8 space-y-4 order-first xl:order-last">
        {/* Progress Card */}
        <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-700">معدل اكتمال البيانات</span>
            <span className="text-xs font-mono font-bold text-[#3F4832]">{completionStats.percent}%</span>
          </div>

          <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden mb-3">
            <div
              className="bg-[#3F4832] h-full rounded-full transition-all duration-300"
              style={{ width: `${completionStats.percent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{completionStats.completed} من {completionStats.total} ركائز مكتملة</span>
            <span>{isVisible ? 'منشور 🟢' : 'مسودة 🟡'}</span>
          </div>
        </div>

        {/* Section Links */}
        <nav className="bg-white rounded-3xl p-3 border border-zinc-200/80 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 px-3 py-1 block">أقسام الملف التعريفي:</span>
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActiveSection(sec.id);
                document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-right ${
                activeSection === sec.id
                  ? 'bg-[#3F4832] text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{sec.icon}</span>
                <span>{sec.label}</span>
              </div>
            </button>
          ))}
        </nav>

        {/* Quick Action Buttons */}
        <div className="bg-white rounded-3xl p-4 border border-zinc-200/80 shadow-sm space-y-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(true)}
            className="w-full py-3 bg-[#3F4832] hover:bg-[#2d3623] text-white font-bold text-xs rounded-2xl shadow-sm transition-colors disabled:opacity-50"
          >
            {pending ? 'جارِ الحفظ...' : productId ? 'حفظ ونشر التعديلات' : 'نشر المنتج للمتجر'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => handleSubmit(false)}
            className="w-full py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs rounded-2xl transition-colors disabled:opacity-50"
          >
            حفظ كمسودة فقط
          </button>
        </div>
      </aside>
    </div>
  );
}
