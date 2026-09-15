import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  // Check authorization - you can secure this with a secret header (e.g. Vercel Cron Secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
