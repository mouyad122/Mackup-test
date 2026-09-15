'use client';

import React, { useState, useTransition } from 'react';
import { updateInventorySettings } from '@/actions/settings-crud';

export function InventorySettingsForm({ initialThreshold, employeeId }: { initialThreshold: number; employeeId: string }) {
  const [threshold, setThreshold] = useState(initialThreshold.toString());
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateInventorySettings({ lowStockThreshold: parseFloat(threshold) || 0 }, employeeId);
        setMessage('تم الحفظ بنجاح');
        setTimeout(() => setMessage(''), 3000);
      } catch (err) {
        setMessage('حدث خطأ أثناء الحفظ');
      }
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-[var(--color-ivory-200)] flex items-end gap-4 mb-6">
      <div>
        <label className="block text-sm font-bold text-zinc-700 mb-2">تنبيه النواقص (عدد اللترات)</label>
        <input 
          type="number" 
          step="0.001" 
          value={threshold} 
          onChange={(e) => setThreshold(e.target.value)} 
          className="border border-zinc-200 rounded px-3 py-2 text-sm outline-none focus:border-[var(--color-champagne-600)]"
          dir="ltr"
        />
      </div>
      <button 
        onClick={handleSave}
        disabled={isPending}
        className="bg-[var(--color-charcoal-900)] text-white px-6 py-2 rounded font-bold text-sm hover:bg-[var(--color-charcoal-800)] disabled:opacity-50 transition-colors"
      >
        {isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
      {message && <span className="text-sm font-bold text-emerald-600 mb-2">{message}</span>}
    </div>
  );
}
