import Module from 'module';

const originalRequire = (Module as any).prototype.require;
let mockEmployeeId = 'test-emp-2';
(Module as any).prototype.require = function (this: any, id: string, ...args: any[]) {
  if (id === 'next/headers') {
    return {
      headers: async () => new Map([['x-forwarded-for', '127.0.0.1']]),
      cookies: async () => ({ get: () => undefined }),
    };
  }
  if (id.includes('lib/dal') || id === '@/lib/dal') {
    return {
      requirePermission: async () => ({ employeeId: mockEmployeeId }),
    };
  }
  return originalRequire.apply(this, [id, ...args]);
};

import 'dotenv/config';
import { prisma } from '../src/lib/db';

async function run() {
  const { processPOSCheckout } = await import('../src/actions/pos');
  
  // 1. Create a dummy employee to act as cashier
  const role = await prisma.role.upsert({
    where: { name: 'Cashier' },
    update: {},
    create: { name: 'Cashier', description: 'POS Cashier' }
  });
  const employee = await prisma.employee.create({
    data: {
      email: `test-cashier-2-${Date.now()}@test.com`,
      name: 'Test Cashier 2',
      passwordHash: 'dummy',
      roleId: role.id
    }
  });
  mockEmployeeId = employee.id;

  // 2. Create Category and Product
  const category = await prisma.category.upsert({
    where: { slug: 'test-cat' },
    update: {},
    create: { slug: 'test-cat', name: 'Test Category' }
  });

  const sku = `TEST-DBL-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      slug: sku,
      nameAr: 'منتج الدفع المزدوج',
      nameEn: 'Double Submission Product',
      sku: sku,
      categoryId: category.id,
      variants: {
        create: [
          {
            name: 'Standard',
            sku: `${sku}-V1`,
            stock: 100, // plenty of stock
            price: 5000
          }
        ]
      }
    },
    include: { variants: true }
  });

  const variant = product.variants[0];

  // 3. Simulate double submission (exact same payload & idempotency key)
  console.log(`Starting double-submission checkout for variant: ${variant.id}`);
  
  const idempotencyKey = `idem-double-${Date.now()}`;
  
  const payload = {
    items: [{ variantId: variant.id, quantity: 1, sku: variant.sku }],
    customerName: 'Double Sub Tester',
    paymentMethod: 'CASH',
    amountTendered: 5000,
    idempotencyKey: idempotencyKey
  };

  // Dispatch 3 concurrent requests to simulate a frantic multi-click
  const promises = [];
  for (let i = 0; i < 3; i++) {
    promises.push(processPOSCheckout(payload));
  }

  const results = await Promise.allSettled(promises);
  
  let successCount = 0;
  let saleIds = new Set<string>();
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
      if (result.value.saleId) saleIds.add(result.value.saleId);
    } else if (result.status === 'fulfilled' && !result.value.success) {
      console.log('Checkout failed as expected for duplicates:', result.value.error);
    } else if (result.status === 'rejected') {
      console.log('Checkout rejected:', result.reason);
    }
  }

  // 4. Verify exactly 1 Sale was created
  console.log(`Successful return objects: ${successCount}`);
  console.log(`Unique Sale IDs created: ${saleIds.size} (Expected: 1)`);
  
  if (saleIds.size === 1) {
    console.log('✅ Double submission test PASSED.');
  } else {
    console.error('❌ Double submission test FAILED.');
    process.exitCode = 1;
  }
  
  await prisma.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exitCode = 1;
});
