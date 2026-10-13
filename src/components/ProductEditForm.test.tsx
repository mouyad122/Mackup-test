// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductEditForm } from './ProductEditForm';
import { updateProduct } from '@/actions/products';

vi.mock('next/navigation', () => ({ useRouter: () => ({}) }));
vi.mock('@/actions/products', () => ({ updateProduct: vi.fn().mockResolvedValue({ success: false, error: 'test' }) }));
afterEach(cleanup);

it('submits an optional supplier and cost while availability remains a manual toggle', async () => {
  const { container } = render(<ProductEditForm productId="product" categories={[]} brands={[]}
    suppliers={[{ id: 'store', name: 'متجر الورد', profitMargin: 50 }]}
    initialData={{
      nameAr: 'منتج', nameEn: 'Product', sku: 'SKU', categoryId: '', brandId: null,
      shortDescription: null, longDescription: null, isVisible: true, isFeatured: false,
      productType: null, finish: null, coverage: null, skinType: null, benefits: null,
      ingredients: null, howToUse: null, images: [], similarProductIds: [], attributes: [],
      variants: [{ id: 'variant', name: 'Standard', sku: 'SKU-STD', price: 10000,
        stock: 0, isActive: true, inventorySource: 'INTERNAL' }],
    }} />);
  fireEvent.change(screen.getByLabelText('المتجر / المورد صاحب القطعة'), { target: { value: 'store' } });
  fireEvent.change(screen.getByLabelText('كلفة القطعة للمورد (د.أ) *'), { target: { value: '4.250' } });
  fireEvent.click(screen.getByLabelText('متوفر'));
  fireEvent.submit(container.querySelector('form')!);
  await waitFor(() => expect(updateProduct).toHaveBeenCalled());
  const submitted = vi.mocked(updateProduct).mock.calls[0][1];
  expect(JSON.parse(String(submitted.get('variants')))[0]).toMatchObject({
    supplierId: 'store', supplierUnitCost: '4.250', inventorySource: 'SUPPLIER', stock: 0,
    isActive: false,
  });
});
