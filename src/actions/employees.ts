'use server';

import { prisma } from '@/lib/db';
import { requirePermission, requireSuperAdmin } from '@/lib/dal';
import * as argon2 from 'argon2';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function createEmployee(data: {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  isActive: boolean;
  selectedPermissionIds: string[];
  bootstrapAdminId: string; // The performing employee (Admin)
}) {
  try {
    const session = await requireSuperAdmin();

    const existing = await prisma.employee.findUnique({
      where: { email: data.email }
    });
    if (existing) {
      return { success: false, error: 'البريد الإلكتروني مسجل بالفعل' };
    }

    // Default password if not provided
    const password = data.password || 'Dhb-Staff!' + crypto.randomBytes(3).toString('hex');
    const passwordHash = await argon2.hash(password);

    const employee = await prisma.employee.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        roleId: data.roleId,
        isActive: data.isActive,
        mustChangePassword: true,
        bootstrapCredential: true
      }
    });

    // Save custom checkbox permissions
    if (data.selectedPermissionIds.length > 0) {
      await prisma.employeePermission.createMany({
        data: data.selectedPermissionIds.map((pId) => ({
          employeeId: employee.id,
          permissionId: pId,
          grantedByEmployeeId: data.bootstrapAdminId,
          effect: 'ALLOW',
          reason: 'Direct Admin Assignment'
        }))
      });
    }

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    // Write audit log
    await prisma.auditLog.create({
      data: {
        employeeId: data.bootstrapAdminId,
        action: 'EMPLOYEE_CREATED',
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress,
        details: JSON.stringify({ name: data.name, email: data.email, roleId: data.roleId })
      }
    });

    revalidatePath('/admin/employees');
    return { success: true, employeeId: employee.id, generatedPassword: password };
  } catch (error: any) {
    return { success: false, error: 'حدث خطأ أثناء حفظ البيانات' };
  }
}

export async function updateEmployee(data: {
  id: string;
  name: string;
  email: string;
  roleId: string;
  isActive: boolean;
  password?: string;
  selectedPermissionIds: string[];
  adminId: string;
}) {
  try {
    const session = await requireSuperAdmin();

    const targetEmployee = await prisma.employee.findUnique({
      where: { id: data.id },
      include: { role: true }
    });

    // Protect against disabling/removing last active Admin
    if (targetEmployee?.role.name === 'Admin' && targetEmployee.isActive) {
      const activeAdminsCount = await prisma.employee.count({
        where: {
          role: { name: 'Admin' },
          isActive: true,
          id: { not: data.id }
        }
      });
      if (activeAdminsCount === 0 && !data.isActive) {
        return { success: false, error: 'لا يمكن تعطيل آخر مدير نشط في النظام لحماية الإدارة' };
      }
    }

    const dataToUpdate: any = {
      name: data.name,
      email: data.email,
      roleId: data.roleId,
      isActive: data.isActive
    };

    if (data.password) {
      dataToUpdate.passwordHash = await argon2.hash(data.password);
    }

    // Update Employee
    await prisma.employee.update({
      where: { id: data.id },
      data: dataToUpdate
    });

    // Re-sync custom permissions
    await prisma.employeePermission.deleteMany({
      where: { employeeId: data.id }
    });

    if (data.selectedPermissionIds.length > 0) {
      await prisma.employeePermission.createMany({
        data: data.selectedPermissionIds.map((pId) => ({
          employeeId: data.id,
          permissionId: pId,
          grantedByEmployeeId: data.adminId,
          effect: 'ALLOW',
          reason: 'Direct Admin Assignment'
        }))
      });
    }

    // Revoke employee sessions if disabled or permissions changed
    await prisma.session.deleteMany({
      where: { employeeId: data.id }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    // Write audit log
    await prisma.auditLog.create({
      data: {
        employeeId: data.adminId,
        action: 'EMPLOYEE_UPDATED',
        entityType: 'Employee',
        entityId: data.id,
        ipAddress,
        details: JSON.stringify({ name: data.name, email: data.email })
      }
    });

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'حدث خطأ أثناء تحديث البيانات' };
  }
}

export async function addEmployeePermissionOverride(data: {
  employeeId: string;
  permissionId: string;
  effect: 'ALLOW' | 'DENY';
  reason: string;
  expiresInMinutes?: number;
  adminId: string;
}) {
  try {
    const session = await requireSuperAdmin();

    const expiresAt = data.expiresInMinutes
      ? new Date(Date.now() + data.expiresInMinutes * 60 * 1000)
      : null;

    const override = await prisma.employeePermission.upsert({
      where: {
        employeeId_permissionId: {
          employeeId: data.employeeId,
          permissionId: data.permissionId
        }
      },
      update: {
        effect: data.effect,
        reason: data.reason,
        expiresAt,
        grantedByEmployeeId: data.adminId
      },
      create: {
        employeeId: data.employeeId,
        permissionId: data.permissionId,
        effect: data.effect,
        reason: data.reason,
        expiresAt,
        grantedByEmployeeId: data.adminId
      }
    });

    // Force session revocation
    await prisma.session.deleteMany({
      where: { employeeId: data.employeeId }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: data.adminId,
        action: 'PERMISSION_OVERRIDE_ADDED',
        entityType: 'EmployeePermission',
        entityId: `${data.employeeId}:${data.permissionId}`,
        ipAddress,
        details: JSON.stringify(data)
      }
    });

    return { success: true, override };
  } catch (error: any) {
    return { success: false, error: 'فشل إضافة صلاحية الاستثناء' };
  }
}

