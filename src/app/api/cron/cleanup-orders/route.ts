import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  if (process.env.ORDER_RETENTION_CLEANUP_ENABLED !== 'true') {
    return new NextResponse('Order retention cleanup is disabled', { status: 410 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return new NextResponse('Cron authorization is not configured', { status: 503 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Find and delete orders older than 1 month that are 'DELIVERED'
    const deletedOrders = await prisma.order.deleteMany({
      where: {
        status: 'DELIVERED',
        updatedAt: {
          lt: oneMonthAgo
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${deletedOrders.count} old completed orders.`,
      deletedCount: deletedOrders.count,
    });
  } catch (error: any) {
    console.error('CRON Cleanup Error:', error);
    return NextResponse.json({ success: false, error: 'Cleanup failed' }, { status: 500 });
  }
}
