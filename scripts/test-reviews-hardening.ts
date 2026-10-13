import { submitReview } from '../src/actions/reviews';
import { prisma } from '../src/lib/db';

async function main() {
  console.log('Testing Review System Hardening...');

  // 1. Setup a test product
  const category = await prisma.category.create({
    data: { name: 'Test Category', slug: 'test-category-' + Date.now() }
  });

  const product = await prisma.product.create({
    data: {
      nameAr: 'منتج اختبار',
      nameEn: 'Test Product',
      slug: 'test-product-' + Date.now(),
      sku: 'SKU-' + Date.now(),
      categoryId: category.id,
    }
  });

  const testPhone = '+962770000001';
  const testName = 'Test User';

  // 2. Test initial valid submission
  console.log('\\n[TEST] 1. Initial valid submission');
  try {
    await submitReview(product.id, 5, 'Great product!', testPhone, testName);
    console.log('✅ Passed: Initial review submitted successfully.');
  } catch (e: any) {
    console.error('❌ Failed:', e.message);
  }

  // 3. Test duplicate submission (should fail)
  console.log('\\n[TEST] 2. Duplicate submission prevention');
  try {
    await submitReview(product.id, 4, 'Another review', testPhone, testName);
    console.error('❌ Failed: Allowed duplicate review.');
  } catch (e: any) {
    if (e.message === 'You have already submitted a review for this product.') {
      console.log('✅ Passed: Blocked duplicate review.');
    } else {
      console.error('❌ Failed with unexpected error:', e.message);
    }
  }

  // 4. Test validation (rating out of bounds)
  console.log('\\n[TEST] 3. Input validation (invalid rating)');
  try {
    await submitReview(product.id, 6, 'Too good!', '+962770000002', 'User 2');
    console.error('❌ Failed: Allowed rating > 5.');
  } catch (e: any) {
    console.log('✅ Passed: Blocked invalid rating.', e.message);
  }

  // 5. Test validation (invalid product)
  console.log('\\n[TEST] 4. Input validation (invalid product)');
  try {
    await submitReview('invalid-uuid-format', 5, 'Great', '+962770000003', 'User 3');
    console.error('❌ Failed: Allowed invalid product UUID.');
  } catch (e: any) {
    console.log('✅ Passed: Blocked invalid UUID.', e.message);
  }

  console.log('\\nHardening tests completed.');

  // Cleanup
  await prisma.review.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } });
  await prisma.category.delete({ where: { id: category.id } });
}

main()
  .catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
