import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const now = new Date();
  const rules = await prisma.rewardRule.findMany({
    where: { isActive: true, OR: [{ startsAt: null }, { startsAt: { lte: now } }], AND: [
      { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
    ] },
    select: { name: true, minimumAmount: true, rewardType: true, rewardValue: true, usageLimit: true, usageCount: true },
    orderBy: { minimumAmount: 'asc' },
  });
  const available = rules.map(({ usageLimit: _usageLimit, usageCount: _usageCount, ...rule }) => rule);
  return NextResponse.json({ rules: available }, { headers: { 'Cache-Control': 'no-store' } });
}
