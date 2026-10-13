'use server';

import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function updateCustomerNotes(customerId: string, notes: string) {
  await requirePermission('manage:settings'); // Replace with specific permission if available

  await prisma.customer.update({
    where: { id: customerId },
    data: { notes }
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath('/admin/customers');
}

export async function toggleCustomerStatus(customerId: string, isActive: boolean) {
  await requirePermission('manage:settings');

  await prisma.customer.update({
    where: { id: customerId },
    data: { isActive }
  });

  revalidatePath(`/admin/customers/${customerId}`);
  revalidatePath('/admin/customers');
}
