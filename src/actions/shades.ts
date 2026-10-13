'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createShade(formData: FormData) {
  await requirePermission('manage:products');

  try {
    const name = formData.get('name') as string;
    if (!name) throw new Error('اسم الدرجة مطلوب');

    const hexCode = formData.get('hexCode') as string || null;
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    const shade = await prisma.shade.create({
      data: {
        name,
        hexCode,
        isActive
      }
    });

    revalidatePath('/admin/shades');
    return { success: true, shadeId: shade.id };
  } catch (error: any) {
    console.error('Error creating shade:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function updateShade(id: string, formData: FormData) {
  await requirePermission('manage:products');

  try {
    const name = formData.get('name') as string;
    if (!name) throw new Error('اسم الدرجة مطلوب');

    const hexCode = formData.get('hexCode') as string || null;
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    await prisma.shade.update({
      where: { id },
      data: { name, hexCode, isActive }
    });

    revalidatePath('/admin/shades');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating shade:', error);
    return { success: false, error: 'حدث خطأ غير معروف' };
  }
}

export async function deleteShade(id: string) {
  await requirePermission('manage:products');

  try {
    await prisma.shade.delete({
      where: { id }
    });

    revalidatePath('/admin/shades');
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting shade:', error);
    return { success: false, error: 'حدث خطأ أثناء الحذف' };
  }
}
