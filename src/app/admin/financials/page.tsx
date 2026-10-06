import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import Link from 'next/link';
import { calculateDeliveryProfit, classifyRefund } from '@/lib/business-finance';

function getRange(preset: string | undefined, fromValue?: string, toValue?: string) {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(now); end.setHours(23, 59, 59, 999);
  if (preset === 'today') return { from: start, to: end };
  if (preset === 'yesterday') { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); return { from: start, to: end }; }
  if (preset === 'week') { start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return { from: start, to: end }; }
  if (preset === 'month') { start.setDate(1); return { from: start, to: end }; }
  if (preset === 'lastMonth') { start.setDate(1); start.setMonth(start.getMonth() - 1); end.setDate(0); end.setHours(23,59,59,999); return { from: start, to: end }; }
  if (preset === 'year') { start.setMonth(0, 1); return { from: start, to: end }; }
  const from = fromValue && !Number.isNaN(Date.parse(fromValue)) ? new Date(`${fromValue}T00:00:00`) : undefined;
  const to = toValue && !Number.isNaN(Date.parse(toValue)) ? new Date(`${toValue}T23:59:59.999`) : undefined;
  return { from, to };
}

export default async function FinancialsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requirePermission('manage:settings');
  const p = await searchParams;
  const { from, to } = getRange(p.preset, p.from, p.to);
  const dateOrder = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const selectedOrder = p.orderId ? { id: p.orderId } : {};
  const relationFilters = {
    ...(p.governorate ? { shippingZoneNameSnapshot: { contains: p.governorate, mode: 'insensitive' as const } } : {}),
    ...(p.categoryId || p.brandId || p.productId ? { items: { some: {
      ...(p.categoryId ? { product: { categoryId: p.categoryId } } : {}),
      ...(p.brandId ? { product: { brandId: p.brandId } } : {}),
      ...(p.productId ? { productId: p.productId } : {}),
    } } } : {}),
  };
  const filteredOrders = await prisma.order.findMany({
    where: { AND: [dateOrder, selectedOrder, relationFilters, { status: { in: ['CONFIRMED','PREPARING','PREPARED','ASSIGNED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','FAILED_DELIVERY'] } },
      ...(p.supplierId ? [{ items: { some: { supplierIdSnapshot: p.supplierId } } }] : []),
      ...(p.captainId ? [{ deliveryAssignment: { captainId: p.captainId } }] : []),
    ] }, select: { id: true, discountAmount: true, couponDiscount: true, rewardDiscount: true, status: true, shippingCost: true, actualDeliveryCost: true, deliveryAssignment: { select: { captainEarning: true } }, items: { select: { unitCostSnapshot: true } } },
  });
  const hasOrderFilters = Boolean(p.orderId || p.governorate || p.categoryId || p.brandId || p.productId);
  const txWhere = {
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    ...(p.type ? { type: p.type } : {}), ...(p.supplierId ? { supplierId: p.supplierId } : {}),
    ...(p.captainId ? { captainId: p.captainId } : {}),
    ...(hasOrderFilters ? { orderId: { in: filteredOrders.map(o => o.id) } } : {}),
  };
  const posFilterApplies = !p.supplierId && !p.captainId && !hasOrderFilters && (!p.type || ['SALE','DISCOUNT'].includes(p.type));
  const [groups, transactions, suppliers, captains, zones, categories, brands, products, orders, expenseAggregate, posSales, legacyPOS, legacyRefunds] = await Promise.all([
    prisma.financialTransaction.groupBy({ by: ['type'], where: txWhere, _sum: { amount: true } }),
    prisma.financialTransaction.findMany({ where: txWhere, orderBy: { createdAt: 'desc' }, take: 300, include: { order: { select: { reference: true } } } }),
    prisma.supplier.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.captain.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.shippingZone.findMany({ select: { nameAr: true }, orderBy: { nameAr: 'asc' } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.brand.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
    prisma.product.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: 'asc' } }),
    prisma.order.findMany({ where: { ...dateOrder, ...selectedOrder }, select: { id: true, reference: true }, orderBy: { createdAt: 'desc' }, take: 500 }),
    prisma.expense.aggregate({ where: { ...(from || to ? { expenseDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(p.type && p.type !== 'EXPENSE' || p.supplierId || p.captainId || hasOrderFilters ? { id: '__none__' } : {}) }, _sum: { amount: true } }),
    posFilterApplies ? prisma.sale.count({ where: { status: 'COMPLETED', source: 'POS', items: { some: { unitCostSnapshot: null } }, ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) } }) : Promise.resolve(0),
    posFilterApplies ? prisma.sale.aggregate({ where: { status: 'COMPLETED', source: 'POS', financialTransactions: { none: { type: 'SALE' } }, ...(from || to ? { completedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, _sum: { subtotal: true, discount: true } }) : Promise.resolve({ _sum: { subtotal: 0, discount: 0 } }),
    !p.type || p.type === 'REFUND'
      ? prisma.financialTransaction.findMany({
          where: { ...txWhere, type: 'REFUND' },
          select: {
            amount: true,
            order: { select: { shippingCost: true, invoice: { select: { netSubtotalFils: true, shippingAmountFils: true } } } },
          },
        })
      : Promise.resolve([]),
  ]);
  const sumByType = new Map(groups.map(g => [g.type, g._sum.amount ?? 0]));
  const sum = (type: string) => sumByType.get(type) ?? 0;
  const legacySaleRevenue = !p.type || p.type === 'SALE' ? legacyPOS._sum.subtotal ?? 0 : 0;
  const legacySaleDiscount = !p.type || p.type === 'DISCOUNT' ? legacyPOS._sum.discount ?? 0 : 0;
  const allDiscount = sum('DISCOUNT') + sum('COUPON') + sum('REWARD_DISCOUNT') - sum('DISCOUNT_REVERSAL') - sum('COUPON_REVERSAL') - sum('REWARD_DISCOUNT_REVERSAL') + legacySaleDiscount;
  const legacyRefundParts = legacyRefunds.reduce((parts, t) => {
    if (!t.order) return { product: parts.product + t.amount, delivery: parts.delivery };
    const split = classifyRefund(t.amount, t.order.invoice?.netSubtotalFils ?? 0, t.order.invoice?.shippingAmountFils ?? t.order.shippingCost);
    return { product: parts.product + split.product, delivery: parts.delivery + split.delivery };
  }, { product: 0, delivery: 0 });
  const legacyRefundDelivery = legacyRefundParts.delivery;
  const legacyRefundProduct = legacyRefundParts.product;
  const netProductSales = sum('SALE') - sum('SALE_REVERSAL') - legacyRefundProduct - sum('REFUND_PRODUCT') + legacySaleRevenue;
  const grossProductSales = netProductSales + allDiscount;
  const couponDiscount = filteredOrders.reduce((n, o) => n + o.couponDiscount, 0);
  const rewardDiscount = filteredOrders.reduce((n, o) => n + o.rewardDiscount, 0);
  const obligations = sum('SUPPLIER_OBLIGATION') - sum('SUPPLIER_OBLIGATION_REVERSAL');
  const productCosts = sum('PRODUCT_COST') - sum('PRODUCT_COST_REVERSAL');
  const supplierShare = Math.max(0, obligations - productCosts);
  const supplierPaid = sum('SUPPLIER_PAYMENT');
  const deliveryRevenue = sum('DELIVERY_REVENUE') - sum('DELIVERY_REVENUE_REVERSAL') - legacyRefundDelivery - sum('REFUND_DELIVERY');
  const carrierCost = sum('DELIVERY_COST') - sum('DELIVERY_COST_REVERSAL');
  const captainEarned = sum('CAPTAIN_EARNING');
  const captainPaid = sum('CAPTAIN_PAYMENT');
  const refunds = sum('REFUND') + sum('REFUND_PRODUCT') + sum('REFUND_DELIVERY') + sum('REFUND_TAX');
  const expenses = expenseAggregate._sum.amount ?? 0;
  const productProfit = netProductSales - productCosts - supplierShare;
  const deliveryProfit = calculateDeliveryProfit(deliveryRevenue, carrierCost, captainEarned);
  const grossProfit = productProfit + deliveryProfit;
  const unknownItems = filteredOrders.reduce((n, o) => n + o.items.filter(i => i.unitCostSnapshot === null).length, 0);
  const unknownDelivery = filteredOrders.filter(o => o.actualDeliveryCost === null).length;
  const unknownCaptainEarning = filteredOrders.filter(o => o.shippingCost > 0 && !o.deliveryAssignment && !['CANCELLED','REFUNDED'].includes(o.status)).length;
  const profitComplete = unknownItems === 0 && unknownDelivery === 0 && unknownCaptainEarning === 0 && posSales === 0;
  const cards: [string, number, boolean?][] = [
    ['إجمالي مبيعات المنتجات', grossProductSales], ['الخصومات', allDiscount], ['خصومات القسائم', couponDiscount], ['خصومات المكافآت', rewardDiscount],
    ['صافي مبيعات المنتجات', netProductSales], ['إيرادات التوصيل', deliveryRevenue], ['تكاليف المنتج / المورد', obligations], ['تكاليف الناقل', carrierCost],
    ['أجور المندوبين', captainEarned], ['المبالغ المستردة', refunds], ['ربح المنتجات', productProfit, profitComplete], ['ربح التوصيل', deliveryProfit, profitComplete],
    ['إجمالي الربح', grossProfit, profitComplete], ['المصروفات التشغيلية', expenses], ['صافي الربح', grossProfit - expenses, profitComplete],
    ['الموردون · مدفوع', supplierPaid], ['الموردون · متبقٍ', obligations - supplierPaid], ['المندوبون · مدفوع', captainPaid], ['المندوبون · متبقٍ', captainEarned - captainPaid],
  ];
  const presets = [['today','اليوم'],['yesterday','أمس'],['week','هذا الأسبوع'],['month','هذا الشهر'],['lastMonth','الشهر الماضي'],['year','هذه السنة'],['custom','فترة مخصصة']];
  return <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 space-y-6 overflow-y-auto p-4 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-5"><div><h1 className="text-3xl font-bold">الملخص المالي</h1><p className="mt-1 text-sm text-zinc-600">الربح = مبيعات المنتجات بعد الخصم − تكلفة المورد − حصة المورد + ربح التوصيل؛ صافي الربح يخصم المصروفات.</p></div><Link href="/admin/transactions" className="rounded border bg-white px-4 py-2 text-sm">دفتر الحركات</Link></header>
    <form className="grid grid-cols-2 gap-2 rounded-lg bg-white p-3 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
      <label className="grid gap-1 text-xs">الفترة<select name="preset" defaultValue={p.preset || 'custom'} className="rounded border p-2">{presets.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label className="grid gap-1 text-xs">من<input type="date" name="from" defaultValue={p.from} className="rounded border p-2"/></label><label className="grid gap-1 text-xs">إلى<input type="date" name="to" defaultValue={p.to} className="rounded border p-2"/></label>
      <label className="grid gap-1 text-xs">المورد<select name="supplierId" defaultValue={p.supplierId} className="rounded border p-2"><option value="">الكل</option>{suppliers.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs">المندوب<select name="captainId" defaultValue={p.captainId} className="rounded border p-2"><option value="">الكل</option>{captains.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs">المحافظة<select name="governorate" defaultValue={p.governorate} className="rounded border p-2"><option value="">الكل</option>{zones.map(x=><option key={x.nameAr}>{x.nameAr}</option>)}</select></label>
      <label className="grid gap-1 text-xs">الفئة<select name="categoryId" defaultValue={p.categoryId} className="rounded border p-2"><option value="">الكل</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="grid gap-1 text-xs">العلامة<select name="brandId" defaultValue={p.brandId} className="rounded border p-2"><option value="">الكل</option>{brands.map(x=><option key={x.id} value={x.id}>{x.nameAr}</option>)}</select></label>
      <label className="grid gap-1 text-xs">المنتج<select name="productId" defaultValue={p.productId} className="rounded border p-2"><option value="">الكل</option>{products.map(x=><option key={x.id} value={x.id}>{x.nameAr}</option>)}</select></label>
      <label className="grid gap-1 text-xs">الطلب<select name="orderId" defaultValue={p.orderId} className="rounded border p-2"><option value="">الكل</option>{orders.map(x=><option key={x.id} value={x.id}>{x.reference}</option>)}</select></label>
      <label className="grid gap-1 text-xs">نوع الحركة<select name="type" defaultValue={p.type} className="rounded border p-2"><option value="">الكل</option>{['SALE','SALE_REVERSAL','PRODUCT_COST','PRODUCT_COST_REVERSAL','SUPPLIER_OBLIGATION','SUPPLIER_OBLIGATION_REVERSAL','SUPPLIER_PAYMENT','DELIVERY_REVENUE','DELIVERY_REVENUE_REVERSAL','DELIVERY_COST','DELIVERY_COST_REVERSAL','CAPTAIN_EARNING','CAPTAIN_PAYMENT','DISCOUNT','DISCOUNT_REVERSAL','COUPON','COUPON_REVERSAL','REWARD_DISCOUNT','REWARD_DISCOUNT_REVERSAL','REFUND','REFUND_PRODUCT','REFUND_DELIVERY','REFUND_TAX','EXPENSE','ADJUSTMENT'].map(t=><option key={t}>{t}</option>)}</select></label>
      <div className="col-span-2 flex items-center gap-2 sm:col-span-3 lg:col-span-5"><button className="rounded bg-zinc-900 px-4 py-2 text-sm font-bold text-white">تصفية</button><Link href="/admin/financials" className="px-2 py-2 text-sm underline">مسح المرشحات</Link></div>
    </form>
    {!profitComplete&&<div className="rounded border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">بيانات الربح غير مكتملة: {unknownItems} عنصر دون تكلفة منتج، {unknownDelivery} طلب دون تكلفة ناقل، {unknownCaptainEarning} طلب توصيل دون لقطة أجر مندوب، و{posSales} مبيعات POS دون لقطات تكلفة منتج ضمن النتائج.</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([label,value,complete])=><article key={label} className="rounded-lg border bg-white p-4 shadow-sm"><h2 className="text-sm font-semibold text-zinc-500">{label}</h2><p className="mt-2 text-2xl font-bold">{complete===false?'غير مكتمل':filsToDisplay(value,'ar')}</p></article>)}</section>
    <section className="overflow-hidden rounded-lg border bg-white"><div className="border-b p-4"><h2 className="font-bold">الحركات المطابقة للمرشحات</h2><span className="text-xs text-zinc-500">تُجمع الأرقام من كل النتائج؛ الجدول يعرض أحدث 300 حركة.</span></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">التاريخ</th><th className="p-3">النوع</th><th className="p-3">الاتجاه</th><th className="p-3">المبلغ</th><th className="p-3">الطلب</th><th className="p-3">الوصف</th></tr></thead><tbody className="divide-y">{transactions.map(t=><tr key={t.id}><td className="p-3">{new Date(t.createdAt).toLocaleDateString('ar-JO')}</td><td className="p-3">{t.type}</td><td className="p-3">{t.direction}</td><td className="p-3">{filsToDisplay(t.amount)}</td><td className="p-3">{t.order?<Link className="underline" href={`/admin/orders/${t.orderId}`}>{t.order.reference}</Link>:'—'}</td><td className="p-3">{t.description}</td></tr>)}</tbody></table></div></section>
  </main></div>;
}
