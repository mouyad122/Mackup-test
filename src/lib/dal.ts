import { getCurrentSession } from './auth';
import { redirect } from 'next/navigation';
import { prisma } from './db';
import 'server-only';

export async function requireAuth() {
  const session = await getCurrentSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // Note: Absolute POS Cashier Isolation (P2-002) is enforced by Next.js middleware
  // which blocks Cashier roles from accessing /admin/* routes entirely.
  
  return session;
}

export async function requirePermission(action: string) {
  const session = await requireAuth();
  
  // Enforce strict role-based permissions
  const roleName = session.employee.role.name.toUpperCase();

  if (roleName === 'ADMIN') {
    return session;
  }

  if (roleName === 'CASHIER' && action.startsWith('pos:')) {
    return session;
  }

  throw new Error(`Unauthorized Access: ${roleName} does not have permission for ${action}`);
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  
  if (session.employee.role.name !== 'Admin' && session.employee.role.name !== 'Super Admin') {
    throw new Error('Unauthorized Access: Super Admin required');
  }
  
  return session;
}

export async function getEmployeePermissions(employeeId: string): Promise<string[]> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { roleId: true }
  });

  const rolePermissions = employee?.roleId ? await prisma.role.findUnique({
    where: { id: employee.roleId },
    include: { permissions: { include: { permission: true } } }
  }) : null;

  let allowed = new Set<string>(
    rolePermissions?.permissions.map(p => p.permission.action) || []
  );

  const overrides = await prisma.employeePermission.findMany({
    where: { employeeId },
    include: { permission: true }
  });

  const now = new Date();

  // Apply explicit DENY overrides
  for (const o of overrides) {
    if (o.effect === 'DENY') {
      allowed.delete(o.permission.action);
    }
  }

  // Apply explicit ALLOW overrides (if not expired)
  for (const o of overrides) {
    if (o.effect === 'ALLOW' && (!o.expiresAt || o.expiresAt > now)) {
      allowed.add(o.permission.action);
    }
  }

  return Array.from(allowed);
}
