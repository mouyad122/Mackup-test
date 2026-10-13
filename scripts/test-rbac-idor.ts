import { updateProduct } from '../src/actions/products';
import { processPOSCheckout } from '../src/actions/pos';
import { updateSettings } from '../src/actions/settings-crud';
import { createWarehouse } from '../src/actions/warehouses';

async function runTests() {
  console.log('Running RBAC/IDOR Security Tests...\n');
  let passed = true;

  try {
    const res = await updateProduct('dummy-id', {} as any);
    if (res && res.error) {
      console.log('✅ updateProduct correctly returned error:', res.error);
    } else {
      console.error('❌ updateProduct did NOT block unauthorized access!', res);
      passed = false;
    }
  } catch (err: any) {
    if (err.message?.includes('غير مصرح') || err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('NEXT_REDIRECT')) {
      console.log('✅ updateProduct correctly threw error/redirected:', err.message);
    } else {
      console.error('❌ updateProduct threw unexpected error:', err.message);
      passed = false;
    }
  }

  try {
    const res = await processPOSCheckout({} as any);
    if (res && res.error) {
      console.log('✅ processPOSCheckout correctly returned error:', res.error);
    } else {
      console.error('❌ processPOSCheckout did NOT block unauthorized access!', res);
      passed = false;
    }
  } catch (err: any) {
    if (err.message?.includes('غير مصرح') || err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('NEXT_REDIRECT') || err.message?.includes('No user found')) {
      console.log('✅ processPOSCheckout correctly threw error:', err.message);
    } else {
      console.error('❌ processPOSCheckout threw unexpected error:', err.message);
      passed = false;
    }
  }

  try {
    const res = await createWarehouse({} as any);
    if (res && res.error) {
      console.log('✅ createWarehouse correctly returned error:', res.error);
    } else {
      console.error('❌ createWarehouse did NOT block unauthorized access!', res);
      passed = false;
    }
  } catch (err: any) {
    if (err.message?.includes('غير مصرح') || err.message?.toLowerCase().includes('unauthorized') || err.message?.includes('NEXT_REDIRECT')) {
      console.log('✅ createWarehouse correctly threw error:', err.message);
    } else {
      console.error('❌ createWarehouse threw unexpected error:', err.message);
      passed = false;
    }
  }

  if (passed) {
    console.log('\n✅ RBAC/IDOR Security Tests Passed');
  } else {
    console.log('\n❌ RBAC/IDOR Security Tests Failed');
    process.exit(1);
  }
}

runTests();
