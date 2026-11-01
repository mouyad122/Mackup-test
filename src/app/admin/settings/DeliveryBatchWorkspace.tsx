'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDeliveryBatch, deleteDeliveryBatch, updateDeliveryBatch } from '@/actions/delivery-batch';
import { filsToDisplay } from '@/lib/money';
import { BatchActions } from './BatchActions';
import { BatchStatusForm } from './BatchStatusForm';

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
  fulfillmentStatus?: string | null;
  deliveryAssignment?: { id: string } | null;
  fulfillmentOrders?: Array<{
    id: string;
    supplierId: string;
    locationId: string | null;
    status: string;
    supplier?: { name: string } | null;
    location?: { label: string; city?: string } | null;
    packages?: Array<{ id: string; packageCode: string }>;
  }>;
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
  const suppliersCount = order.fulfillmentOrders?.length || 1;
  const packagesCount = order.fulfillmentOrders?.reduce((acc, f) => acc + (f.packages?.length || 1), 0) || 1;
  const supplierNames = order.fulfillmentOrders?.map(f => f.supplier?.name || 'مورد').filter(Boolean).join(' • ');

  return (
    <label className="flex cursor-pointer items-start gap-3 border-b p-3 last:border-b-0 hover:bg-zinc-50 transition">
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="mt-1 h-4 w-4 rounded accent-[#3F4832]" />
      <span className="min-w-0 flex-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-zinc-900">{order.reference} · {order.customerName}</span>
          <span className="font-mono font-bold text-zinc-800 text-xs">{filsToDisplay(order.totalAmount, 'ar')}</span>
        </div>
        <span className="mt-0.5 block text-xs text-zinc-600 font-mono" dir="ltr">{order.customerPhone}</span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded font-medium">
            {order.shippingZoneNameSnapshot || 'منطقة غير مسجلة'}
          </span>
          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-bold">
            {suppliersCount} {suppliersCount === 1 ? 'محل مورد' : 'محلات موردين'} {supplierNames ? `(${supplierNames})` : ''}
          </span>
          <span className="bg-purple-50 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-bold">
            {packagesCount} {packagesCount === 1 ? 'طرد' : 'طرود'}
          </span>
        </div>
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
          <p className="mt-1 text-xs text-zinc-500">أُنشئت <span dir="ltr">{new Date(batch.createdAt).toLocaleString('en-GB')}</span> · {batch.orders.length} طلب</p>
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

  const selectedOrders = useMemo(() => {
    return preparedOrders.filter(o => selected.includes(o.id));
  }, [preparedOrders, selected]);

  const selectedMetrics = useMemo(() => {
    const ordersCount = selectedOrders.length;
    const uniqueLocations = new Set<string>();
    let parcelsCount = 0;
    let totalCodFils = 0;

    selectedOrders.forEach(order => {
      totalCodFils += order.totalAmount;
      if (order.fulfillmentOrders && order.fulfillmentOrders.length > 0) {
        order.fulfillmentOrders.forEach(fo => {
          uniqueLocations.add(fo.locationId || fo.supplierId);
          parcelsCount += fo.packages?.length || 1;
        });
      } else {
        uniqueLocations.add('default');
        parcelsCount += 1;
      }
    });

    return {
      ordersCount,
      uniqueShopsCount: uniqueLocations.size,
      parcelsCount,
      totalCodFils,
    };
  }, [selectedOrders]);

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
      setMessage('تم إنشاء طلبية شركة التوصيل بنجاح.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إنشاء الطلبية.');
    }
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-5">
          <div>
            <h2 className="font-extrabold text-base text-zinc-900">إنشاء طلبية جديدة لشركة التوصيل</h2>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">
              تجميع عدة طلبات لزبونات مختلفات في كشف استلام وتوصيل موحد، مع حصر محطات الموردين المطلوب زيارتها.
            </p>
          </div>
          {preparedOrders.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected(selected.length === preparedOrders.length ? [] : preparedOrders.map(order => order.id))}
              className="rounded-xl border border-zinc-300 px-3.5 py-1.5 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
            >
              {selected.length === preparedOrders.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
          )}
        </div>

        <div className="max-h-[30rem] overflow-y-auto divide-y divide-zinc-100">
          {preparedOrders.map(order => (
            <OrderChoice
              key={order.id}
              order={order}
              checked={selected.includes(order.id)}
              onChange={checked => toggle(order.id, checked)}
            />
          ))}
          {!preparedOrders.length && (
            <p className="p-8 text-center text-xs text-zinc-400">
              لا توجد طلبات جاهزة للتجميع الآن. ستظهر الطلبات هنا فور جاهزيتها أو إعلان جاهزية مورديها.
            </p>
          )}
        </div>

        {selected.length > 0 && (
          <div className="border-t border-zinc-200 bg-zinc-50/70 p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-3 rounded-xl border border-zinc-200 text-center">
                <span className="text-[11px] text-zinc-500 block">الطلبات المحددة</span>
                <span className="text-base font-extrabold text-zinc-900">{selectedMetrics.ordersCount} طلبات</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-amber-200 text-center">
                <span className="text-[11px] text-amber-700 block">المحلات المطلوب زيارتها</span>
                <span className="text-base font-extrabold text-amber-900">{selectedMetrics.uniqueShopsCount} محلات</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-purple-200 text-center">
                <span className="text-[11px] text-purple-700 block">إجمالي الطرود</span>
                <span className="text-base font-extrabold text-purple-900">{selectedMetrics.parcelsCount} طرد</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-700 block">مجموع تحصيل COD</span>
                <span className="text-base font-extrabold text-emerald-900 font-mono">{filsToDisplay(selectedMetrics.totalCodFils)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-zinc-600 font-medium">
                جاهز لإنشاء طلبية موحدة تضم {selected.length} طلب و {selectedMetrics.uniqueShopsCount} محطة استلام.
              </p>
              <button
                type="button"
                onClick={create}
                disabled={pending || !selected.length}
                className="rounded-xl bg-[#3F4832] hover:bg-[#2d3424] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
              >
                {pending ? 'جارٍ إنشاء الطلبية...' : 'إنشاء وتجهيز كشف شركة التوصيل'}
              </button>
            </div>
          </div>
        )}

        {message && <p role="status" className="px-4 py-3 text-xs font-medium text-emerald-800 bg-emerald-50 border-t border-emerald-100">{message}</p>}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900">طلبيات شركات التوصيل الصادرة</h2>
          <p className="mt-0.5 text-xs text-zinc-500">سجل الطلبيات الصادرة وروابط الكشوفات المفصلة للشركات والمناديب.</p>
        </div>
        {batches.map(batch => (
          <BatchEditor key={batch.id} batch={batch} preparedOrders={preparedOrders} />
        ))}
        {!batches.length && (
          <p className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-xs text-zinc-400">
            لم تُنشأ أي طلبية شركة توصيل بعد.
          </p>
        )}
      </section>
    </div>
  );
}
