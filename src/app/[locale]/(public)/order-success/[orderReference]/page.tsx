import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';
import { STORE_WHATSAPP_NUMBER } from '@/lib/contact';

export default async function OrderSuccessPage({
  params
}: {
  params: Promise<{ locale: string; orderReference: string }>
}) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale;
  const orderReference = resolvedParams.orderReference;
  const isAr = locale === 'ar';

  const order = await prisma.order.findUnique({
    where: { reference: orderReference },
    include: {
      items: true
    }
  });

  if (!order) {
    notFound();
  }

  // Re-generate WhatsApp URL in case client redirect failed
  const phoneNumber = STORE_WHATSAPP_NUMBER;
  let msg = `مرحباً رَواق،\nأود تأكيد طلبي الجديد رقم: ${order.reference}\n\n`;
  msg += `الاسم: ${order.customerName}\n`;
  msg += `رقم الهاتف: ${order.customerPhone}\n\n`;
  msg += `تفاصيل الطلب:\n`;
  for (const it of order.items) {
    msg += `- ${it.name} (${it.size}) x${it.quantity} = ${filsToDisplay(it.total, 'ar')}\n`;
  }
  msg += `\nرسوم التوصيل: ${filsToDisplay(order.shippingCost, 'ar')}\n`;
  msg += `الإجمالي: ${filsToDisplay(order.totalAmount, 'ar')}\n\n`;
  msg += `شكراً لكم.`;
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(msg)}`;

  return (
    <div className="container mx-auto px-6 py-16 bg-[var(--color-ivory-100)] min-h-screen">
      <div className="max-w-2xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-lg p-10 shadow-sm text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-emerald-600 mb-6"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        
        <h1 className="text-3xl font-bold font-heading text-[#3F4832] mb-4">
          {isAr ? 'تم استلام طلبك بنجاح!' : 'Order Placed Successfully!'}
        </h1>
        
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl mb-6 text-sm font-bold leading-relaxed">
          <p>
            {isAr 
              ? 'شكراً لطلبك من رَواق! تم تأكيد الطلب، وسيتم إرسال الفاتورة وتفاصيل الشحن والتوصيل على رقم واتساب الخاص بك قريباً.'
              : 'Thank you for shopping at Rawaq! Your order is confirmed, and the invoice with delivery details will be sent to your WhatsApp shortly.'}
          </p>
        </div>

        <div className="bg-[var(--color-ivory-100)] p-6 rounded-lg text-right mb-8">
          <div className="flex justify-between border-b pb-2 mb-2 text-sm text-zinc-600">
            <span>{isAr ? 'رقم مرجع الطلب:' : 'Order Reference:'}</span>
            <span className="font-bold font-mono">{order.reference}</span>
          </div>
          <div className="flex justify-between border-b pb-2 mb-2 text-sm text-zinc-600">
            <span>{isAr ? 'اسم المستلم:' : 'Customer Name:'}</span>
            <span className="font-bold">{order.customerName}</span>
          </div>
          <div className="flex justify-between border-b pb-2 mb-2 text-sm text-zinc-600">
            <span>{isAr ? 'رقم الهاتف:' : 'Phone Number:'}</span>
            <span className="font-bold">{order.customerPhone}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-[#3F4832] pt-2">
            <span>{isAr ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
            <span>{filsToDisplay(order.totalAmount, isAr ? 'ar' : 'en')}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Link 
            href={`/${locale}/shop`}
            className="block text-center w-full bg-[#3F4832] hover:bg-[#2e3524] text-white py-3.5 rounded-full font-bold transition-colors shadow-md"
          >
            {isAr ? 'العودة للتسوق' : 'Continue Shopping'}
          </Link>

          <Link
            href={`/${locale}/invoice/${order.reference}`}
            className="block text-center w-full bg-[var(--color-ivory-200)] hover:bg-[var(--color-ivory-300)] text-[#3F4832] py-3 rounded-full font-bold transition-colors"
          >
            {isAr ? 'عرض الفاتورة الإلكترونية' : 'View Digital Invoice'}
          </Link>
        </div>
      </div>
    </div>
  );
}
