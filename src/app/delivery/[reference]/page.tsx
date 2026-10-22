import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import { filsToDisplay } from '@/lib/money';

export default async function DeliveryBatchPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  
  const batch = await prisma.deliveryBatch.findUnique({
    where: { reference },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        include: { items: true }
      }
    }
  });

  if (!batch) {
    return notFound();
  }

  // Shared delivery links expire after 60 days; records remain available to administrators.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  if (batch.createdAt < sixtyDaysAgo) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-4 font-sans text-right" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="bg-white p-6 rounded-xl shadow-sm border text-center border-t-4 border-t-[#3F4832]">
          <h1 className="text-2xl font-bold text-[#3F4832]">طلبية شحن وتوصيل - رَواق | RAWAQ</h1>
          <p className="text-[#B7935F] mt-2 font-bold tracking-wider">رقم الطلبية: {batch.reference}</p>
          <p className="text-sm text-zinc-400 mt-1">تاريخ الإصدار: {new Date(batch.createdAt).toLocaleString('en-GB')}</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {batch.orders.map(order => (
            <article key={order.id} className="bg-white p-5 rounded-xl shadow-sm border space-y-3">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h2 className="font-bold text-lg">{order.reference}</h2>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-bold mt-1 ${
                    order.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    order.status === 'CANCELLED' || order.status === 'REFUNDED' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status === 'DELIVERED' ? 'تم التوصيل' :
                     order.status === 'CANCELLED' ? 'ملغى' :
                     order.status === 'REFUNDED' ? 'مسترد' :
                     order.status === 'PREPARED' ? 'جاهز للتسليم لشركة التوصيل' : 'قيد التوصيل'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-xs text-zinc-500">مطلوب تحصيل</p>
                  <p className="font-black text-xl text-zinc-900">
                    {order.paymentStatus === 'COD_PENDING' ? filsToDisplay(order.totalAmount) : '0 د.ا (مدفوع)'}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-sm text-zinc-700">
                <p><span className="font-bold text-zinc-500 w-16 inline-block">العميل:</span> {order.customerName}</p>
                <p><span className="font-bold text-zinc-500 w-16 inline-block">الهاتف:</span> <a href={`tel:${order.customerPhone}`} className="text-blue-600 underline" dir="ltr">{order.customerPhone}</a></p>
                {order.shippingZoneNameSnapshot && (
                  <p><span className="font-bold text-zinc-500 w-16 inline-block">المنطقة:</span> {order.shippingZoneNameSnapshot}</p>
                )}
                {order.notes && (
                  <p className="bg-yellow-50 p-2 rounded text-yellow-800 text-xs mt-2 border border-yellow-200">
                    <strong>ملاحظات:</strong> {order.notes}
                  </p>
                )}
              </div>

              <details className="text-xs mt-3 border-t pt-3">
                <summary className="cursor-pointer text-zinc-500 font-bold mb-2">تفاصيل المنتجات ({order.items.length})</summary>
                <ul className="space-y-1 pl-4 list-disc text-zinc-600">
                  {order.items.map(item => (
                    <li key={item.id}>{item.quantity}x {item.name} {item.size ? ` - ${item.size}` : ''}</li>
                  ))}
                </ul>
              </details>
            </article>
          ))}
        </div>

        {batch.orders.length === 0 && (
          <div className="bg-white p-10 text-center rounded-xl text-zinc-500 border">
            لا توجد طلبات في هذه الطلبية.
          </div>
        )}
      </div>
    </div>
  );
}
