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
  const roleName = session.employee.role.name.trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (roleName === 'ADMIN' || roleName === 'SUPER ADMIN' || roleName === 'أدمن رئيسي' || roleName === 'ادمن رئيسي') {
    return session;
  }

  if (roleName === 'CASHIER' && action.startsWith('pos:')) {
    return session;
  }

  if ((roleName === 'أدمن تشغيلي' || roleName === 'ادمن تشغيلي') && (action.startsWith('manage:orders') || action.startsWith('orders.'))) {
    return session;
  }

  const aliases: Record<string, string[]> = {
    manage_orders: ['manage:orders'],
    'orders.confirm': ['manage:orders'],
  };
  const granted = await getEmployeePermissions(session.employeeId);
  if ([action, ...(aliases[action] || [])].some(permission => granted.includes(permission))) return session;

  throw new Error(`Unauthorized Access: ${roleName} does not have permission for ${action}`);
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  
  const roleName = session.employee.role.name.trim().toUpperCase().replace(/[_-]+/g, ' ');
  if (roleName !== 'ADMIN' && roleName !== 'SUPER ADMIN' && roleName !== 'أدمن رئيسي' && roleName !== 'ادمن رئيسي') {
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
    if (o.effect === 'DENY' && (!o.expiresAt || o.expiresAt > now)) {
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
