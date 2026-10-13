'use client';

import { useState, useTransition } from 'react';
import { deleteSupplier } from '@/actions/suppliers';

export function DeleteSupplierButton({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  return <div className="space-y-1">
    <button type="button" disabled={pending} onClick={() => {
      if (!window.confirm(`حذف المورد «${supplierName}»؟ لا يمكن التراجع عن هذا الإجراء.`)) return;
      startTransition(async () => {
        try { await deleteSupplier(supplierId); }
        catch (reason) { setError(reason instanceof Error ? reason.message : 'تعذر حذف المورد.'); }
      });
    }} className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 disabled:opacity-50">{pending ? 'جارٍ الحذف...' : 'حذف المورد'}</button>
    {error && <p role="alert" className="max-w-xs text-xs text-red-700">{error}</p>}
  </div>;
}
