'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDeliveryBatch, deleteDeliveryBatch, updateDeliveryBatch } from '@/actions/delivery-batch';
import { filsToDisplay } from '@/lib/money';
import { BatchActions } from '../captains/BatchActions';
import { BatchStatusForm } from '../captains/BatchStatusForm';

type Order = {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  shippingZoneNameSnapshot: string | null;
  totalAmount: number;
  shippingCost: number;
  createdAt: Date;
  status?: string;
  deliveryAssignment?: { id: string } | null;
};

type Batch = {
  id: string;
  reference: string;
  status: string;
  createdAt: Date;
  orders: Order[];
};

const statusLabel: Record<string, string> = {
  NOT_DELIVERED: 'لم تُسلّم للشركة',
  IN_DELIVERY: 'لدى شركة التوصيل',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
};

function OrderChoice({ order, checked, onChange }: { order: Order; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-zinc-50">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4" />
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-bold">{order.reference} · {order.customerName}</span>
        <span className="mt-1 block text-xs text-zinc-600" dir="ltr">{order.customerPhone}</span>
        <span className="mt-1 block text-xs text-zinc-500">{order.shippingZoneNameSnapshot || 'منطقة غير مسجلة'} · {filsToDisplay(order.totalAmount, 'ar')}</span>
      </span>
    </label>
  );
}

function BatchEditor({ batch, preparedOrders }: { batch: Batch; preparedOrders: Order[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const editable = !['COMPLETED', 'CANCELLED'].includes(batch.status)
    && batch.orders.every(order => order.status === 'SHIPPED' && !order.deliveryAssignment);
  const candidates = useMemo(() => {
    const unique = new Map<string, Order>();
    [...batch.orders, ...preparedOrders].forEach(order => unique.set(order.id, order));
    return [...unique.values()];
  }, [batch.orders, preparedOrders]);
  const [selected, setSelected] = useState<string[]>(batch.orders.map(order => order.id));
  const toggle = (id: string, checked: boolean) => setSelected(current => checked ? [...new Set([...current, id])] : current.filter(value => value !== id));

  const save = () => startTransition(async () => {
    if (!selected.length) {
      setMessage('اختر طلباً واحداً على الأقل.');
      return;
    }
    try {
      const formData = new FormData();
      selected.forEach(id => formData.append('orderIds', id));
      await updateDeliveryBatch(batch.id, formData);
      setMessage('تم حفظ محتوى الطلبية.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر حفظ الطلبية.');
    }
  });

  return (
    <article className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">{batch.reference}</h2><span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-semibold">{statusLabel[batch.status] || batch.status}</span></div>
          <p className="mt-1 text-xs text-zinc-500">أُنشئت {new Date(batch.createdAt).toLocaleString('ar-JO')} · {batch.orders.length} طلب</p>
        </div>
        <div className="w-full sm:w-72"><BatchActions batchId={batch.id} reference={batch.reference} deleteAction={deleteDeliveryBatch} status={batch.status} /></div>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h3 className="mb-3 font-bold">طلبات هذه الطلبية</h3>
          <div className="overflow-hidden rounded border">
            {batch.orders.map(order => <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm last:border-b-0"><Link href={`/admin/orders/${order.id}`} className="font-bold underline">{order.reference} · {order.customerName}</Link><span className="text-xs text-zinc-600">{order.status || '—'} · {filsToDisplay(order.totalAmount, 'ar')}</span></div>)}
            {!batch.orders.length && <p className="p-4 text-sm text-zinc-500">لا توجد طلبات في هذه الطلبية.</p>}
          </div>
          {editable && <details className="mt-4 rounded border bg-zinc-50 p-3"><summary className="cursor-pointer font-bold text-sm">تعديل الطلبات داخل الطلبية</summary><div className="mt-3 max-h-80 overflow-y-auto rounded border bg-white">{candidates.map(order => <OrderChoice key={order.id} order={order} checked={selected.includes(order.id)} onChange={checked => toggle(order.id, checked)} />)}</div>{message && <p role="status" className="mt-2 text-xs text-zinc-700">{message}</p>}<button type="button" onClick={save} disabled={pending} className="mt-3 rounded bg-zinc-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الحفظ...' : 'حفظ محتوى الطلبية'}</button></details>}
        </section>
        <section><h3 className="mb-3 font-bold">متابعة الطلبية</h3><BatchStatusForm batchId={batch.id} status={batch.status} orders={batch.orders.map(order => ({ id: order.id, reference: order.reference, customerName: order.customerName, status: order.status || '', notes: null }))} /></section>
      </div>
    </article>
  );
}

export function DeliveryBatchWorkspace({ preparedOrders, batches }: { preparedOrders: Order[]; batches: Batch[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const toggle = (id: string, checked: boolean) => setSelected(current => checked ? [...new Set([...current, id])] : current.filter(value => value !== id));
  const create = () => startTransition(async () => {
    if (!selected.length) {
      setMessage('اختر طلباً جاهزاً واحداً على الأقل.');
      return;
    }
    try {
      const formData = new FormData();
      selected.forEach(id => formData.append('orderIds', id));
      await createDeliveryBatch(formData);
      setSelected([]);
      setMessage('تم إنشاء طلبية شركة التوصيل.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنشاء الطلبية.');
    }
  });

  return <div className="space-y-6">
    <section className="rounded-lg border bg-white shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3 border-b p-5"><div><h2 className="font-bold">إنشاء طلبية جديدة</h2><p className="mt-1 text-sm text-zinc-600">الطلبات الجاهزة فقط تظهر هنا؛ ستنتقل إلى حالة مع التوصيل بعد الإنشاء.</p></div>{preparedOrders.length > 0 && <button type="button" onClick={() => setSelected(selected.length === preparedOrders.length ? [] : preparedOrders.map(order => order.id))} className="rounded border px-3 py-2 text-sm font-semibold">{selected.length === preparedOrders.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</button>}</div><div className="max-h-[32rem] overflow-y-auto">{preparedOrders.map(order => <OrderChoice key={order.id} order={order} checked={selected.includes(order.id)} onChange={checked => toggle(order.id, checked)} />)}{!preparedOrders.length && <p className="p-6 text-center text-sm text-zinc-500">لا توجد طلبات جاهزة للتجميع الآن.</p>}</div>{preparedOrders.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4"><p className="text-sm text-zinc-600">تم اختيار {selected.length} من {preparedOrders.length} طلب.</p><button type="button" onClick={create} disabled={pending || !selected.length} className="rounded bg-[#3F4B32] px-5 py-2 font-bold text-white disabled:opacity-50">{pending ? 'جارٍ الإنشاء...' : 'إنشاء طلبية شركة التوصيل'}</button></div>}{message && <p role="status" className="px-4 pb-4 text-sm text-zinc-700">{message}</p>}</section>
    <section className="space-y-4"><div><h2 className="text-xl font-bold">إدارة الطلبيات</h2><p className="mt-1 text-sm text-zinc-600">آخر 100 طلبية، مرتبة من الأحدث.</p></div>{batches.map(batch => <BatchEditor key={batch.id} batch={batch} preparedOrders={preparedOrders} />)}{!batches.length && <p className="rounded-lg border bg-white p-8 text-center text-zinc-500">لم تُنشأ أي طلبية شركة توصيل بعد.</p>}</section>
  </div>;
}
