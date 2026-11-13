import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSupplierReport } from './supplier-report';
import { prisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  prisma: {
    supplier: {
      findUnique: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
    financialTransaction: {
      findMany: vi.fn(),
    },
  },
}));

describe('generateSupplierReport itemStatus filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.financialTransaction.findMany as any).mockResolvedValue([]);
    (prisma.supplier.findUnique as any).mockResolvedValue({ name: 'متجر لافندر' });
  });

  const mockOrderItems = [
    {
      name: 'فستان زيتوني',
      sku: 'DRS-001',
      quantity: 1,
      total: 25000,
      unitCostSnapshot: 15000,
      supplierAmountSnapshot: 0,
      supplierIdSnapshot: 'sup-1',
      supplierNameSnapshot: 'متجر لافندر',
      isRemoved: false,
      removalReason: null,
      order: {
        reference: 'ORD-101',
        status: 'DELIVERED',
        createdAt: new Date('2026-11-10T10:00:00Z'),
        fulfillmentOrders: [],
      },
    },
    {
      name: 'عباية كلوش',
      sku: 'ABY-002',
      quantity: 1,
      total: 30000,
      unitCostSnapshot: 18000,
      supplierAmountSnapshot: 0,
      supplierIdSnapshot: 'sup-1',
      supplierNameSnapshot: 'متجر لافندر',
      isRemoved: false,
      removalReason: null,
      order: {
        reference: 'ORD-102',
        status: 'SHIPPED',
        createdAt: new Date('2026-11-11T12:00:00Z'),
        fulfillmentOrders: [],
      },
    },
    {
      name: 'عطر مسك',
      sku: 'PRF-003',
      quantity: 1,
      total: 20000,
      unitCostSnapshot: 10000,
      supplierAmountSnapshot: 0,
      supplierIdSnapshot: 'sup-1',
      supplierNameSnapshot: 'متجر لافندر',
      isRemoved: false,
      removalReason: null,
      order: {
        reference: 'ORD-103',
        status: 'CANCELLED',
        createdAt: new Date('2026-11-12T09:00:00Z'),
        fulfillmentOrders: [],
      },
    },
  ];

  it('filters by DELIVERED correctly (shows only delivered items)', async () => {
    (prisma.orderItem.findMany as any).mockResolvedValue(mockOrderItems);
    const result = await generateSupplierReport({ supplierId: 'sup-1', itemStatus: 'DELIVERED' });

    expect(result.rawRows).toHaveLength(1);
    expect(result.rawRows![0].productName).toBe('فستان زيتوني');
    expect(result.rawRows![0].deliveryStatus).toBe('تم التسليم بنجاح');
    expect(result.rawRows![0].eligibilityStatus).toBe('جاهز للصرف فوراً');
    expect(result.filtersApplied['حالة الصرف والاستحقاق']).toContain('مسلّم');
  });

  it('filters by IN_PROGRESS correctly (shows only in-progress items)', async () => {
    (prisma.orderItem.findMany as any).mockResolvedValue(mockOrderItems);
    const result = await generateSupplierReport({ supplierId: 'sup-1', itemStatus: 'IN_PROGRESS' });

    expect(result.rawRows).toHaveLength(1);
    expect(result.rawRows![0].productName).toBe('عباية كلوش');
    expect(result.rawRows![0].deliveryStatus).toBe('قيد التجهيز والتوصيل');
    expect(result.rawRows![0].eligibilityStatus).toBe('مستحق مؤجل حتى التسليم');
    expect(result.filtersApplied['حالة الصرف والاستحقاق']).toContain('مؤجل');
  });

  it('filters by CANCELLED correctly (shows only cancelled items)', async () => {
    (prisma.orderItem.findMany as any).mockResolvedValue(mockOrderItems);
    const result = await generateSupplierReport({ supplierId: 'sup-1', itemStatus: 'CANCELLED' });

    expect(result.rawRows).toHaveLength(1);
    expect(result.rawRows![0].productName).toBe('عطر مسك');
    expect(result.rawRows![0].deliveryStatus).toBe('مرتجع / ملغي');
    expect(result.rawRows![0].eligibilityStatus).toBe('غير مستحق (ملغي)');
    expect(result.filtersApplied['حالة الصرف والاستحقاق']).toContain('ملغي');
  });

  it('shows all items when no filter or ALL is passed', async () => {
    (prisma.orderItem.findMany as any).mockResolvedValue(mockOrderItems);
    const result = await generateSupplierReport({ supplierId: 'sup-1', itemStatus: 'ALL' });

    expect(result.rawRows).toHaveLength(3);
  });

  it('correctly groups items under their respective orders in ordersGrouped', async () => {
    (prisma.orderItem.findMany as any).mockResolvedValue([
      ...mockOrderItems,
      {
        name: 'شال حرير',
        sku: 'SHL-004',
        quantity: 2,
        total: 10000,
        unitCostSnapshot: 4000,
        supplierAmountSnapshot: 0,
        supplierIdSnapshot: 'sup-1',
        supplierNameSnapshot: 'متجر لافندر',
        isRemoved: false,
        removalReason: null,
        order: {
          reference: 'ORD-101',
          status: 'DELIVERED',
          createdAt: new Date('2026-11-10T10:00:00Z'),
          fulfillmentOrders: [],
        },
      },
    ]);
    const result = await generateSupplierReport({ supplierId: 'sup-1', itemStatus: 'DELIVERED' });

    expect(result.ordersGrouped).toBeDefined();
    expect(result.ordersGrouped).toHaveLength(1);
    expect(result.ordersGrouped![0].orderReference).toBe('ORD-101');
    expect(result.ordersGrouped![0].items).toHaveLength(2);
    expect(result.ordersGrouped![0].totalQuantity).toBe(3);
    expect(result.ordersGrouped![0].items[0].productName).toBe('فستان زيتوني');
    expect(result.ordersGrouped![0].items[1].productName).toBe('شال حرير');
  });
});
