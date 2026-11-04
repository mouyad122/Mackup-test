import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';
import { AuditLogsClient, AuditLogItem } from './AuditLogsClient';
import { inferCategory, inferSeverity } from '@/lib/audit';

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requirePermission('manage:settings');
  const params = await searchParams;

  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const severity = typeof params.severity === 'string' ? params.severity : '';
  const outcome = typeof params.outcome === 'string' ? params.outcome : '';
  const employeeId = typeof params.employeeId === 'string' ? params.employeeId : '';
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  const limit = 30;

  // توقيت بداية اليوم في الأردن (UTC+3)
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

  // استعلام السجلات الأساسية من قاعدة البيانات
  const baseWhere: any = {};
  if (employeeId) baseWhere.employeeId = employeeId;
  if (q) {
    baseWhere.OR = [
      { action: { contains: q, mode: 'insensitive' } },
      { entityId: { contains: q, mode: 'insensitive' } },
      { employee: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [employees, rawLogs] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.auditLog.findMany({
      where: baseWhere,
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
  ]);

  // تصنيف وتجهيز السجلات بالكامل وتحديد الأقسام والدرجات
  const resolvedLogs = rawLogs.map(log => {
    let parsedChanges = null;
    let parsedDetails = null;

    if (log.changes) {
      try {
        parsedChanges = JSON.parse(log.changes);
      } catch {
        parsedChanges = log.changes;
      }
    }

    if (log.details) {
      try {
        parsedDetails = JSON.parse(log.details);
      } catch {
        parsedDetails = log.details;
      }
    }

    const resolvedCategory = log.category || inferCategory(log.action, log.entityType);
    const resolvedSeverity = log.severity || inferSeverity(log.action, (log.outcome as any) || 'SUCCESS');
    const resolvedOutcome = log.outcome || 'SUCCESS';
    const resolvedActorType = log.actorType || (log.employeeId ? 'ADMIN' : 'SYSTEM');
    const resolvedActorName = log.actorNameSnapshot || log.employee?.name || (resolvedActorType === 'ADMIN' ? 'مدير النظام' : 'النظام الآلي');

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      employeeId: log.employeeId,
      employeeName: log.employee?.name || null,
      actorType: resolvedActorType,
      actorId: log.actorId,
      actorNameSnapshot: resolvedActorName,
      category: resolvedCategory,
      severity: resolvedSeverity,
      outcome: resolvedOutcome,
      eventKey: log.eventKey,
      requestId: log.requestId,
      correlationId: log.correlationId,
      reason: log.reason,
      changes: parsedChanges,
      details: parsedDetails,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      rawCreatedAt: log.createdAt,
    };
  });

  // حساب مؤشرات اليوم بدقة
  const todayLogs = resolvedLogs.filter(l => l.rawCreatedAt >= startOfToday);
  const todayTotal = todayLogs.length;
  const todayCritical = todayLogs.filter(l => l.severity === 'CRITICAL' || l.severity === 'HIGH').length;
  const todayDenied = todayLogs.filter(l => l.outcome === 'DENIED').length;

  // تطبيق الفلترة الصارمة على السجلات
  const filteredLogs = resolvedLogs.filter(l => {
    // 1. فلتر القسم التشغيلي
    if (category && l.category !== category) return false;

    // 2. فلتر درجة الأهمية
    if (severity) {
      if (severity === 'CRITICAL' && l.severity !== 'CRITICAL') return false;
      if (severity === 'HIGH' && l.severity !== 'HIGH' && l.severity !== 'CRITICAL') return false;
      if (severity === 'NORMAL' && l.severity !== 'NORMAL') return false;
    }

    // 3. فلتر نتيجة العملية
    if (outcome && l.outcome !== outcome) return false;

    // 4. فلتر البحث النصي الإضافي (يشمل المرجع والسبب واسم المنفذ)
    if (q) {
      const qLower = q.toLowerCase();
      const match =
        l.action.toLowerCase().includes(qLower) ||
        l.entityId.toLowerCase().includes(qLower) ||
        (l.correlationId && l.correlationId.toLowerCase().includes(qLower)) ||
        (l.reason && l.reason.toLowerCase().includes(qLower)) ||
        (l.actorNameSnapshot && l.actorNameSnapshot.toLowerCase().includes(qLower)) ||
        (l.employeeName && l.employeeName.toLowerCase().includes(qLower));
      if (!match) return false;
    }

    return true;
  });

  const totalMatching = filteredLogs.length;
  const totalPages = Math.ceil(totalMatching / limit) || 1;
  const paginatedLogs: AuditLogItem[] = filteredLogs
    .slice((page - 1) * limit, page * limit)
    .map(({ rawCreatedAt, ...item }) => item);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-ivory-100)] md:flex-row" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session.employee.role.name} />

      <main className="min-w-0 max-w-full w-full flex-1 p-4 md:p-8 font-sans max-w-7xl mx-auto space-y-6">
        <AuditLogsClient
          logs={paginatedLogs}
          employees={employees}
          stats={{
            todayTotal,
            todayCritical,
            todayDenied,
            totalMatching,
          }}
          pagination={{
            page,
            totalPages,
            limit,
          }}
        />
      </main>
    </div>
  );
}
