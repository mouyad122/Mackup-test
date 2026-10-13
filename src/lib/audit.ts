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

    // Cleanup logs older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Non-blocking cleanup
    prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    }).catch(console.error);

  } catch (error) {
    console.error('Failed to log action:', error);
  }
}
