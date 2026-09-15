import React from 'react';
import Link from 'next/link';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { PrintButton } from './PrintButton';

function toLocalDatetimeString(d: Date) {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function POSReportPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const session = await requirePermission('pos:access');
  
  const resolvedParams = await searchParams;
  const fromDateParam = typeof resolvedParams.from === 'string' ? resolvedParams.from : null;
  const toDateParam = typeof resolvedParams.to === 'string' ? resolvedParams.to : null;

  // Calculate start and end
  let startOfPeriod = new Date();
  startOfPeriod.setHours(0, 0, 0, 0);
  let endOfPeriod = new Date();
  endOfPeriod.setHours(23, 59, 59, 999);

  if (fromDateParam) {
    const d = new Date(fromDateParam);
    if (!isNaN(d.getTime())) startOfPeriod = d;
  }
  
  if (toDateParam) {
    const d = new Date(toDateParam);
    if (!isNaN(d.getTime())) endOfPeriod = d;
  }

  // 1. Fetch POS Sales (Completed only, for this employee)
  const sales = await prisma.sale.findMany({
    where: {
      employeeId: session.employee.id,
      source: 'POS',
      status: 'COMPLETED',
      createdAt: {
        gte: startOfPeriod,
        lte: endOfPeriod
      }
    },
    include: { items: true, payments: true }
  });

  // 2. Fetch Online Orders (Confirmed/Shipped/Delivered only, confirmed by this employee)
  const orders = await prisma.order.findMany({
    where: {
      status: {
        in: ['CONFIRMED', 'SHIPPED', 'DELIVERED']
      },
      invoice: {
        confirmedByEmployeeId: session.employee.id
      },
      createdAt: {
        gte: startOfPeriod,
        lte: endOfPeriod
      }
    },
    include: { items: true }
  });

  // Calculate Totals
  const posTotal = sales.reduce((sum, s) => sum + s.total, 0);
  const posItemsCount = sales.reduce((count, s) => count + s.items.reduce((acc, item) => acc + item.quantity, 0), 0);

  const onlineTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const onlineItemsCount = orders.reduce((count, o) => count + o.items.reduce((acc, item) => acc + item.quantity, 0), 0);

  const grandTotal = posTotal + onlineTotal;
  const grandItemsCount = posItemsCount + onlineItemsCount;

  return (
    <div className="min-h-screen bg-[var(--color-ivory-100)] py-12 px-6" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white border border-[var(--color-ivory-200)] rounded-xl p-8 shadow-md">
        <h1 className="text-3xl font-bold font-heading text-[var(--color-charcoal-900)] mb-6 border-b border-zinc-100 pb-4">
          تقرير مبيعات اليوم (الإجمالي الكامل)
        </h1>
        
        <p className="text-zinc-500 mb-8 text-sm print:hidden">
          يتم احتساب الطلبات المكتملة والمؤكدة فقط. الطلبات الملغاة والمعلقة مستثناة.
        </p>

        {/* Filters Form (Hidden on Print) */}
        <form className="mb-8 p-4 bg-zinc-50 rounded-lg border border-zinc-200 flex flex-wrap gap-4 items-end print:hidden">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-600">من تاريخ/وقت:</label>
            <input 
              type="datetime-local" 
              name="from" 
              defaultValue={fromDateParam || toLocalDatetimeString(startOfPeriod)}
              className="border border-zinc-300 rounded px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-600">إلى تاريخ/وقت:</label>
            <input 
              type="datetime-local" 
              name="to" 
              defaultValue={toDateParam || toLocalDatetimeString(endOfPeriod)}
              className="border border-zinc-300 rounded px-3 py-1.5 text-sm outline-none"
            />
          </div>
          <button type="submit" className="bg-[var(--color-champagne-600)] text-white px-6 py-1.5 rounded font-bold hover:bg-[var(--color-champagne-700)] text-sm">
            تطبيق الفلتر
          </button>
          <Link href="/pos/report" className="text-sm text-zinc-500 hover:text-zinc-800 mr-2 underline">
            مسح الفلاتر
          </Link>
        </form>

        {/* Print Header (Visible only on print) */}
        <div className="hidden print:block mb-8 text-center border-b pb-6">
          <div className="w-48 h-20 mx-auto mb-4 flex items-center justify-center">
             <img src="/logo.png" alt="Makeup Demo Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold">ميكاب ديمو</h2>
          <p className="text-sm text-zinc-600">تقرير المبيعات من: <span dir="ltr">{startOfPeriod.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span> إلى: <span dir="ltr">{endOfPeriod.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
        </div>

        {/* Global Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { 
              margin: 1cm;
              size: A4 portrait;
            }
            body { 
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
              background-color: white !important;
            }
            /* Force the main container to span full width and center its content safely */
            .max-w-4xl {
              max-width: 100% !important;
              margin: 0 auto !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            table {
              width: 100% !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            th, td {
              padding: 8px !important;
              font-size: 12px !important;
            }
          }
        ` }} />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 print:grid-cols-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
            <h3 className="text-blue-800 font-bold mb-2">مبيعات الكاشير (POS)</h3>
            <p className="text-3xl font-bold text-blue-900 mb-1">{filsToDisplay(posTotal, 'ar')}</p>
            <p className="text-sm text-blue-600">{posItemsCount} منتج مباع</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-6">
            <h3 className="text-emerald-800 font-bold mb-2">طلبات المتجر (Online)</h3>
            <p className="text-3xl font-bold text-emerald-900 mb-1">{filsToDisplay(onlineTotal, 'ar')}</p>
            <p className="text-sm text-emerald-600">{onlineItemsCount} منتج مباع</p>
          </div>

          <div className="bg-[var(--color-champagne-50)] border border-[var(--color-champagne-200)] rounded-lg p-6 shadow-sm">
            <h3 className="text-[var(--color-charcoal-900)] font-bold mb-2 text-lg">الإجمالي الكامل (Grand Total)</h3>
            <p className="text-4xl font-extrabold text-[var(--color-champagne-600)] mb-1">{filsToDisplay(grandTotal, 'ar')}</p>
            <p className="text-sm font-bold text-[var(--color-charcoal-700)]">{grandItemsCount} منتج مباع إجمالاً</p>
          </div>
        </div>

        {/* Sales Detailed Table */}
        {sales.length > 0 && (
          <div className="mb-8 overflow-x-auto print:overflow-visible">
            <h3 className="text-xl font-bold text-zinc-900 mb-4 border-b pb-2">فواتير الكاشير (POS)</h3>
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700">
                  <th className="p-3 border">الرقم المرجعي</th>
                  <th className="p-3 border">الوقت</th>
                  <th className="p-3 border">طريقة الدفع</th>
                  <th className="p-3 border min-w-[200px]">المنتجات</th>
                  <th className="p-3 border">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3 border text-xs font-mono">{sale.id.slice(-8)}</td>
                    <td className="p-3 border" dir="ltr">{sale.createdAt.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="p-3 border font-bold">{sale.payments?.[0]?.method === 'CASH' ? 'نقدي' : sale.payments?.[0]?.method === 'CARD' ? 'بطاقة' : 'متعدد'}</td>
                    <td className="p-3 border text-xs text-zinc-600">
                      <ul className="list-disc list-inside">
                        {sale.items.map(item => (
                          <li key={item.id}>{item.name} ({item.size}) <span className="font-bold text-zinc-800">x{item.quantity}</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 border font-bold">{filsToDisplay(sale.total, 'ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Online Orders Detailed Table */}
        {orders.length > 0 && (
          <div className="mb-8 overflow-x-auto print:overflow-visible">
            <h3 className="text-xl font-bold text-zinc-900 mb-4 border-b pb-2">طلبات الأونلاين (Online Orders)</h3>
            <table className="w-full text-right border-collapse text-sm">
              <thead>
                <tr className="bg-zinc-100 text-zinc-700">
                  <th className="p-3 border">رقم الطلب</th>
                  <th className="p-3 border">العميل</th>
                  <th className="p-3 border">الوقت</th>
                  <th className="p-3 border">الحالة</th>
                  <th className="p-3 border min-w-[200px]">المنتجات</th>
                  <th className="p-3 border">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3 border font-bold">{order.reference}</td>
                    <td className="p-3 border">{order.customerName}</td>
                    <td className="p-3 border" dir="ltr">{order.createdAt.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="p-3 border font-bold">{order.status}</td>
                    <td className="p-3 border text-xs text-zinc-600">
                      <ul className="list-disc list-inside">
                        {order.items.map(item => (
                          <li key={item.id}>{item.name} ({item.size}) <span className="font-bold text-zinc-800">x{item.quantity}</span></li>
                        ))}
                      </ul>
                    </td>
                    <td className="p-3 border font-bold text-[var(--color-champagne-600)]">{filsToDisplay(order.totalAmount, 'ar')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center pt-6 border-t border-zinc-100 print:hidden">
          <PrintButton />
          <Link 
            href="/pos/cashier"
            className="inline-block bg-[var(--color-charcoal-800)] text-white px-8 py-3 font-bold rounded hover:bg-[var(--color-charcoal-900)] transition-colors"
          >
            العودة لشاشة الكاشير
          </Link>
        </div>
      </div>
    </div>
  );
}
