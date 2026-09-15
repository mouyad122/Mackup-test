import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { getEmployeePermissions } from '@/lib/dal';

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json([]);
    }
    const permissions = await getEmployeePermissions(session.employeeId);
    return NextResponse.json(permissions);
  } catch (error) {
    return NextResponse.json([]);
  }
}