export async function toggleEmployeeStatus(employeeId: string, adminId: string) {
  try {
    const session = await requireSuperAdmin();

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true }
    });
    if (!employee) return { success: false, error: 'الموظف غير موجود' };

    const newActiveState = !employee.isActive;

    // Protect against disabling last active Admin
    if (employee.role.name === 'Admin' && employee.isActive && !newActiveState) {
      const activeAdminsCount = await prisma.employee.count({
        where: {
          role: { name: 'Admin' },
          isActive: true,
          id: { not: employeeId }
        }
      });
      if (activeAdminsCount === 0) {
        return { success: false, error: 'لا يمكن تعطيل آخر مدير نشط في النظام لحماية الإدارة' };
      }
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: { isActive: newActiveState }
    });

    // Revoke sessions
    await prisma.session.deleteMany({
      where: { employeeId }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: adminId,
        action: 'EMPLOYEE_STATUS_TOGGLED',
        entityType: 'Employee',
        entityId: employeeId,
        ipAddress,
        details: JSON.stringify({ email: employee.email, isActive: newActiveState })
      }
    });

    revalidatePath('/admin/employees');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل تعديل حالة الموظف' };
  }
}

export async function forcePasswordChange(employeeId: string, adminId: string) {
  try {
    const session = await requireSuperAdmin();
    await prisma.employee.update({
      where: { id: employeeId },
      data: { mustChangePassword: true }
    });

    // Revoke sessions
    await prisma.session.deleteMany({
      where: { employeeId }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: adminId,
        action: 'FORCE_PASSWORD_CHANGE',
        entityType: 'Employee',
        entityId: employeeId,
        ipAddress,
        details: null
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل إلزام تغيير كلمة المرور' };
  }
}

export async function getEmployeeSessions(employeeId: string) {
  try {
    await requirePermission('manage:settings');
    return await prisma.session.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' }
    });
  } catch {
    return [];
  }
}

