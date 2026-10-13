import { requireAuth } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { filsToDisplay } from '@/lib/money';
import { getInventorySettings } from '@/actions/settings-crud';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await requireAuth();
  const now = new Date(); const today = new Date(now); today.setHours(0,0,0,0); const month = new Date(now.getFullYear(),now.getMonth(),1);
  const valid = { status: { in: ['CONFIRMED','PREPARING','PREPARED','ASSIGNED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY'] } };
  const [ordersToday, ordersMonth, salesToday, txMonth, monthExpenses, pending, settings] = await Promise.all([
    prisma.order.count({ where: { ...valid, createdAt: { gte: today } } }),
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: month } }, _count: true, _sum: { totalAmount: true, shippingCost: true } }),
    prisma.order.aggregate({ where: { ...valid, createdAt: { gte: today } }, _sum: { totalAmount: true, shippingCost: true } }),
    prisma.financialTransaction.groupBy({ by: ['type'], where: { createdAt: { gte: month } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { expenseDate: { gte: month } }, _sum: { amount: true } }),
    prisma.order.count({ where: { status: { in: ['AWAITING_WHATSAPP','PENDING','CONFIRMED'] } } }),
    getInventorySettings(),
  ]);
  const total = (groups: typeof txMonth, type: string) => groups.find(g=>g.type===type)?._sum.amount ?? 0;
  const getProfit = (groups: typeof txMonth) => {
    const deliveryRev=total(groups,'DELIVERY_REVENUE')-total(groups,'DELIVERY_REVENUE_REVERSAL');
    const sales=total(groups,'SALE')-total(groups,'SALE_REVERSAL')-total(groups,'REFUND')-deliveryRev;
    const costs=total(groups,'PRODUCT_COST')-total(groups,'PRODUCT_COST_REVERSAL');
    const obligations=total(groups,'SUPPLIER_OBLIGATION')-total(groups,'SUPPLIER_OBLIGATION_REVERSAL');
    const delivery=0; // All delivery fees go to the delivery company
    const gross=sales-costs-Math.max(0,obligations-costs)+delivery;
    return { gross, net: gross-(monthExpenses._sum.amount??0) };
  };
  const supplierRows = await prisma.financialTransaction.findMany({ where: { type: { in: ['SUPPLIER_OBLIGATION','SUPPLIER_OBLIGATION_REVERSAL','SUPPLIER_PAYMENT'] } }, select: { type: true, amount: true } });
  const captainRows = await prisma.financialTransaction.findMany({ where: { type: { in: ['CAPTAIN_EARNING','CAPTAIN_PAYMENT'] } }, select: { type: true, amount: true } });
  const supplierOwed=supplierRows.filter(x=>x.type==='SUPPLIER_OBLIGATION').reduce((s,x)=>s+x.amount,0)-supplierRows.filter(x=>x.type==='SUPPLIER_OBLIGATION_REVERSAL').reduce((s,x)=>s+x.amount,0);
  const supplierPaid=supplierRows.filter(x=>x.type==='SUPPLIER_PAYMENT').reduce((s,x)=>s+x.amount,0);
  const captainEarned=captainRows.filter(x=>x.type==='CAPTAIN_EARNING').reduce((s,x)=>s+x.amount,0);const captainPaid=captainRows.filter(x=>x.type==='CAPTAIN_PAYMENT').reduce((s,x)=>s+x.amount,0);
  const lowStock=await prisma.productVariant.count({where:{stock:{lte:settings.lowStockThreshold},isActive:true}});
  const orderRows=await prisma.order.findMany({where:{...valid,createdAt:{gte:month}},select:{status:true,shippingCost:true,actualDeliveryCost:true,deliveryAssignment:{select:{id:true}},items:{select:{unitCostSnapshot:true}}}});
  const unknown=orderRows.reduce((n,o)=>n+o.items.filter(i=>i.unitCostSnapshot===null).length,0)+orderRows.filter(o=>o.actualDeliveryCost===null||(o.shippingCost>0&&!o.deliveryAssignment)).length;
  const monthProfit=getProfit(txMonth);
  const productSalesToday = (salesToday._sum.totalAmount ?? 0) - (salesToday._sum.shippingCost ?? 0);
  const productSalesMonth = (ordersMonth._sum.totalAmount ?? 0) - (ordersMonth._sum.shippingCost ?? 0);
  const cards:[string,string][]=[['مبيعات المنتجات اليوم',filsToDisplay(productSalesToday)],['مبيعات المنتجات هذا الشهر',filsToDisplay(productSalesMonth)],['طلبات اليوم',String(ordersToday)],['طلبات هذا الشهر',String(ordersMonth._count)],['متوسط الطلب هذا الشهر',filsToDisplay(ordersMonth._count?(productSalesMonth)/ordersMonth._count:0)],['الربح الإجمالي هذا الشهر',unknown?'غير مكتمل':filsToDisplay(monthProfit.gross)],['صافي الربح هذا الشهر',unknown?'غير مكتمل':filsToDisplay(monthProfit.net)],['طلبات بانتظار المتابعة',String(pending)],['درجات منخفضة المخزون',String(lowStock)],['رصيد الموردين',filsToDisplay(supplierOwed-supplierPaid)],['رصيد المندوبين',filsToDisplay(captainEarned-captainPaid)]];
  const roleName = session.employee.role.name.trim().toUpperCase().replace(/[_-]+/g, ' ');
  const isOperational = roleName === 'أدمن تشغيلي' || roleName === 'ادمن تشغيلي';
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 space-y-6 p-4 md:p-8"><header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold">لوحة الأعمال</h1><p className="mt-1 text-sm text-zinc-600">ملخص سريع من الطلبات والدفتر المالي المحفوظ.</p></div>{!isOperational && <div className="flex gap-2"><Link className="rounded border bg-white px-3 py-2 text-sm" href="/admin/reconciliation">الجرد والتسويات</Link><Link className="rounded border bg-white px-3 py-2 text-sm" href="/admin/reports">التقارير</Link></div>}</header>{unknown>0&&<div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">بيانات ربح الشهر غير مكتملة: توجد {unknown} عناصر/طلبات بلا تكلفة تاريخية مسجلة.</div>}<section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value])=><article key={label} className="rounded-lg border bg-white p-5"><h2 className="text-sm text-zinc-500">{label}</h2><p className="mt-2 text-2xl font-bold">{value}</p></article>)}</section></main></div>;
}
