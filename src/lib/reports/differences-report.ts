import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface DifferencesReportFilter {
  status?: string;
  entityType?: string;
  from?: Date;
  to?: Date;
  isDetailed?: boolean;
}

export interface DifferencesReportResult {
  reportTitle: string;
  department: 'DIFFERENCES';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: {
    totalCount: number;
    openCount: number;
    resolvedCount: number;
    writtenOffCount: number;
    totalDifferenceFils: number;
    openDifferenceFils: number;
    resolvedDifferenceFils: number;
  };
  columns: string[];
  rows: string[][];
  rawRows?: any[];
}

const CATEGORY_MAP: Record<string, string> = {
  REMITTANCE_SHORTAGE: 'نقص في التوريد المصرح به',
  UNAUTHORIZED_FEE: 'رسوم إضافية غير معتمدة',
  PRICE_MISMATCH: 'اختلاف في المبلغ المحصل من الزبون',
  RETURN_FAILED_DELIVERY: 'مرتجع أو فشل تسليم معلق',
  INPUT_ERROR: 'خطأ في الإدخال أو كشف الشركة',
  OTHER: 'سبب مالي آخر',
};

const STATUS_MAP: Record<string, string> = {
  OPEN: 'معلق / بانتظار المعالجة',
  RESOLVED: 'تمت التسوية والمعالجة',
  WRITTEN_OFF: 'إسقاط إداري معتمد',
};

export async function generateDifferencesReport(
  filter: DifferencesReportFilter = {}
): Promise<DifferencesReportResult> {
  const dateFilter =
    filter.from || filter.to
      ? {
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {};

  const diffs = await prisma.reconciliationDifference.findMany({
    where: {
      ...dateFilter,
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });

  let totalCount = 0;
  let openCount = 0;
  let resolvedCount = 0;
  let writtenOffCount = 0;
  let totalDifferenceFils = 0;
  let openDifferenceFils = 0;
  let resolvedDifferenceFils = 0;

  const rawRows: any[] = [];

  for (const d of diffs) {
    totalCount++;
    totalDifferenceFils += Math.abs(d.differenceAmount);

    if (d.status === 'OPEN') {
      openCount++;
      openDifferenceFils += d.differenceAmount;
    } else if (d.status === 'RESOLVED') {
      resolvedCount++;
      resolvedDifferenceFils += d.differenceAmount;
    } else if (d.status === 'WRITTEN_OFF') {
      writtenOffCount++;
    }

    rawRows.push({
      reference: d.reference,
      entityName: d.entityName || d.entityType,
      entityType: d.entityType,
      reason: d.notes || CATEGORY_MAP[d.reasonCategory] || d.reasonCategory,
      expectedAmountFils: d.expectedAmount,
      actualAmountFils: d.actualAmount,
      differenceAmountFils: d.differenceAmount,
      status: STATUS_MAP[d.status] || d.status,
      resolutionNotes: d.resolutionNotes || '—',
      date: new Intl.DateTimeFormat('en-GB', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Asia/Amman',
      }).format(d.createdAt),
    });
  }

  const isDetailed = filter.isDetailed ?? true;

  const columns = isDetailed
    ? [
        'المرجع',
        'الجهة المعنية',
        'سبب الفرق / التصنيف',
        'المبلغ المتوقع',
        'المبلغ الفعلي',
        'قيمة الفرق',
        'الحالة',
        'ملاحظات المعالجة',
        'التاريخ',
      ]
    : ['المؤشر المالي للفروقات', 'القيمة المعتمدة'];

  const rows = isDetailed
    ? rawRows.map(r => [
        r.reference,
        r.entityName,
        r.reason,
        filsToDisplay(r.expectedAmountFils),
        filsToDisplay(r.actualAmountFils),
        filsToDisplay(r.differenceAmountFils),
        r.status,
        r.resolutionNotes,
        r.date,
      ])
    : [
        ['إجمالي عدد الفروقات المسجلة', totalCount.toString()],
        ['فروقات معلقة بانتظار المعالجة', openCount.toString()],
        ['فروقات تمت تسويتها ومعالجتها', resolvedCount.toString()],
        ['فروقات أسقطت بقرار إداري موثق', writtenOffCount.toString()],
        ['إجمالي مبالغ الفروقات التاريخية', filsToDisplay(totalDifferenceFils)],
        ['صافي الفروقات المفتوحة حالياً', filsToDisplay(openDifferenceFils)],
        ['صافي الفروقات المسواة', filsToDisplay(resolvedDifferenceFils)],
      ];

  return {
    reportTitle: isDetailed
      ? 'كشف الفروقات المالية وحالات المعالجة المفصل'
      : 'ملخص الفروقات المالية المعتمد',
    department: 'DIFFERENCES',
    generatedAt: new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Amman',
    }).format(new Date()),
    filtersApplied: {
      ...(filter.status ? { الحالة: STATUS_MAP[filter.status] || filter.status } : {}),
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    summary: {
      totalCount,
      openCount,
      resolvedCount,
      writtenOffCount,
      totalDifferenceFils,
      openDifferenceFils,
      resolvedDifferenceFils,
    },
    columns,
    rows,
    rawRows,
  };
}
