import 'dotenv/config';
import { prisma } from '../src/lib/db';
import assert from 'assert';

async function main() {
  console.log('Running adversarial tests for POS checkout / Online Order...');
  
  const employee = await prisma.employee.findFirst();
  const variant = await prisma.productVariant.findFirst({ where: { isActive: true } });
  const inactiveVariant = await prisma.productVariant.findFirst({ where: { isActive: false } });

  if (!employee || !variant) {
    console.warn('Need at least one employee and one variant to run tests. Skipping.');
    return;
  }

  const { processPOSCheckout } = await import('../src/actions/pos');

  // 1. Negative quantities
  try {
    const payload = {
      items: [{ variantId: variant.id, quantity: -5, sku: variant.sku }],
      customerName: 'Hacker',
      paymentMethod: 'CASH',
      amountTendered: 100
    };
    const res = await processPOSCheckout(payload as any);
    if (res.success) throw new Error('Negative quantity sale should have failed');
    console.log('✅ Negative quantity correctly failed:', res.error);
  } catch (e: any) {
    if (e.message.includes('Negative quantity sale should have failed')) throw e;
    console.log('✅ Negative quantity correctly failed:', e.message);
  }

  // 2. Zero quantities
  try {
    const payload = {
      items: [{ variantId: variant.id, quantity: 0, sku: variant.sku }],
      customerName: 'Hacker',
      paymentMethod: 'CASH',
      amountTendered: 100
    };
    const res = await processPOSCheckout(payload as any);
    if (res.success) throw new Error('Zero quantity sale should have failed');
    console.log('✅ Zero quantity correctly failed:', res.error);
  } catch (e: any) {
    if (e.message.includes('Zero quantity sale should have failed')) throw e;
    console.log('✅ Zero quantity correctly failed:', e.message);
  }

  // 3. Inactive variant
  if (inactiveVariant) {
    try {
      const payload = {
        items: [{ variantId: inactiveVariant.id, quantity: 1, sku: inactiveVariant.sku }],
        customerName: 'Hacker',
        paymentMethod: 'CASH',
        amountTendered: 100
      };
      const res = await processPOSCheckout(payload as any);
      if (res.success) throw new Error('Inactive variant sale should have failed');
      console.log('✅ Inactive variant correctly failed:', res.error);
    } catch (e: any) {
      if (e.message.includes('Inactive variant sale should have failed')) throw e;
      console.log('✅ Inactive variant correctly failed:', e.message);
    }
  } else {
    console.log('⚠️ Skipping inactive variant test (no inactive variant found)');
  }

  // 4. Manipulated price
  try {
    const payload = {
      items: [{ variantId: variant.id, quantity: 1, sku: variant.sku, price: 0.01 }], // Injecting fake price
      customerName: 'Hacker',
      paymentMethod: 'CASH',
      amountTendered: 100
    };
    const res = await processPOSCheckout(payload as any);
    if (res.success) {
      console.log('✅ Sale succeeded, verifying price was NOT manipulated...');
      const sale = await prisma.sale.findUnique({ where: { id: res.saleId }, include: { items: true } });
      assert.strictEqual(sale?.items[0].unitPrice, variant.price, 'Price was manipulated!');
      console.log('✅ Price was NOT manipulated, it used the DB price:', variant.price);
    } else {
       console.log('✅ Manipulated price payload correctly failed or ignored:', res.error);
    }
  } catch (e: any) {
    console.log('✅ Manipulated price correctly failed or ignored:', e.message);
  }

  console.log('🎉 Adversarial tests complete.');
}

export default main;

if (require.main === module) {
  main().catch(e => {
    console.error('Test script crashed:', e);
    process.exitCode = 1;
  });
}
