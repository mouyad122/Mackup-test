import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const slides = await prisma.homepageHeroSlide.findMany();
  console.log(JSON.stringify(slides, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
