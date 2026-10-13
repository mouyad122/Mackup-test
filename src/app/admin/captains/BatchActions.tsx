'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export function BatchActions({ batchId, reference, deleteAction, status }: { batchId: string, reference: string, deleteAction: (id: string) => Promise<any>, status?: string }) {
  const [message, setMessage] = useState('');
  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/delivery/${reference}`;
    try { await navigator.clipboard.writeText(url); setMessage('تم نسخ الرابط'); } catch { setMessage(url); }
  };

  const handleDelete = async () => {
    if (confirm('هل أنت متأكد من إلغاء وحذف هذه الطلبية؟ سيتم إعادة الطلبات لحالة "تجهيز" لتكون متاحة لتجميعها مرة أخرى.')) {
      try { await deleteAction(batchId); } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر حذف الطلبية'); }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {message && <p role="status" className="max-w-xs break-all text-xs">{message}</p>}
      <div className="flex gap-2">
        <Link href={`/delivery/${reference}`} target="_blank" className="flex-1 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 text-center">
          عرض الرابط
        </Link>
        <button onClick={handleCopyUrl} className="flex-1 rounded border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm font-semibold hover:bg-zinc-100 text-center" title="نسخ الرابط">
          نسخ
        </button>
      </div>
      {status !== 'COMPLETED' && (
        <button onClick={handleDelete} className="w-full rounded border border-red-200 bg-red-50 text-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-100 text-center">
          حذف الطلبية وإرجاع الطلبات
        </button>
      )}
    </div>
  );
}
