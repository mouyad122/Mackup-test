import { prisma } from './db';

export async function getCMSContent(key: string, defaultValue: any) {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key }
    });
    return setting ? JSON.parse(setting.value) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export async function updateCMSContent(key: string, value: any) {
  return prisma.siteSettings.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) }
  });
}
