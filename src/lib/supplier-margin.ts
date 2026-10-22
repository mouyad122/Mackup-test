import type { Prisma, PrismaClient } from '@prisma/client';

type SettingsClient =
  | Pick<PrismaClient, 'siteSettings' | 'supplierOffer'>
  | Pick<Prisma.TransactionClient, 'siteSettings' | 'supplierOffer'>;

const marginKey = (supplierId: string) => `supplier_profit_margin:${supplierId}`;

export async function getSupplierProfitMargin(client: SettingsClient, supplierId: string): Promise<number> {
  const setting = typeof client.siteSettings?.findUnique === 'function'
    ? await client.siteSettings.findUnique({ where: { key: marginKey(supplierId) } })
    : null;

  if (!setting) {
    if (typeof client.supplierOffer?.findFirst === 'function') {
      const offer = await client.supplierOffer.findFirst({
        where: { supplierId, isActive: true },
        orderBy: { updatedAt: 'desc' },
        select: { supplierProfitShareBps: true },
      });
      return offer ? Math.round(offer.supplierProfitShareBps / 100) : 0;
    }

    const sup = typeof (client as any).supplier?.findUnique === 'function'
      ? await (client as any).supplier.findUnique({ where: { id: supplierId } })
      : null;
    return typeof sup?.profitMargin === 'number' ? sup.profitMargin : 0;
  }

  const margin = Number(setting.value);
  return Number.isInteger(margin) && margin >= 0 && margin <= 100 ? margin : 0;
}

export async function setSupplierProfitMargin(
  client: Pick<PrismaClient, 'siteSettings'> | Pick<Prisma.TransactionClient, 'siteSettings'>,
  supplierId: string,
  profitMarginPercent: number
): Promise<void> {
  await client.siteSettings.upsert({
    where: { key: marginKey(supplierId) },
    update: { value: String(Math.round(profitMarginPercent)) },
    create: { key: marginKey(supplierId), value: String(Math.round(profitMarginPercent)) },
  });
}
