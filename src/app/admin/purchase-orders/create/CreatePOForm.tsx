'use client';

import { useState } from 'react';
import { createPurchaseOrder } from '@/actions/purchaseOrders';

type SupplierOffer = {
  id: string;
  unitCost: number;
  variant: {
    id: string;
    name: string;
    sku: string;
    product: { nameAr: string };
  };
};

type Supplier = {
  id: string;
  name: string;
  offers: SupplierOffer[];
};

export default function CreatePOForm({ suppliers }: { suppliers: Supplier[] }) {
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [items, setItems] = useState<Array<{ variantId: string, quantityOrdered: number, unitCost: number }>>([]);
  const [loading, setLoading] = useState(false);

  const supplier = suppliers.find(s => s.id === selectedSupplierId);

  const addItem = (offerId: string) => {
    const offer = supplier?.offers.find(o => o.id === offerId);
    if (!offer) return;
    
    setItems(prev => {
      const exists = prev.find(i => i.variantId === offer.variant.id);
      if (exists) return prev.map(i => i.variantId === offer.variant.id ? { ...i, quantityOrdered: i.quantityOrdered + 1 } : i);
      return [...prev, { variantId: offer.variant.id, quantityOrdered: 1, unitCost: offer.unitCost }];
    });
  };

  const updateQty = (variantId: string, qty: number) => {
    if (qty < 1) return;
    setItems(prev => prev.map(i => i.variantId === variantId ? { ...i, quantityOrdered: qty } : i));
  };

  const removeItem = (variantId: string) => {
    setItems(prev => prev.filter(i => i.variantId !== variantId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !items.length) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('supplierId', selectedSupplierId);
    fd.append('items', JSON.stringify(items));
    try {
      await createPurchaseOrder(fd);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">المورد</label>
          <select 
            value={selectedSupplierId} 
            onChange={e => { setSelectedSupplierId(e.target.value); setItems([]); }}
            className="w-full rounded border px-3 py-2"
            required
          >
            <option value="">اختر المورد</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {supplier && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">عروض المورد ({supplier.offers.length})</h3>
            <div className="flex flex-wrap gap-2">
              {supplier.offers.map(offer => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => addItem(offer.id)}
                  className="rounded border bg-zinc-50 px-3 py-2 text-sm hover:bg-zinc-100 transition-colors"
                >
                  {offer.variant.product.nameAr} - {offer.variant.name} <br/>
                  <span className="text-xs text-zinc-500">{(offer.unitCost / 1000).toFixed(3)} د.أ</span>
                </button>
              ))}
              {supplier.offers.length === 0 && <p className="text-sm text-zinc-500">لا يوجد عروض لهذا المورد</p>}
            </div>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-lg">المنتجات المطلوبة</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-zinc-50 border-b">
                <tr>
                  <th className="p-3">المنتج</th>
                  <th className="p-3">الكمية</th>
                  <th className="p-3">التكلفة للوحدة</th>
                  <th className="p-3">المجموع</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(item => {
                  const offer = supplier?.offers.find(o => o.variant.id === item.variantId);
                  return (
                    <tr key={item.variantId}>
                      <td className="p-3">
                        {offer?.variant.product.nameAr} - {offer?.variant.name}
                      </td>
                      <td className="p-3">
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantityOrdered} 
                          onChange={(e) => updateQty(item.variantId, parseInt(e.target.value))}
                          className="w-20 rounded border px-2 py-1"
                        />
                      </td>
                      <td className="p-3">{(item.unitCost / 1000).toFixed(3)} د.أ</td>
                      <td className="p-3">{((item.unitCost * item.quantityOrdered) / 1000).toFixed(3)} د.أ</td>
                      <td className="p-3">
                        <button type="button" onClick={() => removeItem(item.variantId)} className="text-red-600 underline">حذف</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-zinc-50 font-bold border-t">
                <tr>
                  <td colSpan={3} className="p-3">المجموع الكلي</td>
                  <td className="p-3">{(items.reduce((acc, i) => acc + i.unitCost * i.quantityOrdered, 0) / 1000).toFixed(3)} د.أ</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="rounded bg-[#3F4832] px-6 py-2 font-bold text-white disabled:opacity-50"
          >
            {loading ? 'جاري الحفظ...' : 'إنشاء أمر الشراء'}
          </button>
        </div>
      )}
    </form>
  );
}
