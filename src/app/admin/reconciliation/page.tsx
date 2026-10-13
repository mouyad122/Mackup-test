import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';
import { AdminSidebar } from '@/components/AdminSidebar';
import { createExpense, settleCaptain, settleSupplier } from '@/actions/operations';
import { randomUUID } from 'node:crypto';
import { PrintButton } from './PrintButton';
import { ReconciliationPrintReport } from './ReconciliationPrintReport';

const labels: Record<string, string> = { CAPTAIN_EARNING: 'أجر مندوب / شركة التوصيل', CAPTAIN_PAYMENT: 'دفعة لمندوب / شركة', DELIVERY_REVENUE: 'رسوم توصيل محصلة', DELIVERY_COST: 'تكلفة توصيل', SUPPLIER_OBLIGATION: 'استحقاق مورد', SUPPLIER_OBLIGATION_REVERSAL: 'عكس استحقاق', SUPPLIER_PAYMENT: 'دفعة لمورد' };
const expenseLabels: Record<string, string> = { MARKETING: 'تسويق', PACKAGING: 'تغليف', SOFTWARE: 'برمجيات', SALARIES: 'رواتب', OPERATIONS: 'عمليات', MISC: 'متفرقات', OTHER: 'أخرى' };
const scopes = ['supplier', 'delivery', 'expenses'];
function parseDate(value?: string, end = false) { if (!value) return undefined; const date = new Date(value); if (Number.isNaN(date.getTime())) return undefined; if (end && value.length === 10) date.setHours(23, 59, 59, 999); return date; }

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requirePermission('manage:settings'); const p = await searchParams;
  const scope = scopes.includes(p.scope || '') ? p.scope! : 'supplier'; const from = parseDate(p.from); const to = parseDate(p.to, true);
  const createdAt = from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const expenseDate = from || to ? { expenseDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {};
  const [suppliers, captains, employees, transactions, expenses, orders, batches] = await Promise.all([
    prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }), prisma.captain.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }), prisma.employee.findMany({ select: { id: true, name: true } }),
    prisma.financialTransaction.findMany({ where: createdAt, include: { order: { select: { reference: true } } }, orderBy: { createdAt: 'desc' }, take: 1500 }), prisma.expense.findMany({ where: expenseDate, orderBy: { expenseDate: 'desc' }, take: 1000 }),
    prisma.order.findMany({ 
      where: { ...createdAt, status: { notIn: ['CANCELLED', 'REFUNDED', 'AWAITING_WHATSAPP'] } }, 
      select: { 
        id: true, reference: true, customerName: true, createdAt: true, shippingCost: true, actualDeliveryCost: true,
        items: { select: { supplierIdSnapshot: true, total: true, supplierAmountSnapshot: true, unitCostSnapshot: true, quantity: true, platformProductProfitSnapshot: true } },
        deliveryAssignment: { select: { captainId: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    scope === 'delivery' ? prisma.deliveryBatch.findMany({
      where: createdAt,
      include: {
        orders: {
          where: { status: { notIn: ['CANCELLED', 'REFUNDED', 'AWAITING_WHATSAPP'] } },
          select: { id: true, reference: true, customerName: true, shippingCost: true, actualDeliveryCost: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) : Promise.resolve([])
  ]);
  const employeesById = new Map(employees.map(employee => [employee.id, employee.name])); const supplierId = p.supplierId || suppliers[0]?.id || ''; const captainId = p.captainId || captains[0]?.id || '';
  const supplierRows = transactions.filter(transaction => transaction.supplierId === supplierId); const captainRows = transactions.filter(transaction => transaction.captainId === captainId);
  
  let supplierSales = 0; let supplierCost = 0; let supplierProfitShare = 0; let platformProfit = 0;
  for (const order of orders) {
    const sItems = order.items.filter((i: any) => i.supplierIdSnapshot === supplierId);
    for (const item of sItems) {
      supplierSales += item.total;
      supplierCost += (item.unitCostSnapshot || 0) * item.quantity;
      supplierProfitShare += item.supplierAmountSnapshot || 0;
      platformProfit += item.platformProductProfitSnapshot || 0;
    }
  }
  const totalProfit = supplierSales - supplierCost;
  
  const supplierBalance = balance(supplierRows, 'SUPPLIER_OBLIGATION', 'SUPPLIER_OBLIGATION_REVERSAL', 'SUPPLIER_PAYMENT'); const captainBalance = balance(captainRows, 'CAPTAIN_EARNING', 'CAPTAIN_EARNING_REVERSAL', 'CAPTAIN_PAYMENT');
  const deliveryRows = transactions.filter(transaction => ['DELIVERY_REVENUE', 'DELIVERY_REVENUE_REVERSAL', 'DELIVERY_COST', 'DELIVERY_COST_REVERSAL', 'CAPTAIN_EARNING', 'CAPTAIN_EARNING_REVERSAL'].includes(transaction.type));
  const deliveryRevenue = signedTotal(deliveryRows, 'DELIVERY_REVENUE', 'DELIVERY_REVENUE_REVERSAL'); const deliveryCost = signedTotal(deliveryRows, 'DELIVERY_COST', 'DELIVERY_COST_REVERSAL') + signedTotal(deliveryRows, 'CAPTAIN_EARNING', 'CAPTAIN_EARNING_REVERSAL'); const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Build Ledger Entries
  type LedgerEntry = { id: string; createdAt: Date; type: string; orderRef: string; customerName: string; deliveryFee: number | null; amount: number; description: string; createdBy: string; isNegative: boolean; orders?: any[]; };
  const supplierEntries: LedgerEntry[] = [];
  const captainEntries: LedgerEntry[] = [];
  const deliveryEntries: LedgerEntry[] = [];

  let calculatedDeliveryRevenue = 0;
  let calculatedDeliveryCost = 0;

  if (scope === 'delivery') {
    for (const batch of batches) {
      let batchRevenue = 0;
      let batchCost = 0;
      for (const order of batch.orders) {
        const companyCost = order.actualDeliveryCost ?? order.shippingCost;
        batchRevenue += order.shippingCost || 0;
        batchCost += companyCost;
      }
      calculatedDeliveryRevenue += batchRevenue;
      calculatedDeliveryCost += batchCost;
      const isShort = batch.reference.match(/^BATCH-\d+$/);
      const displayName = isShort ? `طلبية رقم ${batch.reference.replace('BATCH-', '')}` : batch.reference;
      deliveryEntries.push({ 
        id: batch.id, createdAt: batch.createdAt, type: 'طلبية مجمعة', orderRef: displayName, customerName: `${batch.orders.length} طلبات`, 
        deliveryFee: batchRevenue, amount: batchCost, description: `إجمالي المحصل: ${filsToDisplay(batchRevenue)} | المستحق للشركة: ${filsToDisplay(batchCost)}`, 
        createdBy: 'النظام', isNegative: false, orders: batch.orders
      });
    }
  }

  for (const order of orders) {
    // Supplier Scope
    if (supplierId && scope === 'supplier') {
      const sItems = order.items.filter((i: any) => i.supplierIdSnapshot === supplierId);
      if (sItems.length > 0) {
        const sales = sItems.reduce((sum: number, item: any) => sum + item.total, 0);
        const cost = sItems.reduce((sum: number, item: any) => sum + (item.unitCostSnapshot || 0) * item.quantity, 0);
        const profit = sales - cost;
        const obligation = sItems.reduce((sum: number, item: any) => sum + (item.supplierAmountSnapshot || 0) + ((item.unitCostSnapshot || 0) * item.quantity), 0);
        const supplierShare = obligation - cost;
        if (obligation > 0) supplierEntries.push({ id: order.id, createdAt: order.createdAt, type: 'طلب مبيعات', orderRef: order.reference, customerName: order.customerName, deliveryFee: order.shippingCost, amount: obligation, description: `المبيعات: ${filsToDisplay(sales)} | التكلفة: ${filsToDisplay(cost)} | الربح: ${filsToDisplay(profit)} | ربح المورد: ${filsToDisplay(supplierShare)}`, createdBy: 'النظام', isNegative: false });
      }
    }
    // Captain Scope (legacy)
    if (captainId && order.deliveryAssignment?.captainId === captainId && order.actualDeliveryCost) {
      captainEntries.push({ id: order.id, createdAt: order.createdAt, type: 'توصيل طلب', orderRef: order.reference, customerName: order.customerName, deliveryFee: order.actualDeliveryCost, amount: order.actualDeliveryCost, description: `أجر توصيل طلب للزبون`, createdBy: 'النظام', isNegative: false });
    }
  }

  const captainPayments = signedTotal(captainRows, 'CAPTAIN_PAYMENT', 'NOTHING');
  const actualCaptainBalance = calculatedDeliveryCost - captainPayments;

  // Add Settlements / Reversals
  const addTx = (list: LedgerEntry[], tx: any, isNegative: boolean = true) => {
    list.push({ id: tx.id, createdAt: tx.createdAt, type: labels[tx.type] || tx.type, orderRef: tx.order?.reference || '—', customerName: '—', deliveryFee: null, amount: tx.amount, description: tx.description, createdBy: tx.createdByEmployeeId ? employeesById.get(tx.createdByEmployeeId) || '—' : 'النظام', isNegative });
  };
  transactions.filter(t => t.supplierId === supplierId && ['SUPPLIER_PAYMENT', 'SUPPLIER_OBLIGATION_REVERSAL'].includes(t.type)).forEach(t => addTx(supplierEntries, t));
  transactions.filter(t => t.captainId === captainId && ['CAPTAIN_PAYMENT', 'CAPTAIN_EARNING_REVERSAL'].includes(t.type)).forEach(t => addTx(captainEntries, t));
  transactions.filter(t => ['CAPTAIN_PAYMENT', 'CAPTAIN_EARNING_REVERSAL', 'DELIVERY_COST_REVERSAL', 'DELIVERY_REVENUE_REVERSAL'].includes(t.type)).forEach(t => addTx(deliveryEntries, t));

  supplierEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  captainEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  deliveryEntries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const scopeTitles: Record<string, string> = { supplier: 'جرد المورد', delivery: 'جرد التوصيل العام', expenses: 'جرد المصروفات' };
  const subject = scope === 'supplier' ? suppliers.find(row => row.id === supplierId)?.name || 'كل الموردين' : scope === 'delivery' ? 'عمليات التوصيل' : 'المصروفات';
  const period = `${formatFilter(p.from, 'البداية غير محددة')} — ${formatFilter(p.to, 'النهاية غير محددة')}`;
  const generatedAt = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(new Date());
  const supplierPayments = signedTotal(supplierRows, 'SUPPLIER_PAYMENT', 'NOTHING');
  const summaries = scope === 'supplier'
    ? [
        { label: 'إجمالي البيع', value: filsToDisplay(supplierSales) },
        { label: 'إجمالي التكلفة', value: filsToDisplay(supplierCost) },
        { label: 'إجمالي الربح', value: filsToDisplay(totalProfit) },
        { label: 'حصة المنصة', value: filsToDisplay(platformProfit) },
        { label: 'حصة المورد', value: filsToDisplay(supplierProfitShare) },
        { label: 'إجمالي الدفعات/التسويات', value: filsToDisplay(supplierPayments) },
        { label: 'الرصيد المتبقي المستحق', value: filsToDisplay(supplierBalance) }
      ]
    : scope === 'delivery'
        ? [{ label: 'الرصيد المستحق للشركة المحددة', value: filsToDisplay(actualCaptainBalance) }, { label: 'رسوم التوصيل المحصلة', value: filsToDisplay(calculatedDeliveryRevenue) }, { label: 'تكاليف وأجور التوصيل', value: filsToDisplay(calculatedDeliveryCost) }]
        : [{ label: 'إجمالي المصروفات بالفترة', value: filsToDisplay(expensesTotal) }];
  const printColumns = scope === 'expenses'
    ? ['التاريخ والوقت', 'نوع المصروف', 'الوصف', 'المرجع / الملاحظة', 'المبلغ', 'سجله']
    : ['التاريخ والوقت', 'نوع العملية', 'الطلب', 'العميل', 'المبلغ المستحق', 'ملاحظات'];
  const printRows = scope === 'expenses'
    ? expenses.map(expense => [formatDate(expense.expenseDate), expenseLabels[expense.category] || expense.category, expense.description, expense.reference || '—', filsToDisplay(expense.amount), expense.createdByEmployeeId ? employeesById.get(expense.createdByEmployeeId) || '—' : 'النظام'])
    : (scope === 'supplier' ? supplierEntries : deliveryEntries).map(row => [formatDate(row.createdAt), row.type, row.orderRef, row.customerName, (row.isNegative ? '-' : '') + filsToDisplay(row.amount), row.description]);
  return <><div className="reconciliation-screen flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl"><AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name}/><main className="w-full flex-1 space-y-6 p-4 md:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">الجرد والتسويات</h1><p className="mt-1 text-sm text-zinc-600">اختر نوع الجرد والفترة؛ كل قسم يعرض عملياته فقط.</p></div><PrintButton /></div>
    <form className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-5"><label className="grid gap-1 text-sm">نوع الجرد<select name="scope" defaultValue={scope} className="rounded border p-2"><option value="supplier">الموردون</option><option value="delivery">التوصيل العام</option><option value="expenses">المصروفات</option></select></label><label className="grid gap-1 text-sm">من التاريخ والساعة<input name="from" type="datetime-local" defaultValue={p.from} className="rounded border p-2"/></label><label className="grid gap-1 text-sm">إلى التاريخ والساعة<input name="to" type="datetime-local" defaultValue={p.to} className="rounded border p-2"/></label>{scope === 'supplier' && <Select label="المورد" name="supplierId" value={supplierId} rows={suppliers}/>} {scope === 'delivery' && <Select label="المندوب / الشركة (للتسديد)" name="captainId" value={captainId} rows={captains}/>}<div className="flex items-end"><button className="w-full rounded bg-zinc-900 p-2 font-bold text-white">تجديد الجرد</button></div></form>
    {scope === 'supplier' && <section className="space-y-5">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Metric label="إجمالي البيع" value={supplierSales}/>
        <Metric label="إجمالي التكلفة" value={supplierCost}/>
        <Metric label="إجمالي الربح" value={totalProfit}/>
        <Metric label="حصة المنصة" value={platformProfit}/>
        <Metric label="حصة المورد (ربح)" value={supplierProfitShare}/>
        <Metric label="إجمالي الدفعات/التسويات" value={supplierPayments}/>
        <Metric label="الرصيد المتبقي المستحق" value={supplierBalance}/>
      </div>
      {supplierId && <Settlement title="تسجيل تسوية أو دفعة للمورد" id={supplierId} fn={settleSupplier}/>}
      <Ledger rows={supplierEntries} />
    </section>}
    {scope === 'delivery' && <section className="space-y-5"><div className="grid gap-3 md:grid-cols-3"><Metric label="رسوم التوصيل المحصلة" value={calculatedDeliveryRevenue}/><Metric label="تكاليف وأجور التوصيل" value={calculatedDeliveryCost}/><Metric label="الرصيد المستحق للشركة المحددة" value={actualCaptainBalance}/></div>{captainId && <Settlement title="تسجيل دفعة لشركة التوصيل المحددة" id={captainId} fn={settleCaptain}/>}<Ledger rows={deliveryEntries} /></section>}
    {scope === 'expenses' && <section className="space-y-5"><Metric label="إجمالي المصروفات بالفترة" value={expensesTotal}/><form action={createExpense} className="grid gap-3 rounded border bg-white p-4 md:grid-cols-3"><select name="category" className="rounded border p-2">{Object.entries(expenseLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input name="amount" type="number" min="0.001" step="0.001" required placeholder="المبلغ د.أ" className="rounded border p-2"/><input name="expenseDate" type="datetime-local" className="rounded border p-2"/><input name="description" required minLength={2} placeholder="وصف المصروف" className="rounded border p-2"/><input name="reference" placeholder="مرجع أو ملاحظة" className="rounded border p-2"/><button className="rounded bg-zinc-900 p-2 font-bold text-white">تسجيل المصروف</button></form><div className="overflow-x-auto rounded border bg-white"><table className="w-full min-w-[700px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">التاريخ</th><th>النوع</th><th>الوصف والملاحظة</th><th>المبلغ</th><th>أدخله</th></tr></thead><tbody className="divide-y">{expenses.map(expense => <tr key={expense.id}><td className="p-3">{expense.expenseDate.toLocaleString('en-GB')}</td><td>{expenseLabels[expense.category] || expense.category}</td><td>{expense.description}{expense.reference ? ` · ${expense.reference}` : ''}</td><td>{filsToDisplay(expense.amount)}</td><td>{expense.createdByEmployeeId ? employeesById.get(expense.createdByEmployeeId) || '—' : 'النظام'}</td></tr>)}</tbody></table></div></section>}
  </main></div><ReconciliationPrintReport title={scopeTitles[scope]} subject={subject} period={period} generatedAt={generatedAt} summaries={summaries} columns={printColumns} rows={printRows}/></>;
}
function formatFilter(value: string | undefined, fallback: string) { if (!value) return fallback; const [date, time] = value.split('T'); const [year, month, day] = date.split('-'); return `${day}/${month}/${year}${time ? ` · ${time}` : ''}`; }
function formatDate(value: Date) { return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(value); }
function signedTotal(rows: { type: string; amount: number }[], positive: string, reverse: string) { return rows.reduce((sum, row) => sum + (row.type === positive ? row.amount : row.type === reverse ? -row.amount : 0), 0); }
function balance(rows: { type: string; amount: number }[], earned: string, reversed: string, paid: string) { return rows.reduce((sum, row) => sum + (row.type === earned ? row.amount : row.type === reversed || row.type === paid ? -row.amount : 0), 0); }
function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-lg border bg-white p-5"><p className="text-sm text-zinc-500">{label}</p><p className="mt-2 text-2xl font-bold">{filsToDisplay(value)}</p></article>; }
function Select({ label, name, value, rows }: { label: string; name: string; value: string; rows: { id: string; name: string }[] }) { return <label className="grid gap-1 text-sm">{label}<select name={name} defaultValue={value} className="rounded border p-2">{rows.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>; }
function Settlement({ title, id, fn }: { title: string; id: string; fn: (id: string, formData: FormData) => Promise<void> }) { return <form action={async formData => { 'use server'; await fn(id, formData); }} className="grid gap-3 rounded border bg-white p-4 md:grid-cols-5"><input type="hidden" name="idempotencyKey" value={randomUUID()}/><h2 className="font-bold md:col-span-5">{title}</h2><input name="amount" type="number" min="0.001" step="0.001" required placeholder="المبلغ د.أ" className="rounded border p-2"/><select name="paymentMethod" className="rounded border p-2"><option value="CASH">نقدي</option><option value="BANK_TRANSFER">حوالة / كليك</option><option value="CARD">بطاقة</option><option value="OTHER">أخرى</option></select><input name="reference" placeholder="مرجع" className="rounded border p-2"/><input name="notes" placeholder="ملاحظات" className="rounded border p-2"/><button className="rounded bg-zinc-900 p-2 font-bold text-white">حفظ التسوية</button></form>; }
function Ledger({ rows }: { rows: any[] }) { 
  return <div className="overflow-x-auto rounded border bg-white"><table className="w-full min-w-[750px] text-right text-sm"><thead className="bg-zinc-50"><tr><th className="p-3">التاريخ</th><th>العملية</th><th>المرجع</th><th>العميل</th><th>المبلغ المستحق</th><th>التفاصيل</th></tr></thead><tbody className="divide-y">{rows.map(row => <LedgerRow key={row.id} row={row} />)}{rows.length === 0 && <tr><td colSpan={6} className="p-4 text-zinc-500">لا توجد عمليات ضمن الفترة.</td></tr>}</tbody></table></div>; 
}

function LedgerRow({ row }: { row: any }) {
  return (
    <>
      <tr className={row.isNegative ? "bg-red-50 text-red-900" : ""}>
        <td className="p-3">{row.createdAt.toLocaleString('en-GB')}</td>
        <td className="font-bold">{row.type}</td>
        <td className="font-mono text-xs">{row.orderRef}</td>
        <td>{row.customerName}</td>
        <td className="font-bold font-mono" dir="ltr">{row.isNegative ? '-' : ''}{filsToDisplay(row.amount)}</td>
        <td className="text-zinc-600 text-xs">
          {row.description} 
          {row.deliveryFee !== null && <span className="mr-2 inline-block bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200 text-[10px]">توصيل: {filsToDisplay(row.deliveryFee)}</span>}
        </td>
      </tr>
      {row.orders && row.orders.length > 0 && (
        <tr>
          <td colSpan={6} className="bg-zinc-50 p-4 border-b">
            <details className="text-sm">
              <summary className="cursor-pointer font-bold text-zinc-700">عرض تفاصيل الطلبات ({row.orders.length})</summary>
              <div className="mt-2 grid gap-2">
                {row.orders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center bg-white p-2 border rounded">
                    <div>
                      <span className="font-bold">{o.reference}</span> · {o.customerName}
                    </div>
                    <div className="text-xs text-zinc-600">
                      تكلفة التوصيل: {filsToDisplay(o.actualDeliveryCost ?? o.shippingCost)} (محصل: {filsToDisplay(o.shippingCost)})
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </td>
        </tr>
      )}
    </>
  );
}
