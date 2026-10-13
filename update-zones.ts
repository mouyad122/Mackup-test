import { prisma } from './src/lib/db';

async function main() {
  console.log('Updating Shipping Zones...');
  const zones = await prisma.shippingZone.findMany();
  for (const zone of zones) {
    if (zone.nameAr.includes('عمان') || zone.nameAr.includes('البلقاء') || zone.nameAr.includes('السلط')) {
      await prisma.shippingZone.update({
        where: { id: zone.id },
        data: { fee: 2000, freeShippingThreshold: 30000 }
      });
      console.log(`Updated ${zone.nameAr} to 2 JD`);
    } else {
      await prisma.shippingZone.update({
        where: { id: zone.id },
        data: { fee: 3000, freeShippingThreshold: 30000 }
      });
      console.log(`Updated ${zone.nameAr} to 3 JD`);
    }
  }
  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
