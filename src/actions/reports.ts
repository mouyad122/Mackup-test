'use server';

import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';
import { revalidatePath } from 'next/cache';
import { randomBytes, createHash } from 'crypto';
import { generateDeliveryReport } from '@/lib/reports/delivery-report';
import { generateSupplierReport } from '@/lib/reports/supplier-report';
import { generateExpensesReport } from '@/lib/reports/expenses-report';
import { generateDifferencesReport } from '@/lib/reports/differences-report';
import { generateSettlementsReport } from '@/lib/reports/settlements-report';
import { generateFinancialSummaryReport } from '@/lib/reports/financial-summary-report';

export interface IssueOfficialReportInput {
  department: 'DELIVERY' | 'SUPPLIER' | 'EXPENSES' | 'DIFFERENCES' | 'SETTLEMENTS' | 'FINANCIAL_SUMMARY';
  reportTitle: string;
  targetEntityName?: string;
  periodFrom?: string;
  periodTo?: string;
  isDetailed: boolean;
  summaryPayload: any;
  dataPayload: {
    columns: string[];
    rows: (string | number)[][];
    metadata?: any;
  };
  filterPayload?: any;
}

/**
 * توليد الرقم المرجعي التسلسلي الرسمي للتقرير
 * الصيغة: RPT-YYYY-XXXX (مثال: RPT-2026-0001)
 */
async function generateNextReportReference(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `RPT-${currentYear}-`;

  const latest = await prisma.officialReport.findFirst({
    where: {
      reference: {
        startsWith: prefix,
      },
    },
    orderBy: { reference: 'desc' },
    select: { reference: true },
  });

  let nextSeq = 1;
  if (latest?.reference) {
    const parts = latest.reference.split('-');
    const lastNum = parseInt(parts[2], 10);
    if (!isNaN(lastNum)) {
      nextSeq = lastNum + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * جلب بيانات التقرير المباشرة من المولدات المعزولة
 */
export async function fetchReportDataAction(params: {
  department: string;
  filter?: any;
}) {
  await requirePermission('manage:settings');

  const { department, filter = {} } = params;
  const normalizedFilter = {
    ...filter,
    from: filter.from ? new Date(filter.from) : undefined,
    to: filter.to ? new Date(filter.to) : undefined,
  };

  switch (department) {
    case 'DELIVERY':
      return await generateDeliveryReport(normalizedFilter);
    case 'SUPPLIER':
      return await generateSupplierReport(normalizedFilter);
    case 'EXPENSES':
      return await generateExpensesReport(normalizedFilter);
    case 'DIFFERENCES':
      return await generateDifferencesReport(normalizedFilter);
    case 'SETTLEMENTS':
      return await generateSettlementsReport(normalizedFilter);
    case 'FINANCIAL_SUMMARY':
      return await generateFinancialSummaryReport(normalizedFilter);
    default:
      throw new Error(`قسم التقرير غير معروف: ${department}`);
  }
}

/**
 * اعتماد وأرشفة التقرير رسمياً في قاعدة البيانات
 * يتم تجميد البيانات والختم واسم المسؤول وتاريخ الاعتماد بشكل نهائي غير قابل للتعديل
 */
export async function issueAndArchiveReportAction(input: IssueOfficialReportInput) {
  const session = await requirePermission('manage:settings');

  const reference = await generateNextReportReference();
  const verificationToken = randomBytes(16).toString('hex');

  // حساب بصمة SHA-256 للتقرير النهائي بعد تجميد كافة البيانات والختم والمسؤول
  const payloadToHash = JSON.stringify({
    reference,
    department: input.department,
    reportTitle: input.reportTitle,
    targetEntityName: input.targetEntityName || null,
    periodFrom: input.periodFrom || null,
    periodTo: input.periodTo || null,
    summary: input.summaryPayload,
    data: input.dataPayload,
    issuedBy: session.employee.name,
    approvedBy: session.employee.name,
    seal: '/brand/rawaq_official_seal.svg',
  });
  const sha256Hash = createHash('sha256').update(payloadToHash).digest('hex');

  const report = await prisma.$transaction(async (tx) => {
    const created = await tx.officialReport.create({
      data: {
        reference,
        department: input.department,
        reportTitle: input.reportTitle,
        targetEntityName: input.targetEntityName || null,
        periodFrom: input.periodFrom ? new Date(input.periodFrom) : null,
        periodTo: input.periodTo ? new Date(input.periodTo) : null,
        isDetailed: input.isDetailed,
        status: 'APPROVED',
        summaryPayload: input.summaryPayload,
        dataPayload: input.dataPayload,
        filterPayload: input.filterPayload || null,
        sealUrlSnapshot: '/brand/rawaq_official_seal.svg',
        issuedByEmployeeId: session.employeeId,
        issuedByEmployeeName: session.employee.name,
        issuedByEmployeeRole: session.employee.role.name,
        approvedByEmployeeId: session.employeeId,
        approvedByEmployeeName: session.employee.name,
        approvedAt: new Date(),
        verificationToken,
        sha256Hash,
      },
    });

    await tx.auditLog.create({
      data: {
        employeeId: session.employeeId,
        action: 'OFFICIAL_REPORT_ISSUED_AND_APPROVED',
        entityType: 'OfficialReport',
        entityId: created.id,
        details: JSON.stringify({
          reference,
          sha256Hash,
          department: input.department,
          reportTitle: input.reportTitle,
        }),
      },
    });

    return created;
  });

  revalidatePath('/admin/reconciliation');

  return {
    success: true,
    reference: report.reference,
    id: report.id,
    report,
  };
}

/**
 * جلب سجلات الأرشيف للتقارير المعتمدة
 */
export async function getArchivedReportsAction(filters?: {
  department?: string;
  search?: string;
  limit?: number;
}) {
  await requirePermission('manage:settings');

  const where: any = {};
  if (filters?.department && filters.department !== 'ALL') {
    where.department = filters.department;
  }
  if (filters?.search && filters.search.trim()) {
    const s = filters.search.trim();
    where.OR = [
      { reference: { contains: s, mode: 'insensitive' } },
      { reportTitle: { contains: s, mode: 'insensitive' } },
      { targetEntityName: { contains: s, mode: 'insensitive' } },
      { issuedByEmployeeName: { contains: s, mode: 'insensitive' } },
    ];
  }

  const reports = await prisma.officialReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters?.limit || 50,
  });

  return reports;
}

/**
 * جلب تفاصيل تقرير مؤرشف محدد بالرقم المرجعي
 */
export async function getArchivedReportByReferenceAction(reference: string) {
  await requirePermission('manage:settings');

  const report = await prisma.officialReport.findUnique({
    where: { reference },
  });

  return report;
}
