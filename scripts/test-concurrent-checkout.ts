import Module from 'module';

const originalRequire = (Module as any).prototype.require;
let mockEmployeeId = 'test-emp-1';
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
  if (id.includes('lib/rate-limit') || id === '@/lib/rate-limit') {
    return {
      checkRateLimit: async () => true, // Bypass rate limit
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
      email: `test-cashier-${Date.now()}@test.com`,
      name: 'Test Cashier',
      passwordHash: 'dummy',
      roleId: role.id
    }
  });
  mockEmployeeId = employee.id;

  // 2. Create Category and Brand
  const category = await prisma.category.upsert({
    where: { slug: 'test-cat' },
    update: {},
    create: { slug: 'test-cat', name: 'Test Category' }
  });

  const sku = `TEST-PROD-${Date.now()}`;
  const product = await prisma.product.create({
    data: {
      slug: sku,
      nameAr: 'منتج تجريبي',
      nameEn: 'Test Product',
      sku: sku,
      categoryId: category.id,
      variants: {
        create: [
          {
            name: 'Standard',
            sku: `${sku}-V1`,
            stock: 1, // exactly 1 stock
            price: 15000
          }
        ]
      }
    },
    include: { variants: true }
  });

  const variant = product.variants[0];

  // 3. Simulate 5 concurrent checkouts
  console.log(`Starting 5 concurrent checkouts for variant: ${variant.id}`);
  
  const payload = {
    items: [{ variantId: variant.id, quantity: 1, sku: variant.sku }],
    customerName: 'Concurrent Tester',
    paymentMethod: 'CASH',
    amountTendered: 15000
  };

  const promises = [];
  for (let i = 0; i < 5; i++) {
    // Generate different idempotency keys for concurrent checkouts so they don't get blocked by idempotency early return
    promises.push(processPOSCheckout({ ...payload, idempotencyKey: `idemp-${Date.now()}-${i}` }));
  }

  const results = await Promise.allSettled(promises);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failCount++;
      console.error(result.status === 'rejected' ? result.reason : result.value);
    }
  }

  // 4. Verify Stock
  const finalVariant = await prisma.productVariant.findUnique({ where: { id: variant.id } });
  
  console.log(`Success Count: ${successCount} (Expected: 1)`);
  console.log(`Fail Count: ${failCount} (Expected: 4)`);
  console.log(`Final Stock: ${finalVariant?.stock} (Expected: 0)`);
  
  if (successCount === 1 && finalVariant?.stock === 0) {
    console.log('✅ Concurrent checkout test PASSED.');
  } else {
    console.error('❌ Concurrent checkout test FAILED.');
    process.exitCode = 1;
  }
  
  await prisma.$disconnect();
  process.exit();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
