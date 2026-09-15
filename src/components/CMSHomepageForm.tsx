'use client';

import React, { useState, useTransition } from 'react';
import { 
  updateHeroCarouselSettings, 
  createHeroSlide, 
  updateHeroSlide, 
  deleteHeroSlide, 
  reorderHeroSlides, 
  updateStoreLocationSettings 
} from '@/actions/homepage-cms';
import { uploadMedia } from '@/actions/upload';

const isVideo = (path: string) => /\.(mp4|webm|ogg)$/i.test(path || '');

const MediaPreview = ({ url, isMobile }: { url: string; isMobile: boolean }) => {
  if (!url || url === '/slide-placeholder.jpg' || url === '/slide-placeholder-mobile.jpg') {
    return (
      <div className={`bg-zinc-50 border-2 border-dashed flex items-center justify-center text-zinc-400 text-xs rounded-lg ${isMobile ? 'w-32 h-48 mx-auto' : 'w-full h-40'}`}>
        لم يتم رفع ملف بعد
      </div>
    );
  }
  return (
    <div className={`relative bg-black rounded-lg overflow-hidden shadow-inner ${isMobile ? 'w-32 h-48 mx-auto' : 'w-full h-40'}`}>
      {isVideo(url) ? (
        <video src={url} autoPlay loop muted className="w-full h-full object-cover" />
      ) : (
        <img src={url} alt="Preview" className="w-full h-full object-cover" />
      )}
    </div>
  );
};

