'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';

const JORDAN_GOVERNORATES = [
  { nameAr: 'عمان', nameEn: 'Amman', fee: 3000, estimatedDeliveryTime: '24 hours' },
  { nameAr: 'إربد', nameEn: 'Irbid', fee: 3000, estimatedDeliveryTime: '24-48 hours' },
  { nameAr: 'الزرقاء', nameEn: 'Zarqa', fee: 3000, estimatedDeliveryTime: '24 hours' },
  { nameAr: 'المفرق', nameEn: 'Mafraq', fee: 4000, estimatedDeliveryTime: '48 hours' },
  { nameAr: 'عجلون', nameEn: 'Ajloun', fee: 4000, estimatedDeliveryTime: '48 hours' },
  { nameAr: 'جرش', nameEn: 'Jerash', fee: 4000, estimatedDeliveryTime: '48 hours' },
  { nameAr: 'مادبا', nameEn: 'Madaba', fee: 3000, estimatedDeliveryTime: '24-48 hours' },
  { nameAr: 'البلقاء', nameEn: 'Balqa', fee: 3000, estimatedDeliveryTime: '24-48 hours' },
  { nameAr: 'الكرك', nameEn: 'Karak', fee: 5000, estimatedDeliveryTime: '48-72 hours' },
  { nameAr: 'الطفيلة', nameEn: 'Tafilah', fee: 5000, estimatedDeliveryTime: '48-72 hours' },
  { nameAr: 'معان', nameEn: 'Maan', fee: 5000, estimatedDeliveryTime: '48-72 hours' },
  { nameAr: 'العقبة', nameEn: 'Aqaba', fee: 5000, estimatedDeliveryTime: '48-72 hours' },
];

export async function initializeShippingZones() {
  await requirePermission('manage:settings');
  
  const count = await prisma.shippingZone.count();
  if (count === 0) {
    for (const gov of JORDAN_GOVERNORATES) {
      await prisma.shippingZone.create({
        data: {
          nameAr: gov.nameAr,
          nameEn: gov.nameEn,
          fee: gov.fee,
          estimatedDeliveryTime: gov.estimatedDeliveryTime,
          isEnabled: true
        }
      });
    }
  }
}
export async function updateShippingZone(id: string, data: { fee: number, actualDeliveryCost: number, captainEarning: number, isEnabled: boolean, estimatedDeliveryTime: string }) {
  await requirePermission('manage:settings');

  if (!Number.isSafeInteger(data.fee) || data.fee < 0 || !Number.isSafeInteger(data.actualDeliveryCost) || data.actualDeliveryCost < 0 || !Number.isSafeInteger(data.captainEarning) || data.captainEarning < 0) {
    return { success: false, error: 'قيمة رسوم التوصيل غير صالحة' };
  }
  
  await prisma.shippingZone.update({
    where: { id },
    data: {
      fee: data.fee,
      actualDeliveryCost: data.actualDeliveryCost,
      captainEarning: data.captainEarning,
      isEnabled: data.isEnabled,
      estimatedDeliveryTime: data.estimatedDeliveryTime,
    }
  });
  
  revalidatePath('/admin/settings/shipping');
  return { success: true };
}
