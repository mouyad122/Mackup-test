import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('--- Phase 6 Financials Test ---');

  // 1. Cash Drawer Reconciliation
  const cashPayments = await prisma.payment.findMany({
    where: { method: 'CASH' }
  });
  const totalCash = cashPayments.reduce((sum, p) => sum + p.amount, 0);
  console.log(`\n[Cash Drawer Reconciliation] Total Cash: ${totalCash}`);

  // 2. Supplier Financial Reconciliation
  const suppliers = await prisma.supplier.findMany({
    include: {
      invoices: true,
      settlements: true,
      purchaseOrders: true
    }
  });

  console.log('\n[Supplier Financial Reconciliation]');
  for (const supplier of suppliers) {
    const totalInvoices = supplier.invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPurchaseOrders = supplier.purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0);
    
    const totalSettlements = supplier.settlements.reduce((sum, s) => sum + s.amount, 0);
    
    const calculatedBalanceInvoice = totalInvoices - totalSettlements;
    const calculatedBalancePO = totalPurchaseOrders - totalSettlements;
    
    console.log(`Supplier: ${supplier.name} (${supplier.id})`);
    console.log(`  Total Invoices: ${totalInvoices}`);
    console.log(`  Total Purchase Orders: ${totalPurchaseOrders}`);
    console.log(`  Total Settlements: ${totalSettlements}`);
    console.log(`  Calculated Balance (Invoices - Settlements): ${calculatedBalanceInvoice}`);
    console.log(`  Calculated Balance (PO - Settlements): ${calculatedBalancePO}`);
    
    if ('balance' in supplier) {
      console.log(`  Actual Supplier.balance: ${(supplier as any).balance}`);
      if ((supplier as any).balance !== calculatedBalanceInvoice) {
         console.log('  -> MISMATCH with Invoices balance!');
      } else {
         console.log('  -> MATCH with Invoices balance!');
      }
    }
  }

  console.log('\nDone.');
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
