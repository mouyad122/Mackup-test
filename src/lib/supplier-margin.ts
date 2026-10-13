import type { Prisma, PrismaClient } from '@prisma/client';

type SettingsClient =
  | Pick<PrismaClient, 'siteSettings' | 'supplierOffer'>
  | Pick<Prisma.TransactionClient, 'siteSettings' | 'supplierOffer'>;

const marginKey = (supplierId: string) => `supplier_profit_margin:${supplierId}`;

export async function getSupplierProfitMargin(client: SettingsClient, supplierId: string): Promise<number> {
  const setting = await client.siteSettings.findUnique({ where: { key: marginKey(supplierId) } });
  if (!setting) {
    const offer = await client.supplierOffer.findFirst({
      where: { supplierId, isActive: true },
      orderBy: { updatedAt: 'desc' },
      select: { supplierProfitShareBps: true },
    });
    return offer ? Math.round(offer.supplierProfitShareBps / 100) : 0;
  }
  const margin = Number(setting.value);
  return Number.isInteger(margin) && margin >= 0 && margin <= 100 ? margin : 0;
}

export async function setSupplierProfitMargin(client: SettingsClient, supplierId: string, margin: number) {
  const normalized = Math.max(0, Math.min(100, Math.round(margin)));
  await client.siteSettings.upsert({
    where: { key: marginKey(supplierId) },
    create: { key: marginKey(supplierId), value: String(normalized) },
    update: { value: String(normalized) },
  });
  return normalized;
}
