import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const category = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  };
  const product = {
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
  return { category, product, permission: vi.fn(), revalidatePath: vi.fn() };
});

vi.mock('@/lib/db', () => ({
  prisma: {
    category: mocks.category,
    product: mocks.product,
  },
}));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.permission }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/actions/upload', () => ({ uploadMedia: vi.fn() }));

import {
  createCategory,
  updateCategory,
  toggleCategoryVisibility,
  deleteCategory,
  getCategoryTree,
} from './categories';

describe('Category Hierarchy Actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.permission.mockResolvedValue({ employeeId: 'admin-emp' });
  });

  describe('createCategory', () => {
    it('creates a new category with generated slug and sort order', async () => {
      mocks.category.findUnique.mockResolvedValue(null);
      mocks.category.create.mockResolvedValue({ id: 'cat-new', name: 'أحمر شفاه', slug: 'أحمر-شفاه' });

      const form = new FormData();
      form.set('name', 'أحمر شفاه');
      form.set('parentId', 'cat-parent');
      form.set('defaultTemplateId', 'tmpl-makeup');
      form.set('sortOrder', '5');

      const result = await createCategory(form);
      expect(result.success).toBe(true);
      expect(mocks.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'أحمر شفاه',
            parentId: 'cat-parent',
            defaultTemplateId: 'tmpl-makeup',
            sortOrder: 5,
            isVisible: true,
          }),
        })
      );
      expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin/categories');
    });

    it('fails when name is missing', async () => {
      const form = new FormData();
      const result = await createCategory(form);
      expect(result.success).toBe(false);
      expect(result.error).toBe('اسم القسم مطلوب');
    });
  });

  describe('updateCategory', () => {
    it('prevents making a category its own parent', async () => {
      const form = new FormData();
      form.set('name', 'العطور');
      form.set('parentId', 'cat-1');

      const result = await updateCategory('cat-1', form);
      expect(result.success).toBe(false);
      expect(result.error).toBe('لا يمكن للقسم أن يكون قسماً فرعياً لنفسه.');
    });

    it('prevents making a category a child of its own descendant (circular chain)', async () => {
      mocks.category.findUnique.mockResolvedValueOnce({ parentId: 'cat-1' });

      const form = new FormData();
      form.set('name', 'المكياج');
      form.set('parentId', 'cat-2');

      const result = await updateCategory('cat-1', form);
      expect(result.success).toBe(false);
      expect(result.error).toBe('لا يمكن نقل القسم ليكون فرعاً لأحد الأقسام التابعة له.');
    });

    it('successfully updates category details and parent', async () => {
      mocks.category.findUnique.mockResolvedValue(null);
      mocks.category.update.mockResolvedValue({ id: 'cat-3', name: 'عطور شرقية' });

      const form = new FormData();
      form.set('name', 'عطور شرقية');
      form.set('parentId', 'cat-root');
      form.set('sortOrder', '10');

      const result = await updateCategory('cat-3', form);
      expect(result.success).toBe(true);
      expect(mocks.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-3' },
        data: {
          name: 'عطور شرقية',
          description: null,
          parentId: 'cat-root',
          defaultTemplateId: null,
          sortOrder: 10,
          isVisible: true,
        },
      });
    });
  });

  describe('toggleCategoryVisibility', () => {
    it('toggles isVisible status', async () => {
      mocks.category.update.mockResolvedValue({ id: 'cat-1', isVisible: false });
      const result = await toggleCategoryVisibility('cat-1', false);
      expect(result.success).toBe(true);
      expect(mocks.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isVisible: false },
      });
    });
  });

  describe('deleteCategory', () => {
    it('reassigns products before deleting category when deleteProducts is false', async () => {
      mocks.product.updateMany.mockResolvedValue({ count: 5 });
      mocks.category.delete.mockResolvedValue({ id: 'cat-old' });

      const result = await deleteCategory('cat-old', false, 'cat-fallback');
      expect(result.success).toBe(true);
      expect(mocks.product.updateMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat-old' },
        data: { categoryId: 'cat-fallback' },
      });
      expect(mocks.category.delete).toHaveBeenCalledWith({
        where: { id: 'cat-old' },
      });
    });
  });

  describe('getCategoryTree', () => {
    it('builds tree and computes cumulative rollup product counts', async () => {
      mocks.category.findMany.mockResolvedValue([
        {
          id: 'root-1',
          name: 'المكياج',
          slug: 'makeup',
          parentId: null,
          sortOrder: 1,
          isVisible: true,
          defaultTemplateId: null,
          defaultTemplate: null,
          _count: { products: 2 },
        },
        {
          id: 'sub-1',
          name: 'الشفاه',
          slug: 'lips',
          parentId: 'root-1',
          sortOrder: 1,
          isVisible: true,
          defaultTemplateId: null,
          defaultTemplate: null,
          _count: { products: 3 },
        },
        {
          id: 'leaf-1',
          name: 'أحمر شفاه',
          slug: 'lipstick',
          parentId: 'sub-1',
          sortOrder: 1,
          isVisible: true,
          defaultTemplateId: 'tmpl-1',
          defaultTemplate: { id: 'tmpl-1', nameAr: 'قالب المكياج', code: 'makeup' },
          _count: { products: 5 },
        },
      ]);

      const tree = await getCategoryTree();
      expect(tree).toHaveLength(1);
      const root = tree[0];
      expect(root.name).toBe('المكياج');
      expect(root.directProductCount).toBe(2);
      expect(root.rollupProductCount).toBe(10);

      expect(root.children).toHaveLength(1);
      const sub = root.children[0];
      expect(sub.name).toBe('الشفاه');
      expect(sub.directProductCount).toBe(3);
      expect(sub.rollupProductCount).toBe(8);

      expect(sub.children).toHaveLength(1);
      const leaf = sub.children[0];
      expect(leaf.name).toBe('أحمر شفاه');
      expect(leaf.directProductCount).toBe(5);
      expect(leaf.rollupProductCount).toBe(5);
    });
  });
});
