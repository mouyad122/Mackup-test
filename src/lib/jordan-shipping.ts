import type { Prisma } from '@prisma/client';

export const JORDAN_SHIPPING_ZONES = [
  { nameAr: 'عمان', nameEn: 'Amman', fee: 2000, aliases: ['عمّان'] },
  { nameAr: 'السلط', nameEn: 'Salt', fee: 2000, aliases: ['As Salt', 'Al Salt'] },
  { nameAr: 'إربد', nameEn: 'Irbid', fee: 3000, aliases: ['اربد'] },
  { nameAr: 'الزرقاء', nameEn: 'Zarqa', fee: 3000, aliases: [] },
  { nameAr: 'المفرق', nameEn: 'Mafraq', fee: 3000, aliases: [] },
  { nameAr: 'عجلون', nameEn: 'Ajloun', fee: 3000, aliases: [] },
  { nameAr: 'جرش', nameEn: 'Jerash', fee: 3000, aliases: [] },
  { nameAr: 'مادبا', nameEn: 'Madaba', fee: 3000, aliases: [] },
  { nameAr: 'البلقاء', nameEn: 'Balqa', fee: 3000, aliases: [] },
  { nameAr: 'الكرك', nameEn: 'Karak', fee: 3000, aliases: [] },
  { nameAr: 'الطفيلة', nameEn: 'Tafilah', fee: 3000, aliases: [] },
  { nameAr: 'معان', nameEn: 'Maan', fee: 3000, aliases: [] },
  { nameAr: 'العقبة', nameEn: 'Aqaba', fee: 3000, aliases: [] },
];

// Apply this requested price list once; later admin edits must remain authoritative.
export async function configureJordanShipping(tx: Prisma.TransactionClient) {
  const key = 'jordan_shipping_prices_20261007';
  if (await tx.siteSettings.findUnique({ where: { key } })) return;
  for (const zone of JORDAN_SHIPPING_ZONES) {
    const matching = await tx.shippingZone.findMany({ where: { OR: [
      { nameEn: { in: [zone.nameEn, ...zone.aliases], mode: 'insensitive' } },
      { nameAr: { in: [zone.nameAr, ...zone.aliases] } },
    ] } });
    if (matching.length) {
      await tx.shippingZone.updateMany({ where: { id: { in: matching.map(item => item.id) } }, data: { fee: zone.fee, isEnabled: true } });
    } else {
      await tx.shippingZone.create({ data: { nameAr: zone.nameAr, nameEn: zone.nameEn, fee: zone.fee, estimatedDeliveryTime: '2-3 أيام', isEnabled: true } });
    }
  }
  await tx.siteSettings.create({ data: { key, value: JSON.stringify({ appliedAt: new Date().toISOString() }) } });
}
