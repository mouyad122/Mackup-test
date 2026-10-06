'use client';

import React, { useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface Props {
  orderId: string;
  status: string;
  phone: string;
  reference: string;
  confirmAction: (orderId: string) => Promise<any>;
  cancelAction: (orderId: string) => Promise<any>;
  updateStatusAction: (orderId: string, status: string, shippingCost?: number) => Promise<any>;
}

export function AdminOrderQuickActions({ 
  orderId,
  status,
  phone,
  reference,
  confirmAction,
  cancelAction,
  updateStatusAction
}: Props) {
  const [isPending, startTransition] = useTransition();

  const handleUpdate = (newStatus: string, openWhatsApp: boolean = false) => {
    if (openWhatsApp) {
      const msg = encodeURIComponent(`مرحباً بك في ميكاب ديمو 🌟.\nتم تأكيد طلبك والبدء بتجهيزه! رقم الطلب: #${reference}\nيمكنك استعراض الفاتورة الرسمية عبر الرابط التالي:\nhttps://www.makeup-makeup.com/ar/invoice/${orderId}`);
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    }

    startTransition(async () => {
      if (newStatus === 'PREPARING' && (status === 'PENDING' || status === 'AWAITING_WHATSAPP')) {
        // Confirm first to deduct stock and create sale/invoice
        const res = await confirmAction(orderId);
        if (res.success) {
           await updateStatusAction(orderId, newStatus);
        } else {
           alert(res.error || 'حدث خطأ أثناء التأكيد وخصم المخزون');
        }
      } else if (newStatus === 'CANCELLED') {
        const res = await cancelAction(orderId);
        if (!res.success) {
           alert(res.error || 'حدث خطأ أثناء إلغاء الطلب');
        }
      } else {
        const res = await updateStatusAction(orderId, newStatus);
        if (!res.success) {
           alert(res.error || 'حدث خطأ أثناء تحديث الحالة');
        }
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {(status === 'PENDING' || status === 'CONFIRMED' || status === 'AWAITING_WHATSAPP') && (
        <>
          <button 
            onClick={() => handleUpdate('PREPARING', true)}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded shadow-sm text-sm flex items-center justify-center gap-2 w-full transition-colors"
          >
            بدء التجهيز وتأكيد واتساب
            <ExternalLink className="w-4 h-4" />
          </button>
        </>
      )}
      {status === 'PREPARING' && (
        <button 
          onClick={() => handleUpdate('PREPARED', false)}
          disabled={isPending}
          className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded shadow-sm text-sm w-full transition-colors"
        >
          اكتمل تجهيز الطلب
        </button>
      )}
      {status === 'PREPARED' && (
        <Link href="/admin/captains" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded shadow-sm text-sm w-full text-center transition-colors">
          تعيين مندوب وإدارة التوصيل
        </Link>
      )}
      {!['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(status) && (
        <button
          onClick={() => handleUpdate('CANCELLED', false)}
          disabled={isPending}
          className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50 font-bold py-2.5 px-4 rounded shadow-sm text-sm w-full transition-colors"
        >
          إلغاء الطلب ومعالجة المخزون
        </button>
      )}
    </div>
  );
}
