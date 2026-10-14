'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateDeliveryBatchStatus } from '@/actions/delivery-batch';

type Order = { id: string; reference: string; customerName: string; status: string; notes?: string | null };

export function BatchStatusForm({ batchId, status, orders }: { batchId: string; status: string; orders: Order[] }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [message, setMessage] = useState(''); const [nextStatus, setNextStatus] = useState(status);
  if (status === 'COMPLETED' || status === 'CANCELLED') return <p className="text-sm font-semibold text-emerald-700">{status === 'COMPLETED' ? 'تم إنهاء هذه الطلبية.' : 'أُلغيت هذه الطلبية.'}</p>;
  return <form action={formData => startTransition(async () => { const result = await updateDeliveryBatchStatus(batchId, formData); setMessage(result.success ? 'تم تحديث الحالة.' : result.error || 'تعذر التحديث.'); if (result.success) router.refresh(); })} className="space-y-3 rounded border bg-zinc-50 p-3">
    <label className="block text-sm font-bold">حالة الطلبية<select name="status" value={nextStatus} onChange={event => setNextStatus(event.target.value)} className="mt-1 w-full rounded border bg-white p-2"><option value="NOT_DELIVERED">لم تُسلّم للشركة</option><option value="IN_DELIVERY">لدى شركة التوصيل</option><option value="COMPLETED">تم الانتهاء</option><option value="CANCELLED">إلغاء الطلبية بالكامل</option></select></label>
    {['COMPLETED', 'CANCELLED'].includes(nextStatus) && <div className="space-y-2 border-t pt-3"><p className="text-xs text-zinc-600">حدد الطلبات الملغاة أو المرتجعة قبل الإنهاء.</p>{orders.map(order => <label key={order.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="cancelledOrderIds" value={order.id} disabled={['CANCELLED', 'REFUNDED'].includes(order.status)} />إلغاء / مرتجع: {order.reference} · {order.customerName}</label>)}<fieldset className="rounded border bg-white p-2 text-sm"><legend className="px-1 font-semibold">رسوم التوصيل للطلبات الملغاة</legend><label className="ml-4 inline-flex items-center gap-1"><input type="radio" name="shippingResponsibility" value="STORE" /> المتجر يتحملها</label><label className="inline-flex items-center gap-1"><input type="radio" name="shippingResponsibility" value="CUSTOMER" /> العميل يتحملها</label></fieldset></div>}
    {message && <p role="status" className="text-xs text-zinc-700">{message}</p>}<button disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ الحالة'}</button>
  </form>;
}
