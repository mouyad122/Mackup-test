import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';
import Image from 'next/image';
import { PrintInvoiceButton } from '@/components/PrintInvoiceButton';
import { getOrderStatusInfo } from '@/lib/order-status';

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string; locale: string }> }) {
  const { orderId, locale } = await params;

  // We should try finding the order by id
  // Also we must ensure it's a valid UUID, otherwise findUnique throws error. Let's do findFirst.
  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      items: true,
      statusHistory: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!order) {
    notFound();
  }

  // Format Date
  const dateStr = order.createdAt.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const currentStatusInfo = getOrderStatusInfo(order.status);

  return (
    <div className="min-h-screen bg-zinc-100 py-12 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden border border-zinc-200">
        
        {/* Invoice Header */}
        <div className="bg-[#3F4832] text-white p-8 flex justify-between items-center border-b-4 border-[var(--color-champagne-600)] relative">
          {/* Logo added for print and display */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
              <img src="/brand/logo_rawaq.png" alt="شعار رَواق" className="max-w-full max-h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-heading mb-1">رَواق</h1>
              <p className="text-zinc-300 text-sm">Rawaq - فاتورة الطلب</p>
            </div>
          </div>
          <div className="bg-white/10 p-3 rounded-lg border border-white/20">
            <p className="text-sm font-bold text-[var(--color-champagne-400)] mb-1">رقم الطلب</p>
            <p className="text-xl font-mono">#{order.reference}</p>
          </div>
        </div>

        {/* Invoice Meta */}
        <div className="p-8 border-b border-zinc-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
            <div>
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">معلومات العميل</h3>
              <p className="font-bold text-zinc-900 text-lg">{order.customerName}</p>
              <p className="text-zinc-600 font-mono text-sm mt-0.5" dir="ltr">{order.customerPhone}</p>
            </div>
            <div className="sm:text-left">
              <h3 className="text-xs font-bold text-zinc-500 uppercase mb-2">تفاصيل الفاتورة</h3>
              <p className="font-bold text-zinc-900">{dateStr}</p>
              <div className="mt-2.5">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${currentStatusInfo.badgeBg} ${currentStatusInfo.badgeText} border ${currentStatusInfo.borderClass}`}>
                  الحالة: {currentStatusInfo.label}
                </span>
              </div>
            </div>
          </div>

          {/* Current Status Explanation Banner */}
          <div className="mt-5 p-4 rounded-xl bg-[#F7F3EA] border border-[#E9DDCC] text-sm leading-relaxed text-[#2B2B2B]">
            <p className="font-bold text-xs text-[#3F4832] uppercase tracking-wider mb-1">
              شرح وتفاصيل حالة الطلب:
            </p>
            <p className="text-xs sm:text-sm text-zinc-700">
              {currentStatusInfo.explanation}
            </p>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="p-8">
          <table className="w-full text-right mb-8">
            <thead>
              <tr className="border-b-2 border-zinc-200 text-zinc-600 text-sm">
                <th className="pb-3 font-bold">المنتج</th>
                <th className="pb-3 font-bold text-center">الكمية</th>
                <th className="pb-3 font-bold">سعر الوحدة</th>
                <th className="pb-3 font-bold">المجموع</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-zinc-100">
                  <td className="py-4">
                    <p className="font-bold text-[#3F4832]">{item.name}</p>
                    <p className="text-xs text-zinc-500">{item.size}</p>
                  </td>
                  <td className="py-4 text-center font-bold">{item.quantity}</td>
                  <td className="py-4 text-zinc-700">{filsToDisplay(item.unitPrice, 'ar')}</td>
                  <td className="py-4 font-bold text-[#3F4832]">{filsToDisplay(item.total, 'ar')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-3 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>المجموع الفرعي</span>
                <span>{filsToDisplay(order.totalAmount - order.shippingCost, 'ar')}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>رسوم التوصيل</span>
                <span>{filsToDisplay(order.shippingCost, 'ar')}</span>
              </div>
              <div className="flex justify-between font-bold text-xl text-[#3F4832] pt-3 border-t-2 border-zinc-200">
                <span>الإجمالي</span>
                <span className="text-[var(--color-champagne-600)]">{filsToDisplay(order.totalAmount, 'ar')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status History Timeline */}
        {order.statusHistory.length > 0 && (
          <div className="px-8 pb-8 pt-4 border-t border-zinc-100">
            <h3 className="text-sm font-bold font-heading text-[#3F4832] mb-4 flex items-center gap-2">
              <span>سجل ومراحل متابعة الطلب</span>
              <span className="text-xs text-zinc-400 font-normal">({order.statusHistory.length} محطات مسجلة)</span>
            </h3>
            <div className="space-y-3">
              {order.statusHistory.map((hist, index) => {
                const histInfo = getOrderStatusInfo(hist.status);
                const isLatest = index === order.statusHistory.length - 1;
                return (
                  <div 
                    key={hist.id} 
                    className={`p-3.5 rounded-xl border text-sm transition-all ${
                      isLatest 
                        ? 'bg-[#F7F3EA]/70 border-[#B7935F]/60 shadow-sm' 
                        : 'bg-zinc-50/60 border-zinc-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isLatest ? 'bg-[#3F4832]' : 'bg-zinc-400'}`} />
                        <span className={`font-bold text-xs ${isLatest ? 'text-[#3F4832]' : 'text-zinc-700'}`}>
                          {histInfo.label}
                        </span>
                        {isLatest && (
                          <span className="text-[10px] bg-[#3F4832] text-white px-2 py-0.5 rounded-full font-bold">
                            المرحلة الحالية
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 font-mono" dir="ltr">
                        {new Date(hist.createdAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed ps-4">
                      {histInfo.explanation}
                    </p>
                    {hist.notes && hist.notes !== histInfo.explanation && (
                      <p className="text-xs text-zinc-500 mt-1.5 ps-4 bg-white/80 p-2 rounded border border-zinc-200/50">
                        {hist.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="bg-zinc-50 p-6 text-center border-t border-zinc-200">
          <p className="text-zinc-600 font-bold mb-2">شكراً لثقتكم برَواق 🌟</p>
          <p className="text-xs text-zinc-400">للاستفسارات، يرجى التواصل معنا عبر وسائل التواصل المعتمدة.</p>
        </div>
      </div>
      
      {/* Print Button (Hidden on print) */}
      <div className="max-w-2xl mx-auto mt-6 text-center print:hidden">
        <PrintInvoiceButton />
      </div>

      {/* Global Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; }
          body { 
            margin: 1.6cm; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
        }
      ` }} />
    </div>
  );
}