const SlideEditor = ({ 
  slide, 
  setSlide, 
  onSave, 
  onCancel, 
  isPending, 
  isEdit,
  handleFileUpload,
  products,
  categories
}: any) => {
  return (
    <form onSubmit={onSave} className="bg-zinc-50/50 p-6 rounded-xl border border-zinc-200 shadow-sm space-y-8">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-sm font-bold text-[var(--color-charcoal-900)]">
          {isEdit ? 'تعديل الإعلان الحالي' : 'إضافة إعلان جديد'}
        </h3>
        {isEdit && (
          <button type="button" onClick={onCancel} className="text-xs text-red-600 hover:underline font-bold">
            إغلاق التعديل ✕
          </button>
        )}
      </div>
      
      {/* 1. Media Section */}
      <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-[var(--color-charcoal-800)] border-b pb-2">1. صورة أو فيديو الإعلان</h4>
        <div className="flex justify-center">
          <div className="space-y-3 text-center w-full max-w-md">
            <label className="text-xs font-bold text-zinc-700 block">نسخة الكمبيوتر والجوال (Desktop & Mobile)</label>
            <MediaPreview url={slide.imageDesktopPath} isMobile={false} />
            <label className="bg-[var(--color-champagne-600)] hover:bg-[var(--color-champagne-500)] text-white px-4 py-2 rounded text-xs cursor-pointer inline-block shadow-sm transition-colors font-bold mt-2">
              تغيير الصورة/الفيديو
              <input type="file" className="hidden" accept="image/*,video/*" onChange={(e) => handleFileUpload(e, false, isEdit)} />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Text Content */}
      <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-[var(--color-charcoal-800)] border-b pb-2">2. النص المكتوب على الإعلان</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-700 font-bold">العنوان العريض</label>
            <input 
              type="text" 
              value={slide.titleAr} 
              onChange={(e) => setSlide({ ...slide, titleAr: e.target.value })}
              required
              placeholder="مثال: تشكيلة الصيف الجديدة"
              className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-700 font-bold">العنوان (إنجليزي)</label>
            <input 
              type="text" 
              value={slide.titleEn} 
              onChange={(e) => setSlide({ ...slide, titleEn: e.target.value })}
              required
              dir="ltr"
              placeholder="New Summer Collection"
              className="w-full border rounded p-2 text-xs bg-white text-left focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-700 font-bold">وصف قصير (اختياري)</label>
            <input 
              type="text" 
              value={slide.descriptionAr} 
              onChange={(e) => setSlide({ ...slide, descriptionAr: e.target.value })}
              placeholder="وصف مشوق أسفل العنوان..."
              className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-700 font-bold">وصف قصير (إنجليزي)</label>
            <input 
              type="text" 
              value={slide.descriptionEn} 
              onChange={(e) => setSlide({ ...slide, descriptionEn: e.target.value })}
              dir="ltr"
              className="w-full border rounded p-2 text-xs bg-white text-left focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
            />
          </div>
        </div>
      </div>

      {/* 3. Actions / Destination */}
      <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
        <h4 className="font-bold text-sm text-[var(--color-charcoal-800)] border-b pb-2">3. أين يذهب الزبون عند الضغط؟</h4>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-700 font-bold">نوع التوجيه</label>
              <select
                value={slide.destinationType}
                onChange={(e) => setSlide({ ...slide, destinationType: e.target.value, productId: '', categoryId: '', externalUrl: '', internalPath: '' })}
                className="w-full border rounded p-2 text-xs bg-white focus:ring-2 focus:ring-[var(--color-champagne-600)] outline-none"
              >
                <option value="NONE">بدون رابط (إعلان للعرض فقط)</option>
                <option value="PRODUCT">يذهب إلى منتج معين</option>
                <option value="CATEGORY">يذهب إلى مجموعة/تصنيف</option>
                <option value="EXTERNAL_URL">رابط خارجي (انستغرام، واتساب...)</option>
                <option value="INTERNAL_ROUTE">صفحة أخرى في المتجر</option>
              </select>
            </div>
            
            {slide.destinationType === 'PRODUCT' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-700 font-bold">اختر المنتج</label>
                <select
                  value={slide.productId || ''}
                  onChange={(e) => setSlide({ ...slide, productId: e.target.value })}
                  className="w-full border rounded p-2 text-xs bg-white"
                  required
                >
                  <option value="">-- اختر المنتج من القائمة --</option>
                  {products.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.nameAr}</option>
                  ))}
                </select>
              </div>
            )}

            {slide.destinationType === 'CATEGORY' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-700 font-bold">اختر المجموعة</label>
                <select
                  value={slide.categoryId || ''}
                  onChange={(e) => setSlide({ ...slide, categoryId: e.target.value })}
                  className="w-full border rounded p-2 text-xs bg-white"
                  required
                >
                  <option value="">-- اختر المجموعة من القائمة --</option>
                  {categories.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {slide.destinationType === 'EXTERNAL_URL' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-700 font-bold">أدخل الرابط الخارجي كاملًا</label>
                <input
                  type="url"
                  value={slide.externalUrl || ''}
                  onChange={(e) => setSlide({ ...slide, externalUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                  required
                />
              </div>
            )}

            {slide.destinationType === 'INTERNAL_ROUTE' && (
              <div className="space-y-1">
                <label className="text-xs text-zinc-700 font-bold">رابط الصفحة</label>
                <select
                  value={slide.internalPath || ''}
                  onChange={(e) => setSlide({ ...slide, internalPath: e.target.value })}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                  required
                >
                  <option value="">-- اختر الصفحة --</option>
                  <option value="/about">من نحن (/about)</option>
                  <option value="/contact">تواصل معنا (/contact)</option>
                  <option value="/faq">الأسئلة الشائعة (/faq)</option>
                  <option value="/shipping">الشحن والتوصيل (/shipping)</option>
                  <option value="/returns">سياسة الاسترجاع (/returns)</option>
                  <option value="/privacy">سياسة الخصوصية (/privacy)</option>
                  <option value="/terms">الشروط والأحكام (/terms)</option>
                  <option value="/shop">المتجر (/shop)</option>
                  <option value="/offers">العروض (/offers)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <button type="submit" disabled={isPending} className="bg-[var(--color-charcoal-900)] hover:bg-[var(--color-charcoal-800)] text-white font-bold px-8 py-3 rounded text-sm transition-colors shadow-md">
          {isPending ? 'جاري الحفظ...' : (isEdit ? 'حفظ التعديلات' : 'إضافة الإعلان الجديد ونشره')}
        </button>
        {isEdit && (
          <button type="button" onClick={onCancel} className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 font-bold px-8 py-3 rounded text-sm transition-colors">
            إلغاء
          </button>
        )}
      </div>
    </form>
  );
};
interface CMSHomepageFormProps {
  carouselSettings: any;
  slides: any[];
  locationSettings: any;
  products: any[];
  categories: any[];

  adminId: string;
}

export function CMSHomepageForm({ 
  carouselSettings: initialCarouselSettings, 
  slides: initialSlides, 
  locationSettings: initialLocationSettings,
  products,
  categories,
  adminId 
}: CMSHomepageFormProps) {
  const [carousel, setCarousel] = useState(initialCarouselSettings);
  const [slides, setSlides] = useState<any[]>(initialSlides);
  const [location, setLocation] = useState(initialLocationSettings);

  const [editingSlide, setEditingSlide] = useState<any | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create new slide template state
  const [newSlide, setNewSlide] = useState<any>({
    titleAr: '',
    titleEn: '',
    descriptionAr: '',
    descriptionEn: '',
    eyebrowAr: '',
    eyebrowEn: '',
    ctaAr: '',
    ctaEn: '',
    imageDesktopPath: '/slide-placeholder.jpg',
    imageMobilePath: '/slide-placeholder-mobile.jpg',
    altAr: '',
    altEn: '',
    destinationType: 'NONE',
    productId: '',
    categoryId: '',
    internalPath: '',
    externalUrl: '',
    displayOrder: 0,
    isEnabled: true,
    startsAt: '',
    endsAt: '',
    openInNewTab: false,
    overlayStrength: 0.4,
    textPosition: 'CENTER'
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isMobile: boolean, isEditing: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await uploadMedia(formData);
        
        if (res.success && res.url) {
          if (isEditing) {
            setEditingSlide((prev: any) => ({
              ...prev,
              imageDesktopPath: res.url,
              imageMobilePath: res.url
            }));
          } else {
            setNewSlide((prev: any) => ({
              ...prev,
              imageDesktopPath: res.url,
              imageMobilePath: res.url
            }));
          }
        } else {
          alert(res.error || 'فشل في رفع الصورة');
        }
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء الرفع');
      }
    });
  };

  const handleCarouselChange = (key: string, value: any) => {
    setCarousel((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleLocationChange = (key: string, value: any) => {
    setLocation((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSaveCarousel = () => {
    startTransition(async () => {
      try {
        const res = await updateHeroCarouselSettings(carousel);
        if (res.success) alert('تم حفظ إعدادات الهيرو بنجاح');
      } catch (e: any) {
        alert(e.message || 'حدث خطأ أثناء الحفظ');
      }
    });
  };

  const handleSaveLocation = () => {
    startTransition(async () => {
      try {
        const res = await updateStoreLocationSettings(location);
        if (res.success) alert('تم حفظ إعدادات الموقع بنجاح');
      } catch (e: any) {
        alert(e.message || 'حدث خطأ أثناء الحفظ');
      }
    });
  };

  const handleCreateSlide = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const formatted = {
          ...newSlide,
          productId: newSlide.productId || null,
          categoryId: newSlide.categoryId || null,
          startsAt: newSlide.startsAt || null,
          endsAt: newSlide.endsAt || null
        };
        const res = await createHeroSlide(formatted);
        if (res.success) {
          alert('تم إضافة الإعلان بنجاح');
          setSlides(prev => [...prev, res.slide].sort((a, b) => a.displayOrder - b.displayOrder));
          // Reset form
          setNewSlide({
            titleAr: '',
            titleEn: '',
            descriptionAr: '',
            descriptionEn: '',
            eyebrowAr: '',
            eyebrowEn: '',
            ctaAr: '',
            ctaEn: '',
            imageDesktopPath: '/slide-placeholder.jpg',
            imageMobilePath: '/slide-placeholder-mobile.jpg',
            altAr: '',
            altEn: '',
            destinationType: 'NONE',
            productId: '',
            categoryId: '',
            internalPath: '',
            externalUrl: '',
            displayOrder: 0,
            isEnabled: true,
            startsAt: '',
            endsAt: '',
            openInNewTab: false,
            overlayStrength: 0.4,
            textPosition: 'CENTER'
          });
        }
      } catch (e: any) {
        alert(e.message || 'حدث خطأ أثناء الإضافة');
      }
    });
  };

  const handleUpdateSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlide) return;
    startTransition(async () => {
      try {
        const formatted = {
          ...editingSlide,
          productId: editingSlide.productId || null,
          categoryId: editingSlide.categoryId || null,
          startsAt: editingSlide.startsAt || null,
          endsAt: editingSlide.endsAt || null
        };
        const res = await updateHeroSlide(editingSlide.id, formatted);
        if (res.success) {
          alert('تم تحديث الإعلان بنجاح');
          setSlides(prev => prev.map(s => s.id === editingSlide.id ? res.slide : s).sort((a, b) => a.displayOrder - b.displayOrder));
          setEditingSlide(null);
        }
      } catch (e: any) {
        alert(e.message || 'حدث خطأ أثناء التحديث');
      }
    });
  };

  const handleDeleteSlide = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإعلان؟')) return;
    startTransition(async () => {
      try {
        const res = await deleteHeroSlide(id);
        if (res.success) {
          alert('تم حذف الإعلان');
          setSlides(prev => prev.filter(s => s.id !== id));
        }
      } catch (e: any) {
        alert(e.message || 'حدث خطأ أثناء الحذف');
      }
    });
  };

  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;

    // Swap slides
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIndex];
    newSlides[targetIndex] = temp;

    setSlides(newSlides);

    // Save order in background
    startTransition(async () => {
      try {
        await reorderHeroSlides(newSlides.map(s => s.id));
      } catch {}
    });
  };

  return (
    <div className="space-y-12">
      
      {/* 1. HERO CAROUSEL GLOBAL CONFIGURATION */}
      <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-base font-bold text-[var(--color-charcoal-800)]">إعدادات شريط الإعلانات التلقائي (Carousel Settings)</h2>
          <p className="text-[10px] text-zinc-400 mt-1">تحديد فترات التناوب، وتفعيل التوقف المؤقت عند تمرير مؤشر الفأرة.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="enabled" 
              checked={carousel.enabled} 
              onChange={(e) => handleCarouselChange('enabled', e.target.checked)} 
              className="w-5 h-5 accent-[var(--color-charcoal-800)]"
            />
            <label htmlFor="enabled" className="text-xs font-bold text-zinc-700 cursor-pointer">تفعيل شريط الإعلانات في الصفحة الرئيسية</label>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="autoplayEnabled" 
              checked={carousel.autoplayEnabled} 
              onChange={(e) => handleCarouselChange('autoplayEnabled', e.target.checked)} 
              className="w-5 h-5 accent-[var(--color-charcoal-800)]"
            />
            <label htmlFor="autoplayEnabled" className="text-xs font-bold text-zinc-700 cursor-pointer">تشغيل تلقائي (Autoplay)</label>
          </div>

          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              id="pauseOnHover" 
              checked={carousel.pauseOnHover} 
              onChange={(e) => handleCarouselChange('pauseOnHover', e.target.checked)} 
              className="w-5 h-5 accent-[var(--color-charcoal-800)]"
            />
            <label htmlFor="pauseOnHover" className="text-xs font-bold text-zinc-700 cursor-pointer">توقف مؤقت عند مرور الفأرة (Pause on Hover)</label>
          </div>
        </div>

        {carousel.autoplayEnabled && (
          <div className="space-y-2 max-w-md">
            <label className="text-xs font-bold text-zinc-650">سرعة التناوب تلقائياً (سرعة العرض)</label>
            <div className="flex gap-2">
              {[3000, 5000, 7000, 10000].map(ms => (
                <button
                  key={ms}
                  type="button"
                  onClick={() => handleCarouselChange('autoplayIntervalMs', ms)}
                  className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${
                    carousel.autoplayIntervalMs === ms 
                      ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' 
                      : 'bg-white text-zinc-650 border-zinc-300 hover:bg-zinc-100'
                  }`}
                >
                  {ms / 1000} ثواني
                </button>
              ))}
            </div>
            <input 
              type="number" 
              min={3000}
              max={15000}
              step={1000}
              value={carousel.autoplayIntervalMs}
              onChange={(e) => handleCarouselChange('autoplayIntervalMs', parseInt(e.target.value) || 5000)}
              className="w-full mt-2 border border-zinc-300 rounded p-2 text-xs bg-white"
              placeholder="سرعة مخصصة بالملي ثانية..."
            />
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t border-zinc-100">
          <button 
            type="button"
            onClick={handleSaveCarousel}
            disabled={isPending}
            className="bg-[var(--color-charcoal-800)] hover:bg-[var(--color-charcoal-900)] text-white font-bold px-6 py-2.5 rounded text-xs transition-colors"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ إعدادات شريط العرض'}
          </button>
        </div>
      </div>

      {/* 2. HERO SLIDES MANAGER */}
      <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-base font-bold text-[var(--color-charcoal-800)]">إدارة شرائح إعلانات الهيرو (Hero Slides Manager)</h2>
          <p className="text-[10px] text-zinc-400 mt-1">تعديل المحتوى، وتنسيق وترتيب صور الهيرو.</p>
        </div>

        {/* Existing Slides List & Sorting */}
        <div className="space-y-4">
          {slides.map((slide, index) => (
            <div key={slide.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded bg-zinc-50/50 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-12 bg-zinc-200 rounded overflow-hidden relative">
                  <img src={slide.imageDesktopPath} alt={slide.titleAr} className="object-cover w-full h-full" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-700">{slide.titleAr} / {slide.titleEn}</h4>
                  <span className="text-[9px] text-zinc-400">الترتيب: {slide.displayOrder} | النوع: {slide.destinationType}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveSlide(index, 'up')}
                  className="bg-white hover:bg-zinc-100 border p-1 rounded text-xs disabled:opacity-50"
                  title="نقل لأعلى"
                >
                  ▲
                </button>
                <button
                  type="button"
                  disabled={index === slides.length - 1}
                  onClick={() => handleMoveSlide(index, 'down')}
                  className="bg-white hover:bg-zinc-100 border p-1 rounded text-xs disabled:opacity-50"
                  title="نقل لأسفل"
                >
                  ▼
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlide(slide)}
                  className="bg-zinc-800 hover:bg-zinc-950 text-white px-3 py-1 rounded text-xs"
                >
                  تعديل
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSlide(slide.id)}
                  className="bg-red-600 hover:bg-red-750 text-white px-3 py-1 rounded text-xs"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Slide Edit/Add Forms */}
        {editingSlide ? (
          <SlideEditor 
            slide={editingSlide}
            setSlide={setEditingSlide}
            onSave={handleUpdateSlide}
            onCancel={() => setEditingSlide(null)}
            isPending={isPending}
            isEdit={true}
            handleFileUpload={handleFileUpload}
            products={products}
            categories={categories}
          />
        ) : (
          <SlideEditor 
            slide={newSlide}
            setSlide={setNewSlide}
            onSave={handleCreateSlide}
            onCancel={() => {}}
            isPending={isPending}
            isEdit={false}
            handleFileUpload={handleFileUpload}
            products={products}
            categories={categories}
          />
        )}
</div>

      {/* 3. STORE LOCATION CONFIGURATION */}
      <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
        <div className="border-b pb-3">
          <h2 className="text-base font-bold text-[var(--color-charcoal-800)]">خيارات الخريطة وموقع المتجر (Store Location Settings)</h2>
          <p className="text-[10px] text-zinc-400 mt-1">تحديث إحداثيات الخريطة وتوجيهات الاتصال الجغرافي.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="locationSectionEnabled" 
            checked={location.locationSectionEnabled} 
            onChange={(e) => handleLocationChange('locationSectionEnabled', e.target.checked)} 
            className="w-5 h-5 accent-[var(--color-charcoal-800)]"
          />
          <label htmlFor="locationSectionEnabled" className="text-xs font-bold text-zinc-700 cursor-pointer">تفعيل قسم موقع المعرض في الصفحة الرئيسية</label>
        </div>

        {location.locationSectionEnabled && (
          <div className="space-y-4 bg-zinc-50 p-4 rounded border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">اسم المعرض (Store Name)</label>
                <input 
                  type="text" 
                  value={location.storeName} 
                  onChange={(e) => handleLocationChange('storeName', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">أوقات العمل اليومية</label>
                <input 
                  type="text" 
                  value={location.openingHours} 
                  onChange={(e) => handleLocationChange('openingHours', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">العنوان بالأرقام العربية</label>
                <input 
                  type="text" 
                  value={location.addressAr} 
                  onChange={(e) => handleLocationChange('addressAr', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">العنوان بالإنجليزية (English Address)</label>
                <input 
                  type="text" 
                  value={location.addressEn} 
                  onChange={(e) => handleLocationChange('addressEn', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">رقم الهاتف للاتصال</label>
                <input 
                  type="text" 
                  value={location.phone} 
                  onChange={(e) => handleLocationChange('phone', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">رقم الواتساب (بالرمز الدولي بدون +)</label>
                <input 
                  type="text" 
                  value={location.whatsapp} 
                  onChange={(e) => handleLocationChange('whatsapp', e.target.value)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">خط العرض (Latitude)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={location.latitude} 
                  onChange={(e) => handleLocationChange('latitude', parseFloat(e.target.value) || 0)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">خط الطول (Longitude)</label>
                <input 
                  type="number" 
                  step="0.000001"
                  value={location.longitude} 
                  onChange={(e) => handleLocationChange('longitude', parseFloat(e.target.value) || 0)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 font-bold">مستوى التقريب الخريطة (Zoom)</label>
                <input 
                  type="number" 
                  min={1}
                  max={21}
                  value={location.mapZoom} 
                  onChange={(e) => handleLocationChange('mapZoom', parseInt(e.target.value) || 15)}
                  className="w-full border rounded p-2 text-xs bg-white text-left"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold">رابط التوجيه المباشر في خرائط جوجل (Google Maps Place URL)</label>
              <input 
                type="text" 
                value={location.mapPlaceUrl} 
                onChange={(e) => handleLocationChange('mapPlaceUrl', e.target.value)}
                className="w-full border rounded p-2 text-xs bg-white text-left"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500 font-bold">رابط التضمين التفاعلي (Google Maps Embed URL / Src)</label>
              <input 
                type="text" 
                value={location.mapEmbedUrl} 
                onChange={(e) => handleLocationChange('mapEmbedUrl', e.target.value)}
                className="w-full border rounded p-2 text-xs bg-white text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 pt-4 border-t border-zinc-100">
          <button 
            type="button"
            onClick={handleSaveLocation}
            disabled={isPending}
            className="bg-[var(--color-charcoal-800)] hover:bg-[var(--color-charcoal-900)] text-white font-bold px-6 py-2.5 rounded text-xs transition-colors"
          >
            {isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الموقع والخريطة'}
          </button>
        </div>
      </div>

    </div>
  );
}
export default CMSHomepageForm;
