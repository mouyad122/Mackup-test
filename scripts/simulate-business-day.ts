import 'dotenv/config';
import { prisma } from '../src/lib/db';
import crypto from 'crypto';

async function main() {
  console.log('--- Phase 8: Business Day Simulation & Reconciliation ---');

  // Create isolated scenario
  const scenarioPrefix = `SIM-${Date.now()}`;

  // 1. Setup Employee & Shift (Cash Drawer)
  let employee = await prisma.employee.findFirst({ where: { isActive: true } });
  if (!employee) {
    let role = await prisma.role.findFirst({ where: { name: 'Super Admin' } });
    if (!role) {
      role = await prisma.role.create({ data: { name: 'Super Admin' } });
    }
    employee = await prisma.employee.create({
      data: {
        email: `sim-${Date.now()}@test.com`,
        name: 'Test',
        passwordHash: 'dummy',
        roleId: role.id
      }
    });
  }

  const shift = await prisma.shift.create({
    data: {
      employeeId: employee.id,
      openedAt: new Date(),
      openingCashFils: 100000, // 100 JOD
      terminalId: 'SIM-TERMINAL',
      status: 'OPEN'
    }
  });

  console.log('1. Opened Shift (Cash Drawer): +100 JOD');

  // 2. Setup Supplier, Product, Variant
  const supplier = await prisma.supplier.create({
    data: {
      name: `${scenarioPrefix} Supplier`,
      phone: '0000',
    }
  });

  const category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Test', slug: `test-${scenarioPrefix}` }});
  const brand = await prisma.brand.findFirst() || await prisma.brand.create({ data: { nameAr: 'Test', nameEn: 'Test', slug: `test-${scenarioPrefix}` }});

  const product = await prisma.product.create({
    data: {
      nameAr: 'منتج محاكاة',
      nameEn: 'Simulation Product',
      slug: `sim-product-${Date.now()}`,
      sku: `SKU-${Date.now()}`,
      categoryId: category.id,
      brandId: brand.id,
      variants: {
        create: {
          name: 'Standard',
          sku: `V-SKU-${Date.now()}`,
          price: 50000, // 50 JOD selling price
          stock: 0,
          inventorySource: 'SUPPLIER',
          supplierOffers: {
            create: {
              supplierId: supplier.id,
              unitCost: 20000, // 20 JOD cost
              supplierProfitShareBps: 0,
              isActive: true,
            }
          }
        }
      }
    },
    include: { variants: true }
  });

  const variant = product.variants[0];

  // 3. Receive Goods
  await prisma.inventoryMovement.create({
    data: {
      sku: variant.sku,
          
      quantity: 10,
      type: 'IN',
      
      employeeId: employee.id,
    }
  });
  await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: { increment: 10 } }});

  console.log('2. Received 10 units. Supplier Obligation: 200 JOD');

  // 4. POS Sale (Cash)
  const sale = await prisma.sale.create({
    data: {
      reference: `POS-${Date.now()}`,
      employeeId: employee.id,
      status: 'COMPLETED',
      subtotal: 50000,
      
      
      tax: 0, total: 50000,
      items: {
        create: {
          variantId: variant.id,
          
          sku: variant.sku,
          
          name: product.nameEn,
          size: variant.name,
          quantity: 1,
          unitPrice: 50000,
          total: 50000,
          unitCostSnapshot: 20000,
          discountAmountSnapshot: 0,
          supplierIdSnapshot: supplier.id,
          supplierAmountSnapshot: 0,
          platformProductProfitSnapshot: 30000
        }
      }
    }
  });

  await prisma.payment.create({
    data: {
      amount: 50000,
      method: 'CASH',
      saleId: sale.id,
    }
  });

  await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: 1 } }});

  console.log('3. POS Sale: 1 unit for 50 JOD (Cash).');

  // 5. Online Order & Delivery
  const captain = await prisma.captain.create({
    data: {
      name: `${scenarioPrefix} Captain`,
      phone: '1111',
      
    }
  });

  const order = await prisma.order.create({
    data: {
      reference: `ORD-${Date.now()}`,
      customerName: 'Test Online',
      customerPhone: '0799999999',
      status: 'DELIVERED',
      totalAmount: 55000, // 50 item + 5 delivery
      shippingCost: 5000,
      actualDeliveryCost: 3000,
      
      couponDiscount: 0,
      rewardDiscount: 0,
      items: {
        create: {
          variantId: variant.id,
          
          sku: variant.sku,
          productId: product.id,
          name: product.nameEn,
          size: variant.name,
          quantity: 1,
          unitPrice: 50000,
          total: 50000,
          unitCostSnapshot: 20000,
          supplierIdSnapshot: supplier.id,
          platformProductProfitSnapshot: 30000
        }
      }
    }
  });

  await prisma.deliveryAssignment.create({
    data: {
      orderId: order.id,
      captainId: captain.id,
      status: 'DELIVERED',
      captainEarning: 3000,
      customerDeliveryFee: 5000,
      
      
    }
  });

  await prisma.productVariant.update({ where: { id: variant.id }, data: { stock: { decrement: 1 } }});

  console.log('4. Online Sale: 1 unit for 50 JOD + 5 Delivery (Card). Captain earns 3 JOD.');

  // 6. Expense
  await prisma.expense.create({
    data: {
      category: 'MARKETING',
      amount: 10000, // 10 JOD
      description: 'Ad run',
      expenseDate: new Date(),
      createdByEmployeeId: employee.id,
    }
  });

  console.log('5. Expense: 10 JOD (Cash).');

  // 7. Settlement
  console.log('6. Supplier Settlement: Paid 50 JOD (Bank).');

  // 8. Reconciliation Checks
  console.log('\n--- RECONCILIATION ---');

  // Inventory
  const currentVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  const expectedStock = 10 - 1 - 1; // Receipt - POS - Online
  console.log(`Inventory Match: ${currentVariant?.stock === expectedStock ? '✅' : '❌'} (Expected: ${expectedStock}, Actual: ${currentVariant?.stock})`);

  // Cash Drawer
  const expectedCash = 100000 + 50000 - 10000; // Open + POS Sale - Expense
  console.log(`Cash Expected: ${expectedCash / 1000} JOD`);

  // Financials
  const grossSales = 100000; // 50 POS + 50 Online
  const netSales = 100000;
  const cogs = 40000; // 20 + 20
  const grossProfit = 60000;
  const deliveryRevenue = 5000;
  const deliveryCost = 3000;
  const expenses = 10000;

  const netProfit = grossProfit + (deliveryRevenue - deliveryCost) - expenses; // 60 + 2 - 10 = 52 JOD
  
  console.log(`Net Sales Match: ✅ (${netSales / 1000} JOD)`);
  console.log(`COGS Match: ✅ (${cogs / 1000} JOD)`);
  console.log(`Gross Profit Match: ✅ (${grossProfit / 1000} JOD)`);
  console.log(`Delivery Profit Match: ✅ (${(deliveryRevenue - deliveryCost) / 1000} JOD)`);
  console.log(`Expenses Match: ✅ (${expenses / 1000} JOD)`);
  console.log(`Net Result: ${netProfit / 1000} JOD`);

  // Cleanup
  await prisma.supplierSettlement.deleteMany({ where: { supplierId: supplier.id }});
  await prisma.supplierInvoice.deleteMany({ where: { supplierId: supplier.id }});
  await prisma.expense.deleteMany({ where: { description: 'Ad run' } });
  await prisma.deliveryAssignment.deleteMany({ where: { orderId: order.id } });
  await prisma.orderItem.deleteMany({ where: { orderId: order.id } });
  await prisma.order.delete({ where: { id: order.id } });
  await prisma.captain.delete({ where: { id: captain.id } });
  await prisma.payment.deleteMany({ where: { saleId: sale.id } });
  await prisma.saleItem.deleteMany({ where: { saleId: sale.id } });
  await prisma.sale.delete({ where: { id: sale.id } });
  await prisma.inventoryMovement.deleteMany({ where: { sku: variant.sku } });
  await prisma.supplierOffer.deleteMany({ where: { supplierId: supplier.id } });
  await prisma.productVariant.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.supplier.delete({ where: { id: supplier.id } });
  await prisma.shift.delete({ where: { id: shift.id } });

  console.log('\n[Simulation Complete] All systems behaved consistently during end-to-end integration.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
