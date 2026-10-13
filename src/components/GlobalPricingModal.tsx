'use client';

import { useState } from 'react';
import { applyPricesToSelection } from '@/actions/settings';

export function GlobalPricingModal({ 
  initialPrices, 
  adminId,
  categories = [],
  selectedProductIds = [],
  onClearSelection
}: { 
  initialPrices: Record<string, number>; 
  adminId: string;
  categories?: any[];
  selectedProductIds?: string[];
  onClearSelection?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [prices, setPrices] = useState({
    '50ml': (initialPrices['50ml'] || 10000) / 1000,
    '100ml': (initialPrices['100ml'] || 15000) / 1000,
    '200ml': (initialPrices['200ml'] || 25000) / 1000,
  });
  
  const [targetMode, setTargetMode] = useState<'ALL' | 'SELECTED' | 'CATEGORY'>(selectedProductIds.length > 0 ? 'SELECTED' : 'ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleOpen = () => {
    setTargetMode(selectedProductIds.length > 0 ? 'SELECTED' : 'ALL');
    setIsOpen(true);
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    
    // Prepare prices in fils
    const pricesInFils = {
      '50ml': prices['50ml'] * 1000,
      '100ml': prices['100ml'] * 1000,
      '200ml': prices['200ml'] * 1000,
    };

    const isGlobalSettingsUpdate = targetMode === 'ALL';
    
    const res = await applyPricesToSelection({
      pricesInFils,
      adminId,
      updateGlobalSettings: isGlobalSettingsUpdate,
      productIds: targetMode === 'SELECTED' ? selectedProductIds : [],
      categoryId: targetMode === 'CATEGORY' ? selectedCategory : undefined
    });

    setLoading(false);

    if (res.success) {
      setMessage(`تم التحديث بنجاح، وتطبيق السعر الجديد على ${(res as any).updatedCount || 0} حجم(أحجام)`);
      if (onClearSelection) onClearSelection();
      setTimeout(() => {
        setIsOpen(false);
        window.location.reload();
      }, 2000);
    } else {
      setMessage((res as any).error || 'حدث خطأ أثناء حفظ الأسعار');
    }
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="bg-white border border-[var(--color-champagne-600)] text-[#3F4B32] hover:bg-zinc-50 px-4 py-2.5 rounded font-bold transition-colors text-sm shadow-sm whitespace-nowrap"
      >
        تعديل الأسعار الموحدة {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ''}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden relative">
            <div className="bg-[#3F4B32] text-white p-4 flex justify-between items-center">
              <h2 className="font-bold text-lg">الأسعار الموحدة للأحجام</h2>
              <button onClick={() => setIsOpen(false)} className="text-zinc-300 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              
              {/* Target Selection */}
              <div className="bg-zinc-50 border border-zinc-200 rounded p-4 space-y-3">
                <h3 className="font-bold text-sm text-zinc-700">تطبيق الأسعار على:</h3>
                
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name="targetMode" 
                    checked={targetMode === 'ALL'} 
                    onChange={() => setTargetMode('ALL')} 
                    className="text-[var(--color-champagne-600)] focus:ring-[var(--color-champagne-600)]"
                  />
                  <span className="font-bold">جميع المنتجات المرتبطة بالتسعير الموحد</span>
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="radio" 
                    name="targetMode" 
                    checked={targetMode === 'SELECTED'} 
                    onChange={() => setTargetMode('SELECTED')} 
                    disabled={selectedProductIds.length === 0}
                    className="text-[var(--color-champagne-600)] focus:ring-[var(--color-champagne-600)]"
                  />
                  <span className={selectedProductIds.length === 0 ? 'text-zinc-400' : 'font-bold'}>
                    المنتجات المحددة في الجدول ({selectedProductIds.length})
                  </span>
                </label>

                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="targetMode" 
                      checked={targetMode === 'CATEGORY'} 
                      onChange={() => setTargetMode('CATEGORY')} 
                      className="text-[var(--color-champagne-600)] focus:ring-[var(--color-champagne-600)]"
                    />
                    <span className="font-bold">حسب التصنيف (المجموعة)</span>
                  </label>
                  {targetMode === 'CATEGORY' && (
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="mr-6 border border-zinc-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--color-champagne-600)]"
                    >
                      <option value="ALL" disabled>اختر التصنيف...</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                ملاحظة: عند تطبيق الأسعار على مكياج محددة، سيتم تفعيل خيار &quot;استخدام السعر الموحد&quot; لها لتتأثر بالتحديثات المستقبلية للأسعار الموحدة.
              </p>

              {message && (
                <div className={`p-3 rounded text-sm font-bold ${message.includes('بنجاح') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {message}
                </div>
              )}

              {Object.keys(prices).map((size) => (
                <div key={size} className="flex justify-between items-center bg-zinc-50 p-3 rounded border border-zinc-200">
                  <span className="font-bold font-mono text-[#3F4B32]">{size}</span>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1"
                      value={prices[size as keyof typeof prices]} 
                      onChange={(e) => setPrices({ ...prices, [size]: parseFloat(e.target.value) || 0 })}
                      className="border border-zinc-300 rounded px-3 py-1.5 w-24 text-center focus:outline-none focus:border-[var(--color-champagne-600)]"
                    />
                    <span className="text-sm text-zinc-500">د.أ</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-2">
              <button 
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-zinc-600 hover:bg-zinc-200 rounded font-bold text-sm transition-colors"
                disabled={loading}
              >
                إلغاء
              </button>
              <button 
                onClick={handleSave}
                className="px-4 py-2 bg-[#3F4B32] hover:bg-[#2d3623] text-white rounded font-bold text-sm shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                disabled={loading}
              >
                {loading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                تطبيق الأسعار
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
