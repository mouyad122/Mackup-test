import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import CreatePOForm from './CreatePOForm';

export default async function CreatePurchaseOrderPage() {
  const session = await requirePermission('manage:inventory');
  
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    include: {
      offers: {
        where: { isActive: true },
        include: {
          variant: {
            include: { product: true }
          }
        }
      }
    }
  });

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />
      <main className="w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
        <header>
          <h1 className="font-heading text-3xl font-bold text-[#3F4832]">إنشاء أمر شراء</h1>
          <p className="mt-1 text-zinc-600">حدد المورد والمنتجات المطلوبة</p>
        </header>

        <CreatePOForm suppliers={suppliers} />
      </main>
    </div>
  );
}
