'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

export async function createShippingZone(formData: FormData) {
  await requirePermission('manage:settings');
  
  const fee = Math.round(parseFloat(formData.get('fee') as string) * 1000);
  const freeThresholdStr = formData.get('freeShippingThreshold') as string;
  const freeShippingThreshold = freeThresholdStr ? Math.round(parseFloat(freeThresholdStr) * 1000) : null;

  await prisma.shippingZone.create({
    data: {
      nameAr: formData.get('nameAr') as string,
      nameEn: formData.get('nameEn') as string,
      estimatedDeliveryTime: formData.get('estimatedDeliveryTime') as string,
      fee,
      freeShippingThreshold,
      captainEarning: fee,
      actualDeliveryCost: fee,
      isEnabled: formData.get('isEnabled') === 'true',
    }
  });

  revalidatePath('/admin/shipping-zones');
  revalidatePath('/checkout');
}

export async function updateShippingZone(id: string, formData: FormData) {
  await requirePermission('manage:settings');
  
  const fee = Math.round(parseFloat(formData.get('fee') as string) * 1000);
  const freeThresholdStr = formData.get('freeShippingThreshold') as string;
  const freeShippingThreshold = freeThresholdStr ? Math.round(parseFloat(freeThresholdStr) * 1000) : null;

  await prisma.shippingZone.update({
    where: { id },
    data: {
      nameAr: formData.get('nameAr') as string,
      nameEn: formData.get('nameEn') as string,
      estimatedDeliveryTime: formData.get('estimatedDeliveryTime') as string,
      fee,
      freeShippingThreshold,
      captainEarning: fee,
      actualDeliveryCost: fee,
      isEnabled: formData.get('isEnabled') === 'true',
    }
  });

  revalidatePath('/admin/shipping-zones');
  revalidatePath('/checkout');
}

export async function deleteShippingZone(id: string) {
  await requirePermission('manage:settings');
  
  await prisma.shippingZone.delete({
    where: { id }
  });

  revalidatePath('/admin/shipping-zones');
  revalidatePath('/checkout');
}
