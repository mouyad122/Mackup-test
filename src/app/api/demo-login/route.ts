import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSession, setSessionCookie } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const roleStr = searchParams.get('role'); // 'admin' or 'cashier'
  
  const roleName = roleStr === 'cashier' ? 'Cashier' : 'Admin';
  
  // Find an employee with this role
  let employee = await prisma.employee.findFirst({
    where: { role: { name: roleName }, isActive: true }
  });
  
  // If not found, create one on the fly for the demo
  if (!employee) {
    let role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      role = await prisma.role.create({ data: { name: roleName, description: 'Auto created demo role' } });
    }
    employee = await prisma.employee.create({
      data: {
        name: `Demo ${roleName}`,
        email: `demo-${roleName.toLowerCase()}@example.com`,
        passwordHash: 'dummy',
        isActive: true,
        roleId: role.id
      }
    });
  }

  // Create session
  const { token, expiresAt, role } = await createSession(employee.id, roleName);
  
  // Set cookie
  await setSessionCookie(token, expiresAt, role);
  
  // Redirect
  const redirectUrl = roleName === 'Cashier' ? '/pos/cashier' : '/admin/dashboard';
  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
