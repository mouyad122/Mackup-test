'use client';

import React, { useState, useTransition } from 'react';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Props {
  orderId: string;
  status: string;
  phone: string;
  reference: string;
  confirmAction: (orderId: string) => Promise<any>;
  cancelAction: (orderId: string, storeBearsDeliveryCost?: boolean) => Promise<any>;
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [showCancellation, setShowCancellation] = useState(false);
  const [shippingResponsibility, setShippingResponsibility] = useState<'STORE' | 'CUSTOMER' | ''>('');

  const openConfirmationWhatsApp = (popup: Window | null) => {
    const invoiceUrl = `${window.location.origin}/ar/invoice/${orderId}`;
    const msg = encodeURIComponent(`مرحباً بك في فيلورا بيوتي 🌟.\nتم تأكيد طلبك والبدء بتجهيزه! رقم الطلب: #${reference}\nيمكنك استعراض الفاتورة الرسمية عبر الرابط التالي:\n${invoiceUrl}`);
    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${msg}`;
    if (popup) {
      popup.location.href = whatsappUrl;
    } else {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleUpdate = (newStatus: string, openWhatsApp: boolean = false) => {
    // Open a blank tab while this is still a user gesture so browsers do not
    // block WhatsApp after the server-side confirmation finishes.
    const whatsappPopup = openWhatsApp ? window.open('about:blank', '_blank') : null;
    startTransition(async () => {
      if (newStatus === 'PREPARING' && (status === 'PENDING' || status === 'AWAITING_WHATSAPP')) {
        // Confirm first to deduct stock and create sale/invoice
        const res = await confirmAction(orderId);
        if (res.success) {
          const updated = await updateStatusAction(orderId, newStatus);
          if (!updated.success) {
            whatsappPopup?.close();
            setMessage(updated.error || 'تعذر تحديث حالة الطلب.');
            return;
          }
          if (openWhatsApp) openConfirmationWhatsApp(whatsappPopup);
          setMessage('تم تحديث حالة الطلب إلى قيد التجهيز.');
          router.refresh();
        } else {
          whatsappPopup?.close();
          setMessage(res.error || 'حدث خطأ أثناء التأكيد وخصم المخزون');
        }
      } else {
        const res = await updateStatusAction(orderId, newStatus);
        if (!res.success) {
          setMessage(res.error || 'حدث خطأ أثناء تحديث الحالة');
        } else {
          setMessage('تم تحديث حالة الطلب.');
          router.refresh();
        }
      }
    });
  };

  const confirmCancellation = () => {
    if (!shippingResponsibility) {
      setMessage('حدد الجهة التي تتحمل رسوم التوصيل قبل الإلغاء.');
      return;
    }
    startTransition(async () => {
      const res = await cancelAction(orderId, shippingResponsibility === 'STORE');
      if (!res.success) {
        setMessage(res.error || 'حدث خطأ أثناء إلغاء الطلب');
        return;
      }
      setShowCancellation(false);
      setMessage('تم إلغاء الطلب وتحديث السجلات المالية.');
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {message && <p role="status" className="rounded border border-zinc-200 bg-zinc-50 p-2 text-xs text-zinc-700">{message}</p>}
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
        <Link href="/admin/settings" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded shadow-sm text-sm w-full text-center transition-colors">
          إنشاء طلبية شركة التوصيل
        </Link>
      )}
      {!['DELIVERED', 'REFUNDED', 'CANCELLED'].includes(status) && (
        <button
          onClick={() => { setShippingResponsibility(''); setShowCancellation(true); }}
          disabled={isPending}
          className="bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 disabled:opacity-50 font-bold py-2.5 px-4 rounded shadow-sm text-sm w-full transition-colors"
        >
          إلغاء الطلب ومعالجة المخزون
        </button>
      )}
      {showCancellation && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">
        <p className="mb-2 font-bold text-red-900">حدد إلزامياً رسوم التوصيل عند الإلغاء</p>
        <label className="mb-2 flex items-center gap-2"><input type="radio" checked={shippingResponsibility === 'STORE'} onChange={() => setShippingResponsibility('STORE')} />المتجر يتحمل رسوم التوصيل</label>
        <label className="mb-3 flex items-center gap-2"><input type="radio" checked={shippingResponsibility === 'CUSTOMER'} onChange={() => setShippingResponsibility('CUSTOMER')} />المتجر لا يتحمل رسوم التوصيل</label>
        <div className="flex gap-2"><button type="button" onClick={confirmCancellation} disabled={isPending || !shippingResponsibility} className="rounded bg-red-700 px-3 py-2 font-bold text-white disabled:opacity-50">تأكيد الإلغاء</button><button type="button" onClick={() => setShowCancellation(false)} className="rounded border px-3 py-2">رجوع</button></div>
      </div>}
    </div>
  );
}
