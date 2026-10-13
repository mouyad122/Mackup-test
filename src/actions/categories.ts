'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createCategory(formData: FormData) {
  await requirePermission('manage:products'); // or manage:settings depending on the role setup

  try {
    const name = formData.get('name') as string;
    if (!name) throw new Error('اسم المجموعة مطلوب');

    const slug = name.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, '-') + '-' + Date.now();

    const category = await prisma.category.create({
      data: {
        name,
        slug,
      }
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId: category.id }
      });
    }

    revalidatePath('/admin/categories');
    return { success: true, categoryId: category.id };
  } catch (error: any) {
    console.error('Error creating category:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const name = formData.get('name') as string;
    if (!name) throw new Error('اسم المجموعة مطلوب');

    await prisma.category.update({
      where: { id },
      data: { name }
    });

    const productIds = formData.getAll('productIds') as string[];
    if (productIds && productIds.length > 0) {
      await prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId: id }
      });
    }

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function deleteCategory(id: string, deleteProducts: boolean, fallbackCategoryId?: string) {
  await requirePermission('manage:products');

  try {
    if (deleteProducts) {
      // First delete all products associated with this category
      await prisma.product.deleteMany({
        where: { categoryId: id }
      });
    } else {
      if (!fallbackCategoryId) {
        throw new Error('يجب اختيار مجموعة بديلة لنقل المنتجات إليها');
      }
      if (fallbackCategoryId === id) {
         throw new Error('لا يمكن نقل المنتجات إلى نفس المجموعة المحذوفة');
      }
      // Update all products to the fallback category
      await prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: fallbackCategoryId }
      });
    }

    await prisma.category.delete({
      where: { id }
    });

    revalidatePath('/admin/categories');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return { success: false, error: 'حدث خطأ أثناء الحذف' };
  }
}
