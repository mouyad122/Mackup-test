import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const tx = {
    product: { update: vi.fn() },
    productVariant: { count: vi.fn(), updateMany: vi.fn(), update: vi.fn(), create: vi.fn() },
    supplier: { findUnique: vi.fn() },
    supplierOffer: { findUnique: vi.fn(), updateMany: vi.fn(), upsert: vi.fn() },
    supplierInventoryMovement: { create: vi.fn() },
    productSimilar: { deleteMany: vi.fn() },
    productAttribute: { deleteMany: vi.fn() },
  };
  return { tx, transaction: vi.fn(), permission: vi.fn() };
});

vi.mock('@/lib/db', () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.permission }));
vi.mock('@/actions/upload', () => ({ uploadMedia: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { updateProduct } from './products';

const supplierId = 'c775dc22-647d-4a9b-8b4e-e9469766ee12';
const updatedAt = new Date('2026-10-07T10:00:00.000Z');
function form(overrides: Record<string, unknown> = {}) {
  const data = new FormData();
  data.set('categoryId', 'category');
  data.set('nameAr', 'منتج تجريبي');
  data.set('variants', JSON.stringify([{
    id: 'variant', name: 'Standard', sku: 'SKU-STD', price: 10000,
    stock: 99, inventorySource: 'SUPPLIER', supplierId,
    supplierUnitCost: '5.000', supplierStock: '8', supplierSharePercent: '37.5',
    supplierOfferUpdatedAt: updatedAt.toISOString(), ...overrides,
  }]));
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.permission.mockResolvedValue({ employeeId: 'employee' });
  mocks.transaction.mockImplementation(async callback => callback(mocks.tx));
  mocks.tx.productVariant.count.mockResolvedValue(1);
  mocks.tx.supplier.findUnique.mockResolvedValue({ id: supplierId, isActive: true, profitMargin: 10 });
  mocks.tx.supplierOffer.findUnique.mockResolvedValue({ id: 'offer', stock: 5, updatedAt });
  mocks.tx.supplierOffer.upsert.mockResolvedValue({ id: 'offer' });
});

describe('editing the store supplying a product', () => {
  it('saves the selected store using its configured profit margin without changing legacy supplier quantity', async () => {
    expect(await updateProduct('product', form())).toEqual({ success: true });
    expect(mocks.permission).toHaveBeenCalledWith('manage:products');
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
    expect(mocks.tx.supplierOffer.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { supplierId_variantId: { supplierId, variantId: 'variant' } },
      update: { unitCost: 5000, supplierProfitShareBps: 1000, stock: 5, isActive: true },
    }));
    const variantUpdate = mocks.tx.productVariant.update.mock.calls[0][0];
    expect(variantUpdate.where).toEqual({ id: 'variant', productId: 'product' });
    expect(variantUpdate.data.stock).toBe(0);
    expect(mocks.tx.supplierOffer.updateMany).toHaveBeenCalledWith({
      where: { variantId: 'variant', supplierId: { not: supplierId }, isActive: true },
      data: { isActive: false },
    });
    expect(mocks.tx.supplierInventoryMovement.create).not.toHaveBeenCalled();
  });

  it('accepts an explicitly agreed zero cost', async () => {
    expect(await updateProduct('product', form({ supplierUnitCost: '0' }))).toEqual({ success: true });
    expect(mocks.tx.supplierOffer.upsert.mock.calls[0][0].update.unitCost).toBe(0);
  });

  it.each([
    { supplierUnitCost: '' }, { supplierUnitCost: null },
    { supplierUnitCost: -1 },
  ])('rejects incomplete or invalid supplier data before writing: %j', async overrides => {
    expect((await updateProduct('product', form(overrides))).success).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('refuses an inactive supplier', async () => {
    mocks.tx.supplier.findUnique.mockResolvedValue({ isActive: false });
    expect((await updateProduct('product', form())).success).toBe(false);
    expect(mocks.tx.supplierOffer.upsert).not.toHaveBeenCalled();
  });

  it('does not depend on a displayed supplier quantity', async () => {
    mocks.tx.supplierOffer.findUnique.mockResolvedValue({ id: 'offer', stock: 3, updatedAt: new Date('2026-10-07T11:00:00.000Z') });
    expect((await updateProduct('product', form({ supplierOfferUpdatedAt: null }))).success).toBe(true);
    expect(mocks.tx.supplierOffer.upsert.mock.calls[0][0].update.stock).toBe(3);
  });

  it('ignores legacy supplier quantity input and creates no movement', async () => {
    expect((await updateProduct('product', form({ supplierStock: '99' }))).success).toBe(true);
    expect(mocks.tx.supplierInventoryMovement.create).not.toHaveBeenCalled();
  });

  it('rejects a variant belonging to another product before any mutation', async () => {
    mocks.tx.productVariant.count.mockResolvedValue(0);
    expect((await updateProduct('product', form())).success).toBe(false);
    expect(mocks.tx.product.update).not.toHaveBeenCalled();
  });

  it('still allows an internal product without supplier fields', async () => {
    expect((await updateProduct('product', form({ inventorySource: 'INTERNAL', supplierId: null }))).success).toBe(true);
    expect(mocks.tx.productVariant.update.mock.calls[0][0].data.stock).toBe(0);
    expect(mocks.tx.supplierOffer.upsert).not.toHaveBeenCalled();
  });
});
