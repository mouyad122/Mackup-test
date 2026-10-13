'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

import { configureJordanShipping } from '@/lib/jordan-shipping';

export async function initializeShippingZones() {
  await requirePermission('manage:settings');
  await prisma.$transaction(configureJordanShipping, { isolationLevel: 'Serializable' });
}

export async function updateShippingZone(id: string, data: { fee: number, actualDeliveryCost: number | null, captainEarning: number | null, isEnabled: boolean, estimatedDeliveryTime: string }) {
  const session = await requirePermission('manage:settings');

  if (!Number.isSafeInteger(data.fee) || data.fee < 0 || (data.actualDeliveryCost !== null && (!Number.isSafeInteger(data.actualDeliveryCost) || data.actualDeliveryCost < 0)) || (data.captainEarning !== null && (!Number.isSafeInteger(data.captainEarning) || data.captainEarning < 0))) {
    return { success: false, error: 'قيمة رسوم التوصيل غير صالحة' };
  }
  
  await prisma.$transaction(async tx => {
  const previous = await tx.shippingZone.findUniqueOrThrow({ where: { id } });
  await tx.shippingZone.update({
    where: { id },
    data: {
      fee: data.fee,
      actualDeliveryCost: data.actualDeliveryCost,
      captainEarning: data.captainEarning,
      isEnabled: data.isEnabled,
      estimatedDeliveryTime: data.estimatedDeliveryTime,
    }
  });
  
  await tx.auditLog.create({ data: { employeeId: session.employeeId, action: 'SHIPPING_ZONE_UPDATED', entityType: 'ShippingZone', entityId: id, details: JSON.stringify({ previous, current: data }) } });
  });
  revalidatePath('/admin/deliveries');
  revalidatePath('/', 'layout');
  return { success: true };
}
