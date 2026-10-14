import { prisma } from './db';

export async function logAction(
  employeeId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        employeeId,
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : null,
      },
    });

  } catch (error) {
    console.error('Failed to log action:', error);
  }
}
