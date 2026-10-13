'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createCaptain(formData: FormData) {
  await requirePermission('manage:orders');
  
  await prisma.captain.create({
    data: {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      status: formData.get('status') as string || 'AVAILABLE',
      isActive: formData.get('isActive') === 'true',
      notes: formData.get('notes') as string || null,
    }
  });

  revalidatePath('/admin/captains/manage');
  revalidatePath('/admin/captains');
}

export async function updateCaptain(id: string, formData: FormData) {
  await requirePermission('manage:orders');
  
  await prisma.captain.update({
    where: { id },
    data: {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      status: formData.get('status') as string,
      isActive: formData.get('isActive') === 'true',
      notes: formData.get('notes') as string || null,
    }
  });

  revalidatePath('/admin/captains/manage');
  revalidatePath('/admin/captains');
}

export async function deleteCaptain(id: string) {
  await requirePermission('manage:orders');
  
  await prisma.captain.delete({
    where: { id }
  });

  revalidatePath('/admin/captains/manage');
  revalidatePath('/admin/captains');
}
