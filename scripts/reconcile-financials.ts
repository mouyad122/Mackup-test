import { prisma } from '../src/lib/db';

async function main() {
  // 1. Gross Sales & 2. Total Discounts & 4. Total COGS
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED' },
    include: { items: true },
  });

  let grossSales = 0;
  let totalDiscounts = 0;
  let totalCOGS = 0;

  for (const sale of sales) {
    totalDiscounts += sale.discount;
    for (const item of sale.items) {
      grossSales += item.quantity * item.unitPrice;
      totalCOGS += item.quantity * (item.unitCostSnapshot ?? 0);
    }
  }

  // 3. Net Sales
  const netSales = grossSales - totalDiscounts;

  // 5. Gross Profit
  const grossProfit = netSales - totalCOGS;

  // 6. Payments and Refunds
  // The schema requires saleId on Payment, but we'll check it anyway per instructions.
  const allPayments = await prisma.payment.findMany();
  
  let totalPayments = 0;
  let orphanPayments = 0;

  // Fetch all existing sale IDs to verify orphans
  const allSaleRecords = await prisma.sale.findMany({ select: { id: true } });
  const validSaleIds = new Set(allSaleRecords.map(s => s.id));

  for (const payment of allPayments) {
    // Check if saleId is technically missing or referencing a non-existent sale
    if (!payment.saleId || !validSaleIds.has(payment.saleId)) {
      orphanPayments++;
    } else {
      totalPayments += payment.amount;
    }
  }

  const returns = await prisma.return.findMany();
  let totalRefunds = 0;
  for (const ret of returns) {
    totalRefunds += ret.totalAmount;
  }

  console.log('--- Financial Reconciliation Report ---');
  console.log(`Gross Sales:    ${grossSales}`);
  console.log(`Total Discounts:${totalDiscounts}`);
  console.log(`Net Sales:      ${netSales}`);
  console.log(`Total COGS:     ${totalCOGS}`);
  console.log(`Gross Profit:   ${grossProfit}`);
  console.log(`Total Payments: ${totalPayments}`);
  console.log(`Total Refunds:  ${totalRefunds}`);
  console.log(`Orphan Payments:${orphanPayments}`);
  console.log('---------------------------------------');

  let hasDiscrepancy = false;

  // 7. Verify Net Sales == (Payments - Refunds)
  if (netSales !== (totalPayments - totalRefunds)) {
    console.error(`Discrepancy found: Net Sales (${netSales}) != Payments (${totalPayments}) - Refunds (${totalRefunds})`);
    hasDiscrepancy = true;
  }

  // 8. Check for orphan payments
  if (orphanPayments > 0) {
    console.error(`Discrepancy found: There are ${orphanPayments} orphan payments.`);
    hasDiscrepancy = true;
  }

  if (!hasDiscrepancy) {
    console.log('✅ Financial Reconciliation PASSED');
  } else {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
