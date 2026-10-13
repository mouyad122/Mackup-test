'use client';

import React, { useState, useTransition } from 'react';
import { approveReview, hideReview, deleteReview } from '@/actions/reviews';

type ReviewWithRelations = {
  id: string;
  rating: number;
  comment: string | null;
  isVerified: boolean;
  isApproved: boolean;
  createdAt: Date;
  product: { id: string; nameAr: string; nameEn: string };
  customer: { id: string; firstName: string; lastName: string | null };
};

export function AdminReviewsClient({ initialReviews }: { initialReviews: ReviewWithRelations[] }) {
  const [reviews, setReviews] = useState(initialReviews);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'HIDDEN'>('ALL');
  const [isPending, startTransition] = useTransition();

  const handleApprove = (id: string) => {
    startTransition(async () => {
      await approveReview(id);
      setReviews(reviews.map(r => r.id === id ? { ...r, isApproved: true } : r));
    });
  };

  const handleHide = (id: string) => {
    startTransition(async () => {
      await hideReview(id);
      setReviews(reviews.map(r => r.id === id ? { ...r, isApproved: false } : r));
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المراجعة بشكل نهائي؟')) return;
    startTransition(async () => {
      await deleteReview(id);
      setReviews(reviews.filter(r => r.id !== id));
    });
  };

  const filtered = reviews.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'APPROVED') return r.isApproved;
    if (filter === 'HIDDEN') return !r.isApproved;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('ALL')} className={`px-4 py-2 rounded-md text-sm font-medium ${filter === 'ALL' ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-700'}`}>الكل</button>
        <button onClick={() => setFilter('APPROVED')} className={`px-4 py-2 rounded-md text-sm font-medium ${filter === 'APPROVED' ? 'bg-green-600 text-white' : 'bg-white border text-zinc-700'}`}>مقبول (معروض)</button>
        <button onClick={() => setFilter('HIDDEN')} className={`px-4 py-2 rounded-md text-sm font-medium ${filter === 'HIDDEN' ? 'bg-amber-600 text-white' : 'bg-white border text-zinc-700'}`}>مخفي</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm text-right">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600">
            <tr>
              <th className="px-4 py-3 font-semibold">العميل</th>
              <th className="px-4 py-3 font-semibold">المنتج</th>
              <th className="px-4 py-3 font-semibold">التقييم</th>
              <th className="px-4 py-3 font-semibold">التعليق</th>
              <th className="px-4 py-3 font-semibold">الحالة</th>
              <th className="px-4 py-3 font-semibold">التاريخ</th>
              <th className="px-4 py-3 font-semibold">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map(r => (
              <tr key={r.id} className="hover:bg-zinc-50">
                <td className="px-4 py-4">
                  <div className="font-medium text-zinc-900">{r.customer.firstName} {r.customer.lastName || ''}</div>
                  {r.isVerified && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full mt-1 inline-block">شراء مؤكد</span>}
                </td>
                <td className="px-4 py-4 text-zinc-700 max-w-[200px] truncate" title={r.product.nameAr}>{r.product.nameAr}</td>
                <td className="px-4 py-4">
                  <div className="flex text-amber-500">
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </div>
                </td>
                <td className="px-4 py-4 text-zinc-600 max-w-md">
                  {r.comment || <span className="text-zinc-400 italic">بدون تعليق</span>}
                </td>
                <td className="px-4 py-4">
                  {r.isApproved ? (
                    <span className="text-green-700 bg-green-50 px-2.5 py-1 rounded-md text-xs font-medium">معروض</span>
                  ) : (
                    <span className="text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-medium">مخفي</span>
                  )}
                </td>
                <td className="px-4 py-4 text-zinc-500">
                  {new Date(r.createdAt).toLocaleDateString('en-GB')}
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {r.isApproved ? (
                      <button 
                        onClick={() => handleHide(r.id)} 
                        disabled={isPending}
                        className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded hover:bg-amber-200 transition-colors"
                      >
                        إخفاء
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleApprove(r.id)} 
                        disabled={isPending}
                        className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded hover:bg-green-200 transition-colors"
                      >
                        قبول وعرض
                      </button>
                    )}
                    <button 
                      onClick={() => handleDelete(r.id)} 
                      disabled={isPending}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded hover:bg-red-200 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  لا توجد تقييمات مطابقة للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
