import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Cron Job — تنظيف أحداث Rate Limiting المنتهية الصلاحية
 * يُنفَّذ يومياً الساعة 2 صباحاً (vercel.json: "0 2 * * *")
 * 
 * هذا يُزيل عبء تنظيف DB من كل طلب لتحسين الأداء
 */
export async function GET(request: Request) {
  // التحقق من صلاحية الطلب (Cron secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date();

    // حذف أحداث Rate Limit المنتهية
    const deleted = await prisma.rateLimitEvent.deleteMany({
      where: {
        expireAt: { lt: now },
      },
    });

    // حذف MFA Challenges المنتهية
    const deletedMfa = await prisma.pendingMfaChallenge.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    // حذف Sessions المنتهية
    const deletedSessions = await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });

    console.log(`[Cron cleanup-ratelimits] Deleted: ${deleted.count} rate limit events, ${deletedMfa.count} MFA challenges, ${deletedSessions.count} sessions`);

    return NextResponse.json({
      success: true,
      deleted: {
        rateLimitEvents: deleted.count,
        mfaChallenges: deletedMfa.count,
        sessions: deletedSessions.count,
      },
    });
  } catch (error) {
    console.error('[Cron cleanup-ratelimits] Error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
