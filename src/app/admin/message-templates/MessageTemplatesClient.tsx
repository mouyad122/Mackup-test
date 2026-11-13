'use client';

import React, { useState, useTransition, useRef } from 'react';
import {
  MessageSquareText,
  Save,
  RotateCcw,
  CheckCircle2,
  Copy,
  Sparkles,
  ExternalLink,
  Store,
  User,
  Truck,
  HelpCircle,
  Eye,
  Check,
} from 'lucide-react';
import {
  saveMessageTemplateAction,
  resetMessageTemplateAction,
} from '@/actions/message-templates';
import type { MessageTemplateDef } from '@/lib/message-templates-shared';
import { compileTemplate } from '@/lib/message-templates-shared';

type TemplateItem = MessageTemplateDef & {
  currentContent: string;
  isCustom: boolean;
};

interface Props {
  initialTemplates: TemplateItem[];
}

export default function MessageTemplatesClient({ initialTemplates }: Props) {
  const [templates, setTemplates] = useState<TemplateItem[]>(initialTemplates);
  const [selectedKey, setSelectedKey] = useState<string>(
    initialTemplates[0]?.key || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CUSTOMER' | 'SHOP' | 'COURIER'>('ALL');
  const [isPending, startTransition] = useTransition();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const activeTemplate = templates.find((t) => t.key === selectedKey) || templates[0];
  const [editingContent, setEditingContent] = useState<string>(
    activeTemplate?.currentContent || ''
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync editor when switching template
  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    const found = templates.find((t) => t.key === key);
    if (found) {
      setEditingContent(found.currentContent);
    }
  };

  // Insert variable tag at cursor
  const handleInsertVariable = (varName: string) => {
    const tag = `{{${varName}}}`;
    const textarea = textareaRef.current;
    if (!textarea) {
      setEditingContent((prev) => prev + ' ' + tag);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent =
      editingContent.substring(0, start) + tag + editingContent.substring(end);
    setEditingContent(nextContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  // Save template
  const handleSave = () => {
    if (!activeTemplate) return;
    startTransition(async () => {
      try {
        await saveMessageTemplateAction(activeTemplate.key, editingContent);
        setTemplates((prev) =>
          prev.map((t) =>
            t.key === activeTemplate.key
              ? { ...t, currentContent: editingContent, isCustom: true }
              : t
          )
        );
        setNotification({
          type: 'success',
          message: 'تم حفظ واعتماد قالب الرسالة بنجاح، وستُرسل الرسائل المستقبلية بصيغته المعتمدة.',
        });
        setTimeout(() => setNotification(null), 4000);
      } catch (err: any) {
        setNotification({
          type: 'error',
          message: err.message || 'تعذر حفظ القالب',
        });
      }
    });
  };

  // Reset to system default
  const handleReset = () => {
    if (!activeTemplate) return;
    if (!confirm('هل أنت متأكد من استعادة النص الافتراضي الأصلي لهذا القالب؟')) return;

    startTransition(async () => {
      try {
        await resetMessageTemplateAction(activeTemplate.key);
        setEditingContent(activeTemplate.defaultContent);
        setTemplates((prev) =>
          prev.map((t) =>
            t.key === activeTemplate.key
              ? { ...t, currentContent: activeTemplate.defaultContent, isCustom: false }
              : t
          )
        );
        setNotification({
          type: 'success',
          message: 'تمت استعادة النص الافتراضي الأصلي للقالب بنجاح.',
        });
        setTimeout(() => setNotification(null), 4000);
      } catch (err: any) {
        setNotification({
          type: 'error',
          message: err.message || 'تعذر استعادة القالب',
        });
      }
    });
  };

  // Compute live preview text with realistic sample variables
  const sampleVariables: Record<string, string> = {
    customerName: 'سارة خالد',
    orderReference: 'ORD-20261113-101',
    totalAmount: '28.000',
    invoiceUrl: 'https://rawaq.jo/invoice/view/inv_sec_892',
    shopName: 'أبو أحمد - أزياء الشرق',
    ordersCount: '4',
    prepLink: 'https://rawaq.jo/supplier-portal/sec_token_902',
    expiresInHours: '72',
    profileUrl: 'https://rawaq.jo/supplier-profile/sup_east_fashion',
    captainName: 'أحمد المجالي',
    captainPhone: '0798765432',
  };

  const previewText = compileTemplate(editingContent, sampleVariables);

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(previewText);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  const filteredTemplates = templates.filter((t) => {
    if (categoryFilter === 'ALL') return true;
    return t.category === categoryFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shadow-2xs border border-emerald-100">
            <MessageSquareText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900">
              إدارة قوالب الرسائل والواتساب المعتمدة
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              تخصيص واعتماد صيغ رسائل تأكيد الطلب، روابط التجهيز للمحلات، وإشعارات الزبائن.
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-bold">
          {[
            { id: 'ALL', label: 'كافة القوالب' },
            { id: 'CUSTOMER', label: 'رسائل الزبائن' },
            { id: 'SHOP', label: 'رسائل المحلات' },
            { id: 'COURIER', label: 'التوصيل' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id as any)}
              className={`px-3 py-1.5 rounded-xl transition whitespace-nowrap ${
                categoryFilter === cat.id
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border animate-in fade-in duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <span className="w-4 h-4 text-rose-600 shrink-0">⚠️</span>
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Grid: Templates List & Editor/Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Templates List Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-bold text-stone-500 px-1 flex items-center justify-between">
            <span>اختر القالب للتعديل والاعتماد</span>
            <span>({filteredTemplates.length}) قوالب</span>
          </div>

          <div className="space-y-2.5">
            {filteredTemplates.map((t) => {
              const isSelected = t.key === selectedKey;
              return (
                <button
                  key={t.key}
                  onClick={() => handleSelectTemplate(t.key)}
                  className={`w-full text-right p-4 rounded-2xl border transition flex flex-col gap-2 shadow-2xs cursor-pointer ${
                    isSelected
                      ? 'bg-white border-[#3F4832] ring-2 ring-[#3F4832]/20'
                      : 'bg-white border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {t.category === 'CUSTOMER' && (
                        <span className="p-1 rounded-lg bg-pink-50 text-pink-700">
                          <User className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {t.category === 'SHOP' && (
                        <span className="p-1 rounded-lg bg-purple-50 text-purple-700">
                          <Store className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {t.category === 'COURIER' && (
                        <span className="p-1 rounded-lg bg-blue-50 text-blue-700">
                          <Truck className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <h4 className="text-xs font-extrabold text-stone-900 leading-tight">
                        {t.name}
                      </h4>
                    </div>

                    {t.isCustom ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        مخصص ومعتمد
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        افتراضي النظام
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Template Editor & Preview */}
        {activeTemplate ? (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
              {/* Active Template Meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-stone-900">
                      {activeTemplate.name}
                    </h2>
                    {activeTemplate.isCustom ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                        صيغة مخصصة معتمدة
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600">
                        الصيغة الافتراضية
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {activeTemplate.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeTemplate.isCustom && (
                    <button
                      onClick={handleReset}
                      disabled={isPending}
                      className="text-xs font-bold text-stone-600 hover:text-rose-700 bg-stone-50 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 px-3 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="استعادة النص الافتراضي للنظام"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>استعادة الافتراضي</span>
                    </button>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={isPending}
                    className="text-xs font-extrabold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isPending ? 'جاري الاعتماد...' : 'اعتماد وحفظ القالب'}</span>
                  </button>
                </div>
              </div>

              {/* Variables Insert Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    انقر لإدراج المتغيرات في نص القالب تلقائياً:
                  </span>
                  <span className="text-[11px] text-stone-400">
                    يتم استبدالها ببيانات الطلب الحقيقية عند الإرسال
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeTemplate.variables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => handleInsertVariable(v.name)}
                      className="px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-[#3F4832] hover:text-white text-stone-800 text-xs font-mono font-bold transition flex items-center gap-1 border border-stone-200 cursor-pointer shadow-2xs group"
                      title={`${v.label} (مثال: ${v.example})`}
                    >
                      <span className="text-emerald-700 group-hover:text-amber-300 font-sans font-bold text-[11px]">
                        + {v.label}:
                      </span>
                      <span>{`{{${v.name}}}`}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                  <label htmlFor="template-editor">محرر نص الرسالة (واتساب / نصي):</label>
                  <span className="text-[11px] text-stone-400 font-mono" dir="ltr">
                    {editingContent.length} chars • {editingContent.split(/\s+/).filter(Boolean).length} words
                  </span>
                </div>

                <textarea
                  id="template-editor"
                  ref={textareaRef}
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  rows={10}
                  className="w-full text-xs font-sans p-4 rounded-2xl border border-stone-300 bg-stone-50/50 text-stone-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3F4832]/30 leading-relaxed transition"
                  placeholder="اكتب نص الرسالة هنا..."
                  dir="rtl"
                />
              </div>

              {/* Live Preview Container (WhatsApp Style) */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-emerald-700" />
                    معاينة حية لشكل الرسالة في واتساب (ببيانات تجريبية):
                  </span>
                  <button
                    onClick={handleCopyPreview}
                    className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 bg-stone-100 px-2.5 py-1 rounded-lg transition"
                  >
                    {copiedPreview ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>نسخ المعاينة</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-[#EFEAE2] p-4 sm:p-6 rounded-3xl border border-stone-200 max-w-xl mx-auto shadow-inner">
                  {/* WhatsApp Chat Bubble */}
                  <div className="bg-white rounded-2xl rounded-tr-xs p-4 shadow-sm border border-stone-200/60 max-w-md ml-auto text-xs text-stone-800 space-y-2 font-sans relative">
                    <div className="whitespace-pre-wrap leading-relaxed select-text font-normal">
                      {previewText}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-stone-400 font-mono" dir="ltr">
                      <span>12:45 PM</span>
                      <span className="text-sky-500 font-bold">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 p-12 text-center text-xs text-stone-400">
            اختر قالباً من القائمة لعرضه وتعديله.
          </div>
        )}
      </div>
    </div>
  );
}
