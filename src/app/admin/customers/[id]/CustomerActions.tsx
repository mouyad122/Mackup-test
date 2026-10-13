'use client';

import { useState } from 'react';
import { updateCustomerNotes, toggleCustomerStatus } from '@/actions/customers';

export function CustomerActions({ customer }: { customer: { id: string; notes: string | null; isActive: boolean } }) {
  const [notes, setNotes] = useState(customer.notes || '');
  const [isUpdating, setIsUpdating] = useState(false);

  async function handleNotesSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateCustomerNotes(customer.id, notes);
      alert('تم تحديث الملاحظات بنجاح');
    } catch (err) {
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggleStatus() {
    setIsUpdating(true);
    try {
      await toggleCustomerStatus(customer.id, !customer.isActive);
    } catch (err) {
      alert('حدث خطأ أثناء تغيير الحالة');
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-ivory-200)]">
        <h3 className="font-bold text-lg mb-4 text-[#3F4B32]">الإجراءات والحالة</h3>
        <div className="flex items-center justify-between p-4 bg-zinc-50 rounded border border-zinc-200">
          <div>
            <p className="font-bold">حالة الحساب</p>
            <p className="text-sm text-zinc-600">يمكنك تعطيل حساب العميل لمنعه من تسجيل الدخول.</p>
          </div>
          <button 
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={`px-4 py-2 rounded font-bold text-sm text-white ${customer.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {customer.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 shadow-sm border border-[var(--color-ivory-200)]">
        <h3 className="font-bold text-lg mb-4 text-[#3F4B32]">ملاحظات إدارية</h3>
        <form onSubmit={handleNotesSubmit} className="space-y-4">
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أضف ملاحظات خاصة بالعميل هنا..."
              className="w-full rounded border border-zinc-300 p-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--color-gold-400)]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isUpdating}
              className="px-6 py-2 bg-[#3F4B32] text-white rounded font-bold text-sm hover:bg-zinc-800 disabled:opacity-50"
            >
              حفظ الملاحظات
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
