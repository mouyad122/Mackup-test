'use client';

import { useState } from 'react';
import Link from 'next/link';

export function BatchActions({ batchId, reference, secureToken, deleteAction, status }: { batchId: string; reference: string; secureToken: string | null; deleteAction: (id: string) => Promise<unknown>; status?: string }) {
  const [message, setMessage] = useState('');
  const manifestPath = `/delivery/${reference}${secureToken ? `?token=${encodeURIComponent(secureToken)}` : ''}`;
  const copyLink = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://rawaq.jo');
    const url = `${origin}${manifestPath}`;
    try { await navigator.clipboard.writeText(url); setMessage('تم نسخ رابط الطلبية.'); } catch { setMessage(url); }
  };
  const remove = async () => {
    if (!confirm('هل تريد إلغاء هذه الطلبية وإعادة طلباتها إلى التجهيز؟')) return;
    try { await deleteAction(batchId); } catch (error) { setMessage(error instanceof Error ? error.message : 'تعذر إلغاء الطلبية.'); }
  };
  return <div className="flex flex-col gap-2">
    {message && <p role="status" className="break-all text-xs text-zinc-700 bg-emerald-50 border border-emerald-200 p-1.5 rounded">{message}</p>}
    <div className="flex gap-2">
      <Link href={manifestPath} target="_blank" className="flex-1 rounded border bg-zinc-50 px-3 py-2 text-center text-sm font-semibold hover:bg-zinc-100">عرض الرابط</Link>
      <button type="button" onClick={copyLink} className="flex-1 rounded border bg-[#3F4832] text-white px-3 py-2 text-sm font-semibold hover:bg-[#2e3524]">نسخ الرابط الرسمي</button>
    </div>
    {status !== 'COMPLETED' && status !== 'CANCELLED' && <button type="button" onClick={remove} className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">إلغاء الطلبية وإرجاع الطلبات</button>}
  </div>;
}
