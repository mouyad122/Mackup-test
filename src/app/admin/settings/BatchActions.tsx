'use client';

import { useState } from 'react';
import Link from 'next/link';

export function BatchActions({ batchId, reference, deleteAction, status }: { batchId: string; reference: string; deleteAction: (id: string) => Promise<unknown>; status?: string }) {
  const [message, setMessage] = useState('');
  const copyLink = async () => {
    const url = `${window.location.origin}/delivery/${reference}`;
    try { await navigator.clipboard.writeText(url); setMessage('تم نسخ رابط الطلبية.'); } catch { setMessage(url); }
  };
  const remove = async () => {
    if (!confirm('هل تريد إلغاء هذه الطلبية وإعادة طلباتها إلى التجهيز؟')) return;
    try { await deleteAction(batchId); } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر إلغاء الطلبية.'); }
  };
  return <div className="flex flex-col gap-2">
    {message && <p role="status" className="break-all text-xs text-zinc-700">{message}</p>}
    <div className="flex gap-2"><Link href={`/delivery/${reference}`} target="_blank" className="flex-1 rounded border bg-zinc-50 px-3 py-2 text-center text-sm font-semibold">عرض الرابط</Link><button type="button" onClick={copyLink} className="flex-1 rounded border bg-zinc-50 px-3 py-2 text-sm font-semibold">نسخ الرابط</button></div>
    {status !== 'COMPLETED' && status !== 'CANCELLED' && <button type="button" onClick={remove} className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">إلغاء الطلبية وإرجاع الطلبات</button>}
  </div>;
}
