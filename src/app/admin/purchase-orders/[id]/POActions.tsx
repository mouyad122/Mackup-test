'use client';

import { useState } from 'react';
import { markPurchaseOrderSent, receiveGoods, createSupplierInvoice, paySupplierInvoice } from '@/actions/purchaseOrders';

type POItem = {
  id: string;
  variant: {
    id: string;
    name: string;
    sku: string;
    product: { nameAr: string };
  };
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
};

export function POClientActions({ poId, status, items, warehouses, hasInvoice, invoiceId, invoiceStatus }: { 
  poId: string, 
  status: string, 
  items: POItem[], 
  warehouses: { id: string, name: string }[],
  hasInvoice: boolean,
  invoiceId?: string,
  invoiceStatus?: string
}) {
  const [loading, setLoading] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '');
  const [receiptItems, setReceiptItems] = useState(
    items.map(i => ({ id: i.id, variantId: i.variant.id, quantityReceived: Math.max(0, i.quantityOrdered - i.quantityReceived) }))
  );

  const handleMarkSent = async () => {
    setLoading(true);
    await markPurchaseOrderSent(poId);
    setLoading(false);
  };

  const handleCreateInvoice = async () => {
    setLoading(true);
    const fd = new FormData();
    fd.append('purchaseOrderId', poId);
    await createSupplierInvoice(fd);
    setLoading(false);
  };

  const handlePayInvoice = async () => {
    if (!invoiceId) return;
    setLoading(true);
    await paySupplierInvoice(invoiceId);
    setLoading(false);
  };

  const handleReceiveGoods = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId) return alert('الرجاء اختيار المستودع');
    setLoading(true);
    const fd = new FormData();
    fd.append('id', poId);
    fd.append('warehouseId', warehouseId);
    fd.append('items', JSON.stringify(receiptItems));
    await receiveGoods(fd);
    setReceiving(false);
    setLoading(false);
  };

  const fullyReceived = items.every(i => i.quantityReceived >= i.quantityOrdered);

  return (
    <div className="space-y-4">
      {status === 'DRAFT' && (
        <button onClick={handleMarkSent} disabled={loading} className="rounded bg-blue-600 px-4 py-2 text-white font-bold disabled:opacity-50">
          تأكيد وإرسال للمورد
        </button>
      )}

      {(status === 'SENT' || status === 'PARTIAL') && !fullyReceived && !receiving && (
        <button onClick={() => setReceiving(true)} disabled={loading} className="rounded bg-green-600 px-4 py-2 text-white font-bold disabled:opacity-50">
          استلام بضائع
        </button>
      )}

      {receiving && (
        <form onSubmit={handleReceiveGoods} className="rounded-lg border bg-zinc-50 p-4 space-y-4">
          <h4 className="font-bold text-lg">تفاصيل الاستلام</h4>
          <div>
            <label className="block text-sm font-medium mb-1">المستودع المستلم</label>
            <select value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required className="rounded border px-3 py-2">
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <table className="w-full text-right text-sm">
            <thead>
              <tr>
                <th className="py-2">المنتج</th>
                <th className="py-2">الكمية المطلوبة</th>
                <th className="py-2">الكمية المستلمة مسبقاً</th>
                <th className="py-2">الكمية المستلمة الآن</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const ri = receiptItems.find(r => r.id === item.id);
                return (
                  <tr key={item.id}>
                    <td className="py-2">{item.variant.product.nameAr} - {item.variant.name}</td>
                    <td className="py-2">{item.quantityOrdered}</td>
                    <td className="py-2">{item.quantityReceived}</td>
                    <td className="py-2">
                      <input 
                        type="number" min="0" max={item.quantityOrdered - item.quantityReceived} 
                        value={ri?.quantityReceived || 0}
                        onChange={e => setReceiptItems(prev => prev.map(p => p.id === item.id ? { ...p, quantityReceived: parseInt(e.target.value) || 0 } : p))}
                        className="w-24 rounded border px-2 py-1"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="rounded bg-green-600 px-4 py-2 text-white font-bold disabled:opacity-50">حفظ الاستلام</button>
            <button type="button" onClick={() => setReceiving(false)} className="rounded bg-gray-200 px-4 py-2 font-bold text-gray-700">إلغاء</button>
          </div>
        </form>
      )}

      {(status === 'PARTIAL' || status === 'COMPLETED') && !hasInvoice && (
        <button onClick={handleCreateInvoice} disabled={loading} className="rounded bg-[#3F4B32] px-4 py-2 text-white font-bold disabled:opacity-50">
          إنشاء فاتورة مورد
        </button>
      )}

      {hasInvoice && invoiceStatus !== 'PAID' && (
        <button onClick={handlePayInvoice} disabled={loading} className="rounded bg-teal-600 px-4 py-2 text-white font-bold disabled:opacity-50">
          تسديد الفاتورة
        </button>
      )}
    </div>
  );
}
