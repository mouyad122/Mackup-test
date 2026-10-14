'use client';

import React, { useState } from 'react';
import { syncOrderProfits, registerOrderPayment, updateOrderDelivery } from '@/actions/orders';
import { useRouter } from 'next/navigation';

export function AdminOrderFinancials({ orderId, hasMissingProfits }: { orderId: string, hasMissingProfits: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [actualCost, setActualCost] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const handleSyncProfits = async () => {
    setLoading(true);
    const res = await syncOrderProfits(orderId);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert('Error syncing profits: ' + (res as any).error);
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount) return;
    setLoading(true);
    const res = await registerOrderPayment(orderId, parseFloat(paymentAmount) * 1000, 'CASH');
    setLoading(false);
    if (res.success) {
      setPaymentAmount('');
      router.refresh();
    } else {
      alert('Error registering payment: ' + (res as any).error);
    }
  };

  const handleUpdateDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCost) return;
    setLoading(true);
    const res = await updateOrderDelivery(orderId, parseFloat(actualCost) * 1000);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert('Error updating delivery: ' + (res as any).error);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-[var(--color-ivory-200)] shadow-sm space-y-6">
      <h3 className="text-lg font-bold text-[#3F4B32] mb-4 border-b pb-2">
        الإدارة المالية واللوجستية
      </h3>

      {hasMissingProfits && (
        <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
          <p className="text-sm text-amber-800 mb-2 font-bold">تحديث الحسابات (بيانات غير مكتملة)</p>
          <p className="text-xs text-amber-700 mb-3">
            هذا الطلب يحتوي على بيانات تكلفة أو أرباح مفقودة لأنه مسجل قديماً. يمكنك سحب التكاليف الحالية للمنتجات لحساب الأرباح.
          </p>
          <button 
            onClick={handleSyncProfits} 
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm font-bold transition-colors"
          >
            {loading ? 'جاري التحديث...' : 'سحب التكاليف وإعادة الحساب'}
          </button>
        </div>
      )}

      <form onSubmit={handleRegisterPayment} className="space-y-3 pt-4 border-t">
        <h4 className="font-bold text-sm text-zinc-800">تسجيل دفعة نقدية</h4>
        <div className="flex gap-2">
          <input 
            type="number" 
            step="0.001" 
            min="0"
            required 
            placeholder="المبلغ (د.أ)" 
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            className="border rounded p-2 text-sm w-full"
          />
          <button type="submit" disabled={loading} className="bg-zinc-800 text-white px-4 py-2 rounded text-sm font-bold whitespace-nowrap">
            تسجيل الدفع
          </button>
        </div>
      </form>

      <form onSubmit={handleUpdateDelivery} className="space-y-3 pt-4 border-t">
        <h4 className="font-bold text-sm text-zinc-800">تحديث تكلفة التوصيل الفعلية</h4>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input 
              type="number"  
              step="0.001" 
              min="0"
              required 
              placeholder="تكلفة التوصيل الفعلية (د.أ)" 
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              className="border rounded p-2 text-sm w-full"
            />
            <button type="submit" disabled={loading} className="bg-zinc-800 text-white px-4 py-2 rounded text-sm font-bold whitespace-nowrap">
              حفظ التوصيل
            </button>
          </div>
        </div>
      </form>

    </div>
  );
}
