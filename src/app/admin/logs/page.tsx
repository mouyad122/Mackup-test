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

  const view = typeof params.view === 'string' ? params.view : 'all';
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const severity = typeof params.severity === 'string' ? params.severity : '';
  const outcome = typeof params.outcome === 'string' ? params.outcome : '';
  const employeeId = typeof params.employeeId === 'string' ? params.employeeId : '';
  const shortcut = typeof params.shortcut === 'string' ? params.shortcut : '';
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1);
  const limit = 30;

  // توقيت بداية اليوم في الأردن (UTC+3)
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

  const [employees, rawLogs] = await Promise.all([
    prisma.employee.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    prisma.auditLog.findMany({
      include: { employee: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3000,
    }),
  ]);

  // تصنيف وتجهيز السجلات بالكامل واستخراج تفاصيل القصة الإجرائية (Narrative Extraction)
  const resolvedLogs = rawLogs.map((log) => {
    let parsedChanges: any = null;
    let parsedDetails: any = null;

    if (log.changes) {
      try {
        parsedChanges = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;
      } catch {
        parsedChanges = log.changes;
      }
    }

    if (log.details) {
      try {
        parsedDetails = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
      } catch {
        parsedDetails = log.details;
      }
    }

    const resolvedCategory = log.category || inferCategory(log.action, log.entityType);
    const resolvedSeverity = log.severity || inferSeverity(log.action, (log.outcome as any) || 'SUCCESS');
    const resolvedOutcome = log.outcome || 'SUCCESS';
    const resolvedActorType = log.actorType || (log.employeeId ? 'ADMIN' : 'SYSTEM');
    const resolvedActorName =
      log.actorNameSnapshot ||
      log.employee?.name ||
      (resolvedActorType === 'ADMIN' ? 'مدير النظام' : resolvedActorType === 'COURIER' ? 'شركة التوصيل' : 'النظام الآلي');

    // استخراج اسم العميل / الزبونة إذا وجد
    const customerName =
      parsedChanges?.customerName ||
      parsedDetails?.customerName ||
      parsedDetails?.customer ||
      null;

    // استخراج المبلغ المالي إن وجد
    const amountVal =
      parsedChanges?.totalAmount ??
      parsedDetails?.totalAmount ??
      parsedChanges?.amount ??
      parsedDetails?.amount ??
      parsedChanges?.collectedCodAmount ??
      null;

    const amountFormatted =
      amountVal !== null && amountVal !== undefined && !isNaN(Number(amountVal))
        ? (Number(amountVal) / (Number(amountVal) > 500 ? 1000 : 1)).toFixed(3)
        : null;

    // استخراج عدد الأصناف أو ملخص المنتجات
    const itemsCount =
      parsedChanges?.itemsCount ??
      parsedDetails?.itemsCount ??
      (Array.isArray(parsedChanges?.items) ? parsedChanges.items.length : null);

    // استخراج السبب المعتمد
    const effectiveReason =
      log.reason ||
      parsedChanges?.reason ||
      parsedDetails?.reason ||
      parsedDetails?.issueReason ||
      null;

    // استخراج تحول الحالة السابق والجديد
    const statusBefore =
      parsedChanges?.status?.before ||
      parsedChanges?.previousStatus ||
      null;

    const statusAfter =
      parsedChanges?.status?.after ||
      parsedChanges?.status ||
      parsedChanges?.nextStatus ||
      null;

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
      reason: effectiveReason,
      changes: parsedChanges,
      details: parsedDetails,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
      rawCreatedAt: log.createdAt,
      customerName,
      amountFormatted,
      itemsCount,
      statusBefore,
      statusAfter,
    };
  });

  // حساب إحصائيات اليوم العامة
  const todayLogs = resolvedLogs.filter((l) => l.rawCreatedAt >= startOfToday);
  const todayTotal = todayLogs.length;
  const todayCritical = todayLogs.filter((l) => l.severity === 'CRITICAL' || l.severity === 'HIGH').length;
  const todayDenied = todayLogs.filter((l) => l.outcome === 'DENIED' || l.outcome === 'FAILED').length;

  // إحصائيات المناظر الثلاثة الرئيسية (Top 3 Views)
  const viewCounts = {
    all: resolvedLogs.length,
    needsAction: resolvedLogs.filter(
      (l) => l.outcome === 'FAILED' || l.outcome === 'DENIED' || (l.severity === 'CRITICAL' && l.outcome !== 'SUCCESS')
    ).length,
    sensitive: resolvedLogs.filter(
      (l) => l.severity === 'CRITICAL' || l.category === 'ACCOUNTING' || l.category === 'SECURITY'
    ).length,
  };

  // تصفية المناظر الثلاثة أولاً لحساب أعداد الفئات تحت المنظر المختار
  let logsInView = resolvedLogs;
  if (view === 'needs_action') {
    logsInView = resolvedLogs.filter(
      (l) => l.outcome === 'FAILED' || l.outcome === 'DENIED' || (l.severity === 'CRITICAL' && l.outcome !== 'SUCCESS')
    );
  } else if (view === 'sensitive') {
    logsInView = resolvedLogs.filter(
      (l) => l.severity === 'CRITICAL' || l.category === 'ACCOUNTING' || l.category === 'SECURITY'
    );
  }

  // حساب أعداد السجلات في الأقسام السبعة المعتمدة
  const categoryCounts: Record<string, number> = {
    ORDERS: logsInView.filter((l) => l.category === 'ORDERS').length,
    SUPPLIERS: logsInView.filter((l) => l.category === 'SUPPLIERS').length,
    DELIVERY: logsInView.filter((l) => l.category === 'DELIVERY').length,
    ACCOUNTING: logsInView.filter((l) => l.category === 'ACCOUNTING').length,
    REPORTS: logsInView.filter((l) => l.category === 'REPORTS').length,
    PRODUCTS: logsInView.filter((l) => l.category === 'PRODUCTS').length,
    SECURITY: logsInView.filter((l) => l.category === 'SECURITY').length,
  };

  // تطبيق فلاتر البحث والقسم والدرجة والنتيجة
  const filteredLogs = logsInView.filter((l) => {
    // 1. فلتر القسم التشغيلي
    if (category && l.category !== category) return false;

    // 2. فلتر الاختصارات السريعة (Quick Shortcuts)
    if (shortcut === 'cancellations_today') {
      const isCancellation =
        l.category === 'ORDERS' &&
        (l.action.includes('CANCEL') || l.statusAfter === 'CANCELLED');
      const isToday = l.rawCreatedAt >= startOfToday;
      if (!isCancellation || !isToday) return false;
    } else if (shortcut === 'price_changes') {
      const isPrice =
        l.action.includes('PRIC') ||
        l.action.includes('PRODUCT') ||
        (l.changes && ('price' in l.changes || 'retailPrice' in l.changes || 'costPrice' in l.changes));
      if (!isPrice) return false;
    } else if (shortcut === 'financial_payouts') {
      const isFinancial =
        l.category === 'ACCOUNTING' ||
        l.action.includes('SETTLEMENT') ||
        l.action.includes('COD') ||
        l.action.includes('PAYMENT');
      if (!isFinancial) return false;
    } else if (shortcut === 'failed_ops') {
      if (l.outcome !== 'FAILED' && l.outcome !== 'DENIED') return false;
    } else if (shortcut === 'permissions') {
      const isSecurity =
        l.category === 'SECURITY' ||
        l.action.includes('PERMISSION') ||
        l.action.includes('EMPLOYEE') ||
        l.action.includes('ROLE');
      if (!isSecurity) return false;
    }

    // 3. فلتر درجة الأهمية
    if (severity) {
      if (severity === 'CRITICAL' && l.severity !== 'CRITICAL') return false;
      if (severity === 'HIGH' && l.severity !== 'HIGH') return false;
      if (severity === 'NORMAL' && l.severity !== 'NORMAL') return false;
    }

    // 4. فلتر نتيجة العملية
    if (outcome && l.outcome !== outcome) return false;

    // 5. فلتر الموظف
    if (employeeId && l.employeeId !== employeeId && l.actorId !== employeeId) return false;

    // 6. فلتر البحث النصي الشامل
    if (q) {
      const qLower = q.toLowerCase();
      const stringChanges = typeof l.changes === 'object' ? JSON.stringify(l.changes).toLowerCase() : '';
      const stringDetails = typeof l.details === 'object' ? JSON.stringify(l.details).toLowerCase() : '';

      const match =
        l.action.toLowerCase().includes(qLower) ||
        l.entityId.toLowerCase().includes(qLower) ||
        (l.correlationId && l.correlationId.toLowerCase().includes(qLower)) ||
        (l.reason && l.reason.toLowerCase().includes(qLower)) ||
        (l.actorNameSnapshot && l.actorNameSnapshot.toLowerCase().includes(qLower)) ||
        (l.employeeName && l.employeeName.toLowerCase().includes(qLower)) ||
        (l.customerName && l.customerName.toLowerCase().includes(qLower)) ||
        stringChanges.includes(qLower) ||
        stringDetails.includes(qLower);

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
          activeView={view}
          activeCategory={category}
          activeShortcut={shortcut}
          viewCounts={viewCounts}
          categoryCounts={categoryCounts}
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
