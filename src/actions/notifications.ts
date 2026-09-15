'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';

export async function getUnreadNotifications() {
  try {
    const session = await requirePermission('manage:inventory');
    const notifications = await prisma.adminNotification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    return { success: true, notifications };
  } catch (error) {
    return { success: false, notifications: [] };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await requirePermission('manage:inventory');
    await prisma.adminNotification.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    await requirePermission('manage:inventory');
    await prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
