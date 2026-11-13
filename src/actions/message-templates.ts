'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import {
  getAllMessageTemplates,
  SYSTEM_MESSAGE_TEMPLATES,
} from '@/lib/message-templates';

export async function getAllMessageTemplatesAction() {
  await requirePermission('manage:settings');
  return await getAllMessageTemplates();
}

export async function saveMessageTemplateAction(key: string, content: string) {
  await requirePermission('manage:settings');

  if (!SYSTEM_MESSAGE_TEMPLATES[key]) {
    throw new Error('قالب غير صالح');
  }

  const settingKey = `msg_template_${key}`;
  const payload = JSON.stringify({
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  });

  await prisma.siteSettings.upsert({
    where: { key: settingKey },
    create: { key: settingKey, value: payload },
    update: { value: payload },
  });

  revalidatePath('/admin/message-templates');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/shops');
  return { success: true };
}

export async function resetMessageTemplateAction(key: string) {
  await requirePermission('manage:settings');

  const settingKey = `msg_template_${key}`;
  await prisma.siteSettings.deleteMany({
    where: { key: settingKey },
  });

  revalidatePath('/admin/message-templates');
  revalidatePath('/admin/orders');
  revalidatePath('/admin/orders/shops');
  return { success: true };
}
