import { getShopOperationsHubDataAction } from '@/actions/shop-orders-hub';
import ShopOperationsClient from './ShopOperationsClient';
import { Metadata } from 'next';
import { requireAuth } from '@/lib/dal';
import { AdminSidebar } from '@/components/AdminSidebar';

export const metadata: Metadata = {
  title: 'مركز متابعة وتشغيل المحلات | رَواق',
  description: 'متابعة تجهيز طرود المحلات، إرسال روابط التجهيز، وإدارة النواقص وكشوفات الاستلام',
};

export default async function ShopOrdersHubPage() {
  const session = await requireAuth();
  const data = await getShopOperationsHubDataAction();

  return (
    <div className="flex min-h-screen flex-col bg-stone-100/60 md:flex-row font-sans" dir="rtl">
      <AdminSidebar
        employeeName={session.employee.name}
        roleName={session.employee.role.name}
      />
      <main className="w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <ShopOperationsClient initialData={data} />
      </main>
    </div>
  );
}
