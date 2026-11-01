'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reverseCaptainSettlement } from '@/actions/operations';

export function DeleteSettlement({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReverse = async () => {
    const reason = window.prompt('يرجى إدخال سبب موثق لإجراء التسوية العكسية (إلغاء أثر الدفعة دون محو سجلها):');
    if (!reason || !reason.trim()) return;

    setLoading(true);
    try {
      const res = await reverseCaptainSettlement(id, reason.trim());
      if (res?.success) {
        alert('تم تسجيل التسوية العكسية بنجاح وحفظ أثرها في الدفتر المالي.');
        router.refresh();
      } else {
        alert(res?.error || 'تعذر إجراء التسوية العكسية.');
      }
    } catch (err: any) {
      alert(err?.message || 'حدث خطأ أثناء إجراء التسوية العكسية.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReverse}
      disabled={loading}
      className="text-amber-700 hover:text-amber-900 font-bold text-xs disabled:opacity-50"
      title="إجراء تسوية عكسية موثقة بدلاً من محو السجل"
    >
      {loading ? 'جارٍ العكس...' : 'تسوية عكسية'}
    </button>
  );
}
