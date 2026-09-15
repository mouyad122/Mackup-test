'use client';

import React, { useState, useTransition } from 'react';
import { updatePOSSettings, POSSettings } from '@/actions/settings-crud';
import { Lock } from 'lucide-react';

interface POSSettingsFormProps {
  initialSettings: POSSettings;
  adminId: string;
}

export function POSSettingsForm({ initialSettings, adminId }: POSSettingsFormProps) {
  const [settings, setSettings] = useState<POSSettings>(initialSettings);
  const [isPending, startTransition] = useTransition();

  const handleCheckboxChange = (key: keyof POSSettings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleNumberChange = (key: keyof POSSettings, val: string) => {
    const num = parseInt(val, 10) || 0;
    setSettings(prev => ({
      ...prev,
      [key]: num
    }));
  };

  const handleTextChange = (key: keyof POSSettings, val: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: val
    }));
  };

  const handlePresetTimeout = (mins: number) => {
    setSettings(prev => ({
      ...prev,
      posIdleTimeoutMinutes: mins
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        const res = await updatePOSSettings(settings, adminId);
        if (res.success) {
          alert('تم حفظ إعدادات الكاشير بنجاح');
        }
      } catch (err: any) {
        alert(err.message || 'حدث خطأ أثناء الحفظ');
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      {/* 1. Form controls */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
        <h2 className="text-base font-bold text-[var(--color-charcoal-800)] border-b pb-2">خيارات شاشة الكاشير والوردية</h2>
        
        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="requireShiftToSell" 
            checked={settings.requireShiftToSell} 
            onChange={() => handleCheckboxChange('requireShiftToSell')} 
            className="w-5 h-5 accent-[var(--color-charcoal-800)]"
          />
          <label htmlFor="requireShiftToSell" className="font-bold text-xs cursor-pointer text-zinc-700">إلزام فتح الوردية لإجراء أي عملية بيع</label>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="allowManagerOverride" 
            checked={settings.allowManagerOverride} 
            onChange={() => handleCheckboxChange('allowManagerOverride')} 
            className="w-5 h-5 accent-[var(--color-charcoal-800)]"
          />
          <label htmlFor="allowManagerOverride" className="font-bold text-xs cursor-pointer text-zinc-700">السماح بتجاوز المدير عند اختلاف جرد الوردية</label>
        </div>

        <h2 className="text-base font-bold text-[var(--color-charcoal-800)] border-b pb-2 pt-2">شاشة الخمول التلقائي والخصوصية</h2>

        <div className="flex items-center gap-3">
          <input 
            type="checkbox" 
            id="posIdleEnabled" 
            checked={settings.posIdleEnabled} 
            onChange={() => handleCheckboxChange('posIdleEnabled')} 
            className="w-5 h-5 accent-[var(--color-charcoal-800)]"
          />
          <label htmlFor="posIdleEnabled" className="font-bold text-xs cursor-pointer text-zinc-750">تفعيل شاشة الخمول عند عدم تفاعل الكاشير</label>
        </div>

        {settings.posIdleEnabled && (
          <div className="space-y-4 bg-zinc-50 p-4 rounded-lg border border-zinc-100">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-650">مهلة إغلاق الشاشة التلقائي (بالدقائق)</label>
              <div className="flex gap-2">
                {[1, 4, 5, 10].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handlePresetTimeout(mins)}
                    className={`px-3 py-1.5 rounded border text-xs font-bold transition-all ${
                      settings.posIdleTimeoutMinutes === mins 
                        ? 'bg-[var(--color-charcoal-900)] text-white border-transparent' 
                        : 'bg-white text-zinc-650 border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {mins} {mins === 1 ? 'دقيقة' : 'دقائق'}
                  </button>
                ))}
              </div>
              <input 
                type="number" 
                min={1}
                max={60}
                value={settings.posIdleTimeoutMinutes}
                onChange={(e) => handleNumberChange('posIdleTimeoutMinutes', e.target.value)}
                className="w-full mt-2 border border-zinc-300 rounded p-2 text-xs bg-white"
                placeholder="أو أدخل قيمة مخصصة بالدقائق..."
              />
              <span className="text-[10px] text-zinc-400 block">النطاق المسموح به: من دقيقة واحدة وحتى 60 دقيقة.</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="posIdleShowClock" 
                  checked={settings.posIdleShowClock} 
                  onChange={() => handleCheckboxChange('posIdleShowClock')} 
                  className="w-4 h-4 accent-[var(--color-charcoal-850)]"
                />
                <label htmlFor="posIdleShowClock" className="text-xs text-zinc-700 cursor-pointer">عرض الساعة</label>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="posIdleShowDate" 
                  checked={settings.posIdleShowDate} 
                  onChange={() => handleCheckboxChange('posIdleShowDate')} 
                  className="w-4 h-4 accent-[var(--color-charcoal-850)]"
                />
                <label htmlFor="posIdleShowDate" className="text-xs text-zinc-700 cursor-pointer">عرض التاريخ</label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="posIdleRequirePin" 
                checked={settings.posIdleRequirePin} 
                onChange={() => handleCheckboxChange('posIdleRequirePin')} 
                className="w-4 h-4 accent-[var(--color-charcoal-850)]"
              />
              <label htmlFor="posIdleRequirePin" className="text-xs text-zinc-700 cursor-pointer">إلزام إدخال رمز الـ PIN لإلغاء القفل</label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-650">نص التنبيه بالأعرية</label>
              <input 
                type="text" 
                value={settings.posIdleMessageAr}
                onChange={(e) => handleTextChange('posIdleMessageAr', e.target.value)}
                className="w-full border border-zinc-300 rounded p-2 text-xs bg-white"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-650">نص التنبيه بالإنجليزية</label>
              <input 
                type="text" 
                value={settings.posIdleMessageEn}
                onChange={(e) => handleTextChange('posIdleMessageEn', e.target.value)}
                className="w-full border border-zinc-300 rounded p-2 text-xs bg-white text-left"
                dir="ltr"
              />
            </div>
          </div>
        )}

        <h2 className="text-base font-bold text-[var(--color-charcoal-800)] border-b pb-2 pt-2">جلسة عمل الكاشير (Session Lifetime)</h2>
        
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-650">مدة الجلسة القصوى (بالساعات)</label>
          <input 
            type="number" 
            min={1}
            max={24}
            value={settings.posSessionLifetimeHours}
            onChange={(e) => handleNumberChange('posSessionLifetimeHours', e.target.value)}
            className="w-full border border-zinc-300 rounded p-2 text-xs bg-white"
          />
          <span className="text-[10px] text-zinc-400 block">الحد الأقصى المطلق لحماية الجلسات غير النشطة هو 24 ساعة.</span>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full bg-[var(--color-charcoal-800)] hover:bg-[var(--color-charcoal-900)] text-white font-bold p-3 rounded hover:shadow transition-colors text-xs"
        >
          {isPending ? 'جاري الحفظ...' : 'حفظ إعدادات الكاشير'}
        </button>
      </form>

      {/* 2. Interactive Live Preview */}
      <div className="bg-neutral-900 text-white rounded-lg p-6 border border-neutral-800 shadow-xl space-y-4">
        <h3 className="text-xs font-bold text-neutral-400 border-b border-neutral-800 pb-2">معاينة حية لشاشة الخمول (Live Shutter Preview)</h3>
        
        {settings.posIdleEnabled ? (
          <div className="bg-neutral-950 p-6 rounded border border-neutral-800 flex flex-col items-center justify-center text-center space-y-6 aspect-video select-none relative overflow-hidden">
            {/* Hour display clock preview */}
            {settings.posIdleShowClock && (
              <div className="text-3xl font-mono tracking-widest font-extrabold text-[var(--color-champagne-400)]">
                21:30:45
              </div>
            )}
            
            {/* Date display preview */}
            {settings.posIdleShowDate && (
              <div className="text-[10px] text-neutral-400">
                الأحد، 12 يوليو، 2026
              </div>
            )}

            <div className="text-xs text-neutral-300 max-w-xs leading-relaxed font-semibold">
              {settings.posIdleMessageAr}
            </div>

            <div className="text-[10px] text-neutral-500 max-w-xs leading-relaxed" dir="ltr">
              {settings.posIdleMessageEn}
            </div>

            {settings.posIdleRequirePin && (
              <div className="border border-red-900/50 bg-red-950/20 px-3 py-1.5 rounded text-[9px] text-red-400 font-bold flex items-center gap-1.5 justify-center">
                <Lock className="w-3 h-3" /> يتطلب إدخال رمز PIN لإلغاء القفل
              </div>
            )}

            <div className="text-[8px] text-neutral-600 animate-pulse mt-4">
              * انقر في أي مكان لمحاكاة الخروج من الشاشة *
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-neutral-500 border border-dashed border-neutral-800 rounded">
            شاشة الخمول التلقائي معطلة حالياً.
          </div>
        )}
      </div>
    </div>
  );
}
export default POSSettingsForm;
