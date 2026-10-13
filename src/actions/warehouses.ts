'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createWarehouse(formData: FormData) {
  await requirePermission('manage:inventory');

  try {
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const location = formData.get('location') as string;
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    if (!name) throw new Error('اسم المستودع مطلوب');
    if (!code) throw new Error('كود المستودع مطلوب');

    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code,
        location: location || null,
        isActive
      }
    });

    revalidatePath('/admin/warehouses');
    return { success: true, warehouseId: warehouse.id };
  } catch (error: any) {
    console.error('Error creating warehouse:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'اسم المستودع أو الكود مستخدم بالفعل' };
    }
    return { success: false, error: 'حدث خطأ أثناء الإنشاء' };
  }
}

export async function updateWarehouse(id: string, formData: FormData) {
  await requirePermission('manage:inventory');

  try {
    const name = formData.get('name') as string;
    const code = formData.get('code') as string;
    const location = formData.get('location') as string;
    const isActive = formData.get('isActive') === 'on' || formData.get('isActive') === 'true';

    if (!name) throw new Error('اسم المستودع مطلوب');
    if (!code) throw new Error('كود المستودع مطلوب');

    await prisma.warehouse.update({
      where: { id },
      data: {
        name,
        code,
        location: location || null,
        isActive
      }
    });

    revalidatePath('/admin/warehouses');
    revalidatePath(`/admin/warehouses/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating warehouse:', error);
    if (error.code === 'P2002') {
      return { success: false, error: 'اسم المستودع أو الكود مستخدم بالفعل' };
    }
    return { success: false, error: 'حدث خطأ أثناء التحديث' };
  }
}

export async function toggleWarehouseStatus(id: string, isActive: boolean) {
  await requirePermission('manage:inventory');

  try {
    await prisma.warehouse.update({
      where: { id },
      data: { isActive }
    });

    revalidatePath('/admin/warehouses');
    revalidatePath(`/admin/warehouses/${id}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling warehouse status:', error);
    return { success: false, error: 'حدث خطأ أثناء تغيير الحالة' };
  }
}
