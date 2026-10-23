'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryVisibility,
  initRawaqTaxonomyAction,
  type CategoryWithChildren,
} from '@/actions/categories';

interface CategoryTreeExplorerProps {
  tree: CategoryWithChildren[];
  flatCategories: { id: string; name: string; parentId: string | null; slug: string }[];
  templates: { id: string; code: string; nameAr: string }[];
}

export function CategoryTreeExplorer({
  tree,
  flatCategories,
  templates,
}: CategoryTreeExplorerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});

  // Modal states
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null);
  const [editingCategory, setEditingCategory] = useState<CategoryWithChildren | null>(null);
  const [targetParentId, setTargetParentId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formDefaultTemplateId, setFormDefaultTemplateId] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formImagePath, setFormImagePath] = useState<string>('');
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [formIsVisible, setFormIsVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<CategoryWithChildren | null>(null);
  const [fallbackId, setFallbackId] = useState<string>('');

  function toggleCollapse(id: string) {
    setCollapsedNodes(curr => ({ ...curr, [id]: !curr[id] }));
  }

  function expandAll() {
    setCollapsedNodes({});
  }

  function collapseAll() {
    const allIds: Record<string, boolean> = {};
    function collect(nodes: CategoryWithChildren[]) {
      for (const n of nodes) {
        if (n.children.length) {
          allIds[n.id] = true;
          collect(n.children);
        }
      }
    }
    collect(tree);
    setCollapsedNodes(allIds);
  }

  function openCreate(parentId: string | null = null) {
    setModalMode('CREATE');
    setEditingCategory(null);
    setTargetParentId(parentId);
    setFormName('');
    setFormParentId(parentId || '');
    setFormDefaultTemplateId('');
    setFormDescription('');
    setFormImagePath('');
    setFormImageFile(null);
    setImagePreview(null);
    setFormIsVisible(true);
    setErrorMessage('');
  }

  function openEdit(cat: CategoryWithChildren) {
    setModalMode('EDIT');
    setEditingCategory(cat);
    setTargetParentId(null);
    setFormName(cat.name);
    setFormParentId(cat.parentId || '');
    setFormDefaultTemplateId(cat.defaultTemplateId || '');
    setFormDescription(cat.description || '');
    setFormImagePath(cat.imagePath || '');
    setFormImageFile(null);
    setImagePreview(cat.imagePath || null);
    setFormIsVisible(cat.isVisible);
    setErrorMessage('');
  }

  function closeModal() {
    setModalMode(null);
    setEditingCategory(null);
    setTargetParentId(null);
    setErrorMessage('');
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage('');

    const formData = new FormData();
    formData.set('name', formName.trim());
    formData.set('parentId', formParentId);
    formData.set('defaultTemplateId', formDefaultTemplateId);
    formData.set('description', formDescription.trim());
    formData.set('isVisible', String(formIsVisible));
    if (formImageFile) {
      formData.append('image', formImageFile);
    } else if (formImagePath) {
      formData.set('imagePath', formImagePath.trim());
    } else {
      formData.set('removeImage', 'true');
    }

    startTransition(async () => {
      let res;
      if (modalMode === 'EDIT' && editingCategory) {
        res = await updateCategory(editingCategory.id, formData);
      } else {
        res = await createCategory(formData);
      }

      if (!res.success) {
        setErrorMessage(res.error || 'فشلت العملية.');
      } else {
        closeModal();
        router.refresh();
      }
    });
  }

  async function handleToggleVisibility(id: string, current: boolean) {
    startTransition(async () => {
      await toggleCategoryVisibility(id, !current);
      router.refresh();
    });
  }

  async function handleDelete(deleteProducts: boolean) {
    if (!deleteTarget) return;
    startTransition(async () => {
      const res = await deleteCategory(deleteTarget.id, deleteProducts, fallbackId || undefined);
      if (!res.success) {
        alert(res.error || 'تعذر الحذف');
      } else {
        setDeleteTarget(null);
        router.refresh();
      }
    });
  }

  async function handleSeedTaxonomy() {
    if (!confirm('هل تريد تثبيت شجرة الأقسام الافتراضية لمتجر رَواق (المكياج، الأزياء، العطور، العناية، الهدايا، الإكسسوارات)؟')) return;
    startTransition(async () => {
      await initRawaqTaxonomyAction();
      router.refresh();
    });
  }

  // Recursive render of category tree
  function renderNode(node: CategoryWithChildren, level: number = 1) {
    const isCollapsed = Boolean(collapsedNodes[node.id]);
    const hasChildren = node.children.length > 0;
    const matchesSearch = !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());

    const levelBadge =
      level === 1
        ? { text: 'مستوى 1 رئيسي', bg: 'bg-[#3F4832]/10 text-[#3F4832]' }
        : level === 2
        ? { text: 'مستوى 2 فرعي', bg: 'bg-amber-100 text-amber-900' }
        : { text: 'مستوى 3 تخصصي', bg: 'bg-blue-100 text-blue-900' };

    return (
      <div key={node.id} className="space-y-2">
        <div
          className={`flex flex-wrap items-center justify-between p-3.5 rounded-2xl border transition-all ${
            !node.isVisible
              ? 'bg-zinc-100/60 border-zinc-200 text-zinc-400'
              : level === 1
              ? 'bg-white border-zinc-200 shadow-sm hover:border-[#3F4832]/40'
              : level === 2
              ? 'bg-zinc-50/80 border-zinc-200 hover:border-zinc-300'
              : 'bg-white border-dashed border-zinc-200 hover:border-zinc-300'
          }`}
          style={{ marginRight: `${(level - 1) * 20}px` }}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleCollapse(node.id)}
                className="w-7 h-7 rounded-lg bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600 transition-transform"
              >
                {isCollapsed ? '+' : '−'}
              </button>
            ) : (
              <span className="w-7 text-center text-zinc-300 text-xs">●</span>
            )}

            {node.imagePath ? (
              <img
                src={node.imagePath}
                alt={node.name}
                className="w-10 h-10 rounded-xl object-cover border border-zinc-200 shrink-0"
              />
            ) : null}

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-zinc-900">{node.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${levelBadge.bg}`}>
                  {levelBadge.text}
                </span>
                {!node.isVisible && (
                  <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-2 py-0.5 rounded-full">
                    مخفي من المتجر 👁️‍🗨️
                  </span>
                )}
                {node.defaultTemplate && (
                  <span className="text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span>قالب:</span>
                    <span>{node.defaultTemplate.nameAr}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-[11px] text-zinc-400 font-mono">
                <span>slug: {node.slug}</span>
                <span>•</span>
                <span className="text-zinc-600 font-sans">
                  {node.directProductCount} منتج مباشر (الإجمالي مع الفروع: {node.rollupProductCount})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            {level < 3 && (
              <button
                type="button"
                onClick={() => openCreate(node.id)}
                className="text-xs font-bold text-[#3F4832] bg-[#3F4832]/10 hover:bg-[#3F4832]/20 px-3 py-1.5 rounded-xl transition-colors"
                title="إضافة قسم فرعي تحت هذا القسم"
              >
                + فرعي
              </button>
            )}

            <button
              type="button"
              onClick={() => handleToggleVisibility(node.id, node.isVisible)}
              className={`text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
                node.isVisible
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-500 hover:bg-zinc-200'
              }`}
              title={node.isVisible ? 'إخفاء من المتجر' : 'إظهار في المتجر'}
            >
              {node.isVisible ? 'ظاهر 🟢' : 'مخفي ⚪'}
            </button>

            <button
              type="button"
              onClick={() => openEdit(node)}
              className="text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-xl transition-colors"
            >
              تعديل ✏️
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteTarget(node);
                setFallbackId('');
              }}
              className="text-xs font-bold text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-xl transition-colors"
              title="حذف القسم"
            >
              🗑️
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <div className="border-r-2 border-zinc-200/80 pr-2 space-y-2 mt-2 mr-3">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="bg-white rounded-3xl p-5 border border-zinc-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="بحث في شجرة الأقسام..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-2 text-xs w-64 outline-none focus:border-[#3F4832] bg-zinc-50"
          />
          <button
            type="button"
            onClick={expandAll}
            className="text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl"
          >
            توسيع الكل ⊞
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="text-xs font-bold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl"
          >
            طي الكل ⊟
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={handleSeedTaxonomy}
            className="text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            ⚡ استيراد شجرة رَواق القياسية
          </button>
          <button
            type="button"
            onClick={() => openCreate(null)}
            className="text-xs font-bold text-white bg-[#3F4832] hover:bg-[#2d3623] px-5 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            + قسم رئيسي جديد
          </button>
        </div>
      </div>

      {/* Tree View Display */}
      {tree.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-zinc-300 shadow-sm">
          <span className="text-4xl block mb-3">🗂️</span>
          <h3 className="font-bold text-base text-zinc-800">لا توجد أقسام مسجلة في شجرة الكتالوج بعد</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            يمكنك إنشاء قسم رئيسي جديد، أو تثبيت شجرة أقسام رَواق القياسية بضغطة زر واحدة لإنشاء شجرة المكياج والأزياء والعطور والعناية تلقائياً.
          </p>
          <button
            type="button"
            disabled={isPending}
            onClick={handleSeedTaxonomy}
            className="mt-4 px-6 py-2.5 bg-[#3F4832] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#2d3623]"
          >
            ⚡ تثبيت شجرة أقسام رَواق الجاهزة الآن
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-sm space-y-3">
          {tree.map(rootNode => renderNode(rootNode, 1))}
        </div>
      )}

      {/* Modal: Create or Edit Category */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-zinc-100 max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h3 className="text-lg font-bold text-zinc-900">
                {modalMode === 'EDIT' ? `تعديل القسم: ${editingCategory?.name}` : 'إضافة قسم جديد'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="my-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 mt-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  اسم القسم <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="مثال: أحمر شفاه، عبايات مناسبات، دهن عود"
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-[#3F4832]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">القسم الأب (Parent Category)</label>
                <select
                  value={formParentId}
                  onChange={e => setFormParentId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-[#3F4832] bg-white font-medium"
                >
                  <option value="">-- بدون أب (قسم رئيسي Level 1) --</option>
                  {flatCategories
                    .filter(c => (editingCategory ? c.id !== editingCategory.id : true))
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  القالب الافتراضي المرتبط (Default Product Template)
                </label>
                <select
                  value={formDefaultTemplateId}
                  onChange={e => setFormDefaultTemplateId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-[#3F4832] bg-white font-medium"
                >
                  <option value="">-- بدون قالب محدد أو يرث من الأب --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.nameAr} ({t.code})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-400 mt-1">
                  عند اختيار الموظف لهذا الصنف أثناء إضافة منتج، سيتم تحميل حقول هذا القالب تلقائياً!
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">وصف القسم (اختياري)</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="موجز عن المنتجات التي يشملها هذا القسم..."
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none focus:border-[#3F4832]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">صورة القسم (Cover Image)</label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-zinc-200 shrink-0 bg-zinc-100">
                      <img src={imagePreview} alt="معاينة" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormImagePath('');
                          setFormImageFile(null);
                        }}
                        className="absolute top-1 start-1 bg-black/60 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-black"
                        title="إزالة الصورة"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-xs text-zinc-500 file:me-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#3F4832]/10 file:text-[#3F4832] hover:file:bg-[#3F4832]/20 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formImagePath}
                      onChange={e => {
                        setFormImagePath(e.target.value);
                        setImagePreview(e.target.value.trim() || null);
                      }}
                      placeholder="أو أدخلي رابط/مسار الصورة (مثال: /images/categories/makeup.jpg)"
                      className="w-full rounded-xl border border-zinc-200 p-2 text-[11px] outline-none focus:border-[#3F4832]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <input
                  type="checkbox"
                  id="formIsVisible"
                  checked={formIsVisible}
                  onChange={e => setFormIsVisible(e.target.checked)}
                  className="w-4 h-4 text-[#3F4832] rounded focus:ring-0 cursor-pointer"
                />
                <label htmlFor="formIsVisible" className="text-xs font-bold text-zinc-700 cursor-pointer">
                  تفعيل ظهور هذا القسم في متجر رَواق للعملاء
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-zinc-600 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 text-xs font-bold rounded-xl text-white bg-[#3F4832] hover:bg-[#2d3623] shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'جارِ الحفظ...' : modalMode === 'EDIT' ? 'حفظ التعديلات' : 'إضافة القسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Category */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-red-100 max-w-md w-full p-6 animate-in fade-in">
            <div className="text-3xl mb-2 text-red-500">🗑️</div>
            <h3 className="font-bold text-lg text-zinc-900">حذف القسم: {deleteTarget.name}</h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              هذا القسم يحتوي على {deleteTarget.directProductCount} منتج مباشر. اختر ماذا تريد أن تفعل بالمنتجات التابعة له:
            </p>

            <div className="space-y-3 mt-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  نقل المنتجات إلى قسم بديل:
                </label>
                <select
                  value={fallbackId}
                  onChange={e => setFallbackId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs outline-none bg-white"
                >
                  <option value="">-- اختر القسم البديل --</option>
                  {flatCategories
                    .filter(c => c.id !== deleteTarget.id)
                    .map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-zinc-600 hover:bg-zinc-100"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={!fallbackId || isPending}
                  onClick={() => handleDelete(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50"
                >
                  نقل المنتجات وحذف القسم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
