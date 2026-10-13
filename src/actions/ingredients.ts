'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createIngredient(formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameEn = formData.get('nameEn') as string;
    const nameAr = formData.get('nameAr') as string;
    const description = formData.get('description') as string | null;

    if (!nameEn || !nameAr) {
      throw new Error('الاسم بالإنجليزية والعربية مطلوبان');
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        nameEn,
        nameAr,
        description: description || null
      }
    });

    revalidatePath('/admin/ingredients');
    return { success: true, ingredientId: ingredient.id };
  } catch (error: any) {
    console.error('Error creating ingredient:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function updateIngredient(id: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const nameEn = formData.get('nameEn') as string;
    const nameAr = formData.get('nameAr') as string;
    const description = formData.get('description') as string | null;

    if (!nameEn || !nameAr) {
      throw new Error('الاسم بالإنجليزية والعربية مطلوبان');
    }

    await prisma.ingredient.update({
      where: { id },
      data: { nameEn, nameAr, description: description || null }
    });

    revalidatePath('/admin/ingredients');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating ingredient:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function deleteIngredient(id: string) {
  await requirePermission('manage:products');

  try {
    await prisma.ingredient.delete({
      where: { id }
    });

    revalidatePath('/admin/ingredients');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting ingredient:', error);
    return { success: false, error: 'حدث خطأ أثناء الحذف' };
  }
}
