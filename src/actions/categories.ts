'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { uploadMedia } from '@/actions/upload';
import { ensureDefaultTaxonomyInstalled } from '@/lib/taxonomy-defaults';

export type CategoryWithChildren = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imagePath: string | null;
  parentId: string | null;
  sortOrder: number;
  isVisible: boolean;
  defaultTemplateId: string | null;
  defaultTemplate?: { id: string; nameAr: string; code: string } | null;
  directProductCount: number;
  rollupProductCount: number;
  children: CategoryWithChildren[];
};

/**
 * Checks if candidateParentId is a descendant of currentId to prevent circular nesting.
 */
async function isDescendant(candidateParentId: string, currentId: string): Promise<boolean> {
  if (candidateParentId === currentId) return true;
  let currentParentId: string | null = candidateParentId;

  while (currentParentId) {
    const parentCat: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: currentParentId },
      select: { parentId: true },
    });
    if (!parentCat) break;
    if (parentCat.parentId === currentId) return true;
    currentParentId = parentCat.parentId;
  }
  return false;
}

export async function createCategory(formData: FormData) {
  await requirePermission('manage:products');

  try {
    const name = String(formData.get('name') || '').trim();
    if (!name) throw new Error('اسم القسم مطلوب');

    const parentId = String(formData.get('parentId') || '').trim() || null;
    const defaultTemplateId = String(formData.get('defaultTemplateId') || '').trim() || null;
    const description = String(formData.get('description') || '').trim() || null;
    const sortOrder = Number(formData.get('sortOrder') || 0);
    const isVisible = formData.get('isVisible') !== 'false';

    let imagePath: string | null = null;
    const imageFile = formData.get('image');
    if (imageFile instanceof File && imageFile.size > 0) {
      const uploadData = new FormData();
      uploadData.append('file', imageFile);
      const res = await uploadMedia(uploadData);
      if (res.success && res.url) {
        imagePath = res.url;
      } else {
        throw new Error(res.error || 'فشل رفع صورة القسم');
      }
    } else {
      const rawImagePath = String(formData.get('imagePath') || '').trim();
      if (rawImagePath) {
        imagePath = rawImagePath;
      }
    }

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '') || 'category';
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        parentId,
        defaultTemplateId,
        description,
        imagePath,
        sortOrder,
        isVisible,
      },
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId: category.id },
      });
    }

    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return { success: true, categoryId: category.id };
  } catch (error: unknown) {
    console.error('Error creating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء القسم' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const name = String(formData.get('name') || '').trim();
    if (!name) throw new Error('اسم القسم مطلوب');

    const parentId = String(formData.get('parentId') || '').trim() || null;
    const defaultTemplateId = String(formData.get('defaultTemplateId') || '').trim() || null;
    const description = String(formData.get('description') || '').trim() || null;
    const sortOrder = Number(formData.get('sortOrder') || 0);
    const isVisible = formData.get('isVisible') !== 'false';

    let imagePath: string | null | undefined = undefined;
    const removeImage = formData.get('removeImage') === 'true';
    if (removeImage) {
      imagePath = null;
    } else {
      const imageFile = formData.get('image');
      if (imageFile instanceof File && imageFile.size > 0) {
        const uploadData = new FormData();
        uploadData.append('file', imageFile);
        const res = await uploadMedia(uploadData);
        if (res.success && res.url) {
          imagePath = res.url;
        } else {
          throw new Error(res.error || 'فشل رفع صورة القسم');
        }
      } else if (formData.has('imagePath')) {
        const rawImagePath = String(formData.get('imagePath') || '').trim();
        imagePath = rawImagePath || null;
      }
    }

    // Anti-cyclic nesting validation
    if (parentId) {
      if (parentId === id) {
        throw new Error('لا يمكن للقسم أن يكون قسماً فرعياً لنفسه.');
      }
      const isCycle = await isDescendant(parentId, id);
      if (isCycle) {
        throw new Error('لا يمكن نقل القسم ليكون فرعاً لأحد الأقسام التابعة له.');
      }
    }

    await prisma.category.update({
      where: { id },
      data: {
        name,
        parentId,
        defaultTemplateId,
        description,
        sortOrder,
        isVisible,
        ...(imagePath !== undefined ? { imagePath } : {}),
      },
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId: id },
      });
    }

    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error updating category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ أثناء تعديل القسم' };
  }
}

export async function toggleCategoryVisibility(id: string, isVisible: boolean) {
  await requirePermission('manage:products');
  try {
    await prisma.category.update({
      where: { id },
      data: { isVisible },
    });
    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'تعذر تغيير حالة الظهور' };
  }
}

export async function deleteCategory(id: string, deleteProducts: boolean, fallbackCategoryId?: string) {
  await requirePermission('manage:products');

  try {
    if (deleteProducts) {
      await prisma.product.deleteMany({
        where: { categoryId: id },
      });
    } else {
      if (!fallbackCategoryId) {
        throw new Error('يجب اختيار قسم بديل لنقل المنتجات إليه');
      }
      if (fallbackCategoryId === id) {
        throw new Error('لا يمكن نقل المنتجات إلى نفس القسم المحذوف');
      }
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: fallbackCategoryId },
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    console.error('Error deleting category:', error);
    return { success: false, error: error instanceof Error ? error.message : 'حدث خطأ أثناء الحذف' };
  }
}

/**
 * Returns full hierarchical categories with recursive rollup product counts.
 */
export async function getCategoryTree(): Promise<CategoryWithChildren[]> {
  const all = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
      defaultTemplate: { select: { id: true, nameAr: true, code: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  const nodeMap = new Map<string, CategoryWithChildren>();

  for (const cat of all) {
    nodeMap.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      imagePath: cat.imagePath,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      isVisible: cat.isVisible,
      defaultTemplateId: cat.defaultTemplateId,
      defaultTemplate: cat.defaultTemplate,
      directProductCount: cat._count.products,
      rollupProductCount: cat._count.products,
      children: [],
    });
  }

  const roots: CategoryWithChildren[] = [];

  for (const cat of all) {
    const node = nodeMap.get(cat.id)!;
    if (cat.parentId && nodeMap.has(cat.parentId)) {
      const parent = nodeMap.get(cat.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Calculate cumulative rollup product count
  function calculateRollup(node: CategoryWithChildren): number {
    let count = node.directProductCount;
    for (const child of node.children) {
      count += calculateRollup(child);
    }
    node.rollupProductCount = count;
    return count;
  }

  for (const root of roots) {
    calculateRollup(root);
  }

  return roots;
}

export async function initRawaqTaxonomyAction() {
  await requirePermission('manage:products');
  await ensureDefaultTaxonomyInstalled();
  revalidatePath('/admin/categories');
  revalidatePath('/admin/products');
  revalidatePath('/', 'layout');
  return { success: true };
}
