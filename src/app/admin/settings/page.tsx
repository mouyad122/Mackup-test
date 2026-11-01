import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { DeliveryBatchWorkspace } from './DeliveryBatchWorkspace';

export default async function DeliveryBatchSettingsPage() {
  const session = await requirePermission('manage:orders');
  const [preparedOrders, batches] = await Promise.all([
    prisma.order.findMany({
      where: {
        deliveryBatchId: null,
        deliveryAssignment: null,
        OR: [
          { status: 'PREPARED' },
          { status: 'CONFIRMED', fulfillmentStatus: { in: ['READY_FOR_PICKUP', 'ALL_PICKED_UP', 'PARTIALLY_READY'] } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, reference: true, customerName: true, customerPhone: true,
        shippingZoneNameSnapshot: true, totalAmount: true, shippingCost: true, createdAt: true,
        status: true, fulfillmentStatus: true,
        fulfillmentOrders: {
          select: {
            id: true,
            supplierId: true,
            locationId: true,
            status: true,
            supplier: { select: { name: true } },
            location: { select: { label: true, city: true } },
            packages: { select: { id: true, packageCode: true } },
          },
        },
      },
    }),
    prisma.deliveryBatch.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        orders: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true, reference: true, customerName: true, customerPhone: true,
            shippingZoneNameSnapshot: true, totalAmount: true, shippingCost: true, createdAt: true,
            status: true, fulfillmentStatus: true,
            deliveryAssignment: { select: { id: true } },
            fulfillmentOrders: {
              select: {
                id: true,
                supplierId: true,
                locationId: true,
                status: true,
                supplier: { select: { name: true } },
                location: { select: { label: true } },
                packages: { select: { id: true, packageCode: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 p-4 md:p-8">
        <header>
          <h1 className="text-3xl font-bold">طلبيات شركة التوصيل</h1>
          <p className="mt-1 text-sm text-zinc-600">أنشئ طلبية، عدّل محتواها، وشارك رابطها ثم سجّل نتيجة التوصيل من مكان واحد.</p>
        </header>
        <DeliveryBatchWorkspace preparedOrders={preparedOrders} batches={batches} />
      </main>
    </div>
  );
}
