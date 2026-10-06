import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const zones = await prisma.shippingZone.findMany({
      where: { isEnabled: true },
      orderBy: { nameAr: 'asc' },
      select: { id: true, nameAr: true, nameEn: true, fee: true, freeShippingThreshold: true, estimatedDeliveryTime: true },
    });
    return NextResponse.json({ success: true, zones });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
