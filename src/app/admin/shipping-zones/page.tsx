import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import ShippingZonesClient from './ShippingZonesClient';

export default async function ShippingZonesPage() {
  const session = await requirePermission('manage:settings');
  
  const zones = await prisma.shippingZone.findMany({
    orderBy: { nameAr: 'asc' }
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 p-4 md:p-8">
        <ShippingZonesClient initialZones={zones} />
      </main>
    </div>
  );
}
