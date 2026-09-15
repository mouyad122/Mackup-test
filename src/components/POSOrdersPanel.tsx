'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { X, RefreshCcw, ExternalLink } from 'lucide-react';
import { getPOSOrders, updatePOSOrderStatus } from '@/actions/pos-orders';
import { confirmStorefrontOrder, cancelStorefrontOrder } from '@/actions/orders';
import { createBrowserClient } from '@supabase/ssr';
import { AdminOrderQuickActions } from './AdminOrderQuickActions';

export function POSOrdersPanel({
  onClose,
  hasManagePermission,
  locale = 'ar',
  isInline = false
}: {
  onClose?: () => void;
  hasManagePermission: boolean;
  locale?: string;
  isInline?: boolean;
}) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'NEW' | 'PREP' | 'SHIPPED' | 'DONE'>('NEW');
  const [isPending, startTransition] = useTransition();

  // Supabase client for realtime
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const fetchOrders = async () => {
    setLoading(true);
    const res = await getPOSOrders();
    if (res.success) {
      setOrders(res.orders || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Set up Realtime subscription
    const channel = supabase
      .channel('pos-public-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Order' },
        (payload) => {
          // Play Audio Chime
          try {
            const audio = new Audio('/chime.mp3'); // We'll assume a generic chime or it fails silently
            audio.play().catch(() => {});
          } catch (e) {}

          // We can append it or re-fetch
          fetchOrders();
          
          // Toast Notification (Browser API)
          if (Notification.permission === 'granted') {
            new Notification('طلب جديد!', {
              body: `تم استلام طلب جديد برقم: ${payload.new.reference}`,
            });
          } else if (Notification.permission !== 'denied') {
            Notification.requestPermission();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleUpdateStatus = (orderId: string, newStatus: string) => {
    if (!hasManagePermission) return;
    if (!confirm('هل أنت متأكد من تغيير حالة الطلب؟')) return;

    startTransition(async () => {
      const res = await updatePOSOrderStatus(orderId, newStatus);
      if (res.success) {
        setSelectedOrder(null);
        fetchOrders();
      } else {
        alert(res.error || 'حدث خطأ');
      }
    });
  };

  const filteredOrders = orders.filter((o) => {
    switch (activeTab) {
      case 'NEW': return ['PENDING', 'AWAITING_WHATSAPP', 'CONFIRMED'].includes(o.status);
      case 'PREP': return ['PREPARING', 'PREPARED'].includes(o.status);
      case 'SHIPPED': return ['SHIPPED'].includes(o.status);
      case 'DONE': return ['DELIVERED', 'CANCELLED'].includes(o.status);
      default: return true;
    }
  });

  return (
    <div className={isInline ? "flex flex-col h-full w-full bg-white shadow-2xl rounded-xl overflow-hidden relative" : "fixed inset-y-0 left-0 w-full md:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right relative"} dir="rtl">
      <div className="bg-[var(--color-charcoal-900)] text-white p-4 flex justify-between items-center shrink-0">
        <h2 className="font-bold text-lg">طلبات المتجر (Online)</h2>
        <div className="flex items-center gap-3">
          <button onClick={fetchOrders} className="hover:text-[var(--color-champagne-400)] transition-colors">
            <RefreshCcw className="w-5 h-5" />
          </button>
          {!isInline && onClose && (
            <button onClick={onClose} className="hover:text-red-300 transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <div className="flex bg-white border-b border-zinc-200 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button onClick={() => setActiveTab('NEW')} className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'NEW' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>جديدة ومؤكدة</button>
        <button onClick={() => setActiveTab('PREP')} className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'PREP' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>قيد التجهيز</button>
        <button onClick={() => setActiveTab('SHIPPED')} className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'SHIPPED' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>في الطريق</button>
        <button onClick={() => setActiveTab('DONE')} className={`flex-1 min-w-[80px] py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'DONE' ? 'border-[var(--color-charcoal-900)] text-[var(--color-charcoal-900)]' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}>مكتملة وملغاة</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50">
        {loading ? (
          <div className="text-center text-zinc-500 py-10">جاري التحميل...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center text-zinc-500 py-10">لا توجد طلبات في هذا القسم</div>
        ) : (
          filteredOrders.map((order) => (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className="bg-white p-4 rounded-lg shadow-sm border border-zinc-200 cursor-pointer hover:border-[var(--color-champagne-600)] transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-[var(--color-charcoal-900)]">#{order.reference}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'SHIPPED' ? 'bg-purple-100 text-purple-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-sm font-bold text-zinc-800">{order.customerName}</p>
              <p className="text-xs text-zinc-500 mb-2">{order.customerPhone}</p>
              <div className="text-sm text-[var(--color-champagne-600)] font-bold">
                {(order.totalAmount / 1000).toFixed(3)} د.أ
              </div>
            </div>
          ))
        )}
      </div>

      {selectedOrder && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col animate-fade-in">
          <div className="bg-zinc-100 p-4 flex justify-between items-center border-b shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedOrder(null)} className="flex items-center gap-1 text-zinc-600 hover:text-zinc-900 font-bold bg-white px-3 py-1.5 rounded border shadow-sm">
                <span>&rarr;</span>
                <span>رجوع</span>
              </button>
              <h3 className="font-bold text-[var(--color-charcoal-900)]">تفاصيل الطلب #{selectedOrder.reference}</h3>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-sm pb-16">
            <div>
              <h4 className="text-xs font-bold text-zinc-500 mb-1">معلومات العميل</h4>
              <p className="font-bold">{selectedOrder.customerName}</p>
              <p className="text-zinc-700">{selectedOrder.customerPhone}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-500 mb-2">المنتجات المطلوبة</h4>
              <div className="space-y-3">
                {selectedOrder.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between border-b pb-2">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-zinc-500">{item.size} x {item.quantity}</p>
                    </div>
                    <span className="font-bold">{(item.total / 1000).toFixed(3)} د.أ</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-zinc-600">
                <span>المجموع الفرعي:</span>
                <span>{( (selectedOrder.totalAmount - selectedOrder.shippingCost) / 1000).toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>رسوم التوصيل:</span>
                <span>{(selectedOrder.shippingCost / 1000).toFixed(3)} د.أ</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-[var(--color-charcoal-900)] pt-2 border-t">
                <span>الإجمالي الكامل:</span>
                <span>{(selectedOrder.totalAmount / 1000).toFixed(3)} د.أ</span>
              </div>
            </div>

            {/* ACTION BUTTONS UNDER TOTAL */}
            <div className="pt-6 space-y-3">
              {hasManagePermission ? (
                <div className="mb-6">
                  <AdminOrderQuickActions 
                    orderId={selectedOrder.id} 
                    status={selectedOrder.status} 
                    phone={selectedOrder.customerPhone} 
                    reference={selectedOrder.reference} 
                    confirmAction={confirmStorefrontOrder}
                    cancelAction={cancelStorefrontOrder}
                    updateStatusAction={async (id, s) => updatePOSOrderStatus(id, s)} 
                  />
                </div>
              ) : (
                <div className="text-center text-xs text-red-500 bg-red-50 p-2 rounded">لا تملك صلاحية تعديل حالة الطلب</div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
