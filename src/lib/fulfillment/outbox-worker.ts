import { prisma } from '@/lib/db';
import { executeOrderFulfillmentSplit } from './order-splitter';

/**
 * معالج مهام الـ Outbox في الخلفية (Idempotent Background Worker)
 * يقوم بسحب المهام المجدولة غير المكتملة وتنفيذها مع إعادة المحاولة في حال التعثر.
 */
export async function processPendingFulfillmentOutbox(batchSize = 10): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const now = new Date();

  // 1. استرجاع الدفعة المجدولة للتنفيذ
  const pendingJobs = await prisma.fulfillmentOutbox.findMany({
    where: {
      status: { in: ['PENDING', 'PROCESSING'] },
      nextRunAt: { lte: now },
      attempts: { lt: 5 },
    },
    take: batchSize,
    orderBy: { createdAt: 'asc' },
  });

  let succeeded = 0;
  let failed = 0;

  for (const job of pendingJobs) {
    try {
      // وسم المهمة كـ PROCESSING
      await prisma.fulfillmentOutbox.update({
        where: { id: job.id },
        data: {
          status: 'PROCESSING',
          attempts: { increment: 1 },
        },
      });

      if (job.eventType === 'ORDER_CONFIRMED_SPLIT') {
        await executeOrderFulfillmentSplit(job.orderId);
      }

      // إكمال المهمة بنجاح
      await prisma.fulfillmentOutbox.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          lastError: null,
        },
      });

      succeeded++;
    } catch (err: any) {
      failed++;
      const nextDelayMinutes = Math.pow(2, job.attempts + 1); // Exponential Backoff: 2, 4, 8, 16 mins
      const nextRunAt = new Date(Date.now() + nextDelayMinutes * 60 * 1000);

      await prisma.fulfillmentOutbox.update({
        where: { id: job.id },
        data: {
          status: job.attempts + 1 >= job.maxAttempts ? 'FAILED' : 'PENDING',
          lastError: err?.message || String(err),
          nextRunAt,
        },
      });

      // تسجيل الخطأ في سجل التدقيق
      await prisma.fulfillmentAuditLog.create({
        data: {
          entityType: 'OUTBOX',
          entityId: job.id,
          fromStatus: 'PROCESSING',
          toStatus: 'FAILED',
          actorType: 'SYSTEM',
          notes: `فشلت معالجة Outbox للطلب #${job.orderId}: ${err?.message || err}`,
        },
      });
    }
  }

  return {
    processed: pendingJobs.length,
    succeeded,
    failed,
  };
}
