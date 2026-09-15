import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';

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
  const phoneNumber = '962785050655';
  let msg = `مرحباً ميكاب ديمو،\nأود تأكيد طلبي الجديد رقم: ${order.reference}\n\n`;
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
        
        <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)] mb-4">
          {isAr ? 'تم تسجيل طلبك بنجاح!' : 'Order Placed Successfully!'}
        </h1>
        
        <p className="text-zinc-650 mb-8 leading-relaxed">
          {isAr 
            ? 'لقد تم إرسال معلومات طلبك. يرجى التأكيد عبر تطبيق الواتساب لإتمام عملية الشحن والتوصيل.'
            : 'Your order details have been saved. Please confirm via WhatsApp to complete delivery.'}
        </p>

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
          <div className="flex justify-between text-lg font-bold text-[var(--color-charcoal-900)] pt-2">
            <span>{isAr ? 'المبلغ الإجمالي:' : 'Grand Total:'}</span>
            <span>{filsToDisplay(order.totalAmount, isAr ? 'ar' : 'en')}</span>
          </div>
        </div>

        <div className="space-y-4">
          <a 
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center w-full bg-[#25D366] hover:bg-[#20ba5a] text-white py-3.5 rounded font-bold transition-colors"
          >
            {isAr ? 'فتح المحادثة للتأكيد الآن' : 'Open WhatsApp to Confirm'}
          </a>
          
          <Link 
            href={`/${locale}/shop`}
            className="block text-center w-full bg-[var(--color-ivory-200)] hover:bg-[var(--color-ivory-300)] text-[var(--color-charcoal-900)] py-3 rounded font-bold transition-colors"
          >
            {isAr ? 'العودة للتسوق' : 'Continue Shopping'}
          </Link>
        </div>
      </div>
    </div>
  );
}