export async function revokeEmployeeSession(sessionId: string, adminId: string) {
  try {
    const session = await requireSuperAdmin();
    const targetSession = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!targetSession) return { success: false, error: 'الجلسة غير موجودة' };

    await prisma.session.delete({
      where: { id: sessionId }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: adminId,
        action: 'SESSION_REVOKED',
        entityType: 'Session',
        entityId: sessionId,
        ipAddress,
        details: JSON.stringify({ employeeId: targetSession.employeeId })
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل إلغاء الجلسة' };
  }
}

export async function revokeAllEmployeeSessions(employeeId: string, adminId: string) {
  try {
    const session = await requireSuperAdmin();
    await prisma.session.deleteMany({
      where: { employeeId }
    });

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    await prisma.auditLog.create({
      data: {
        employeeId: adminId,
        action: 'ALL_SESSIONS_REVOKED',
        entityType: 'Employee',
        entityId: employeeId,
        ipAddress,
        details: null
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: 'فشل إلغاء كافة الجلسات' };
  }
}

export async function getActiveSessionPermissions() {
  const { getCurrentSession } = await import('@/lib/auth');
  const { getEmployeePermissions } = await import('@/lib/dal');
  const session = await getCurrentSession();
  if (!session) return [];
  return getEmployeePermissions(session.employeeId);
}

export async function deleteEmployee(employeeId: string, adminId: string) {
  try {
    const session = await requireSuperAdmin();

    // Prevent self-deletion
    if (employeeId === session.employeeId) {
      return { success: false, error: 'لا يمكنك حذف حسابك الشخصي المسجل به الدخول حالياً.' };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true }
    });
    if (!employee) return { success: false, error: 'الموظف غير موجود' };

    const roleName = employee.role.name.trim().toUpperCase().replace(/[_-]+/g, ' ');
    const isAdmin = ['ADMIN', 'SUPER ADMIN', 'أدمن رئيسي', 'ادمن رئيسي'].includes(roleName);

    if (isAdmin) {
      const activeAdminsCount = await prisma.employee.count({
        where: {
          role: { name: { in: ['Admin', 'Super Admin', 'أدمن رئيسي', 'ادمن رئيسي'] } },
          isActive: true,
          id: { not: employeeId }
        }
      });
      if (activeAdminsCount === 0) {
        return { success: false, error: 'لا يمكن حذف أو تعطيل آخر مدير رئيسي نشط في النظام' };
      }
    }

    const headersList = await (await import('next/headers')).headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';

    // فحص ما إذا كان الموظف لديه حركات مالية، مبيعات، ورديات، أو جلسات جرد سابقة
    const [salesCount, shiftsCount, movesCount, returnsCount, heldCount, countSessionCount] = await Promise.all([
      prisma.sale.count({ where: { OR: [{ employeeId }, { soldByEmployeeId: employeeId }] } }),
      prisma.shift.count({ where: { employeeId } }),
      prisma.inventoryMovement.count({ where: { employeeId } }),
      prisma.return.count({ where: { employeeId } }),
      prisma.heldSale.count({ where: { employeeId } }),
      prisma.inventoryCountSession.count({
        where: {
          OR: [
            { assignedEmployeeId: employeeId },
            { assignedByEmployeeId: employeeId },
            { reviewedByEmployeeId: employeeId },
            { approvedByEmployeeId: employeeId }
          ]
        }
      })
    ]);

    const hasFinancialOrInventoryHistory = (salesCount + shiftsCount + movesCount + returnsCount + heldCount + countSessionCount) > 0;

    if (hasFinancialOrInventoryHistory) {
      // إيقاف الحساب وتعطيل الجلسات بدلاً من الحذف الفيزيائي للحفاظ على النزاهة المحاسبية والتاريخ المالي
      await prisma.employee.update({
        where: { id: employeeId },
        data: { isActive: false }
      });
      await prisma.session.deleteMany({ where: { employeeId } });

      await prisma.auditLog.create({
        data: {
          employeeId: adminId,
          action: 'EMPLOYEE_DEACTIVATED_INSTEAD_OF_DELETE',
          entityType: 'Employee',
          entityId: employeeId,
          ipAddress,
          details: JSON.stringify({
            reason: 'Preserve financial, sales and inventory audit history',
            salesCount,
            shiftsCount,
            movesCount
          })
        }
      });

      revalidatePath('/admin/employees');
      return {
        success: true,
        deactivated: true,
        message: 'تم إيقاف وتعطيل حساب الموظف وإنهاء كافة جلساته بنجاح (تم الاحتفاظ ببياناته كحساب معطل لضمان سلامة السجلات المالية ومبيعات وحركات الجرد التاريخية المرتبطة به).'
      };
    }

    // إذا لم يكن لديه سجلات تاريخية، يتم حذف السجلات المؤقتة ثم حذف الحساب
    await prisma.$transaction([
      prisma.session.deleteMany({ where: { employeeId } }),
      prisma.loginAttempt.deleteMany({ where: { employeeId } }),
      prisma.employeePermission.deleteMany({ where: { employeeId } }),
      prisma.pendingMfaChallenge.deleteMany({ where: { employeeId } }),
      prisma.auditLog.deleteMany({ where: { employeeId } }),
      prisma.employee.delete({ where: { id: employeeId } })
    ]);

    await prisma.auditLog.create({
      data: {
        employeeId: adminId,
        action: 'EMPLOYEE_DELETED',
        entityType: 'Employee',
        entityId: employeeId,
        ipAddress,
        details: JSON.stringify({ email: employee.email, name: employee.name })
      }
    });

    revalidatePath('/admin/employees');
    return { success: true, message: 'تم حذف حساب الموظف نهائياً بنجاح.' };
  } catch (error: any) {
    console.error('Error in deleteEmployee:', error);
    if (error.code === 'P2003') {
      try {
        await prisma.employee.update({
          where: { id: employeeId },
          data: { isActive: false }
        });
        await prisma.session.deleteMany({ where: { employeeId } });
        revalidatePath('/admin/employees');
        return {
          success: true,
          deactivated: true,
          message: 'تم تعطيل حساب الموظف وإنهاء جلساته بنجاح للحفاظ على سلامة القيود والبيانات المرتبطة به.'
        };
      } catch (innerError) {
        return { success: false, error: 'لا يمكن حذف هذا الموظف لوجود بيانات مرتبطة به في النظام. يرجى استخدام زر التعطيل.' };
      }
    }
    return { success: false, error: error?.message || 'فشل حذف الموظف' };
  }
}

