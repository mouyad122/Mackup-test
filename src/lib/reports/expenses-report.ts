import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface ExpensesReportFilter {
  category?: string;
  from?: Date;
  to?: Date;
  isDetailed?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  PACKAGING: 'مواد التعبئة والتغليف والكراتين',
  MARKETING: 'إعلانات وحملات تسويقية رقمية',
  SOFTWARE: 'برمجيات وخوادم ورسائل WhatsApp API',
  SALARIES: 'رواتب وبدل مواصلات ومكافآت العمل',
  OPERATIONS: 'لوجستيات المستودع والمناولة',
  MISC: 'ضيافة ونثريات ومشتريات مكتبية',
  MAINTENANCE: 'صيانة ومعدات ومصاريف بنكية',
  OTHER: 'مصروفات تشغيلية أخرى',
};

export interface ExpensesReportSummary {
  totalCount: number;
  totalAmountFils: number;
  categoryBreakdown: { category: string; amountFils: number; percentage: string }[];
}

export interface ExpensesReportRow {
  date: string;
  category: string;
  description: string;
  reference: string;
  amountFils: number;
  recordedBy: string;
}

export interface ExpensesReportResult {
  reportTitle: string;
  department: 'EXPENSES';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: ExpensesReportSummary;
  columns: string[];
  rows: string[][];
  rawRows?: ExpensesReportRow[];
}

/**
 * تقرير المصروفات التشغيلية المعتمدة:
 * يحتوي على: سندات الصرف، تصنيفاتها المحاسبية، قيمها، شروحاتها، وتواريخها، وهوية الموظف المسؤول.
 * محجوب برمجياً تماماً: تفاصيل زبائن أو محلات غير ذات علاقة بسند الصرف.
 */
export async function generateExpensesReport(filter: ExpensesReportFilter = {}): Promise<ExpensesReportResult> {
  const dateFilter = filter.from || filter.to ? {
    expenseDate: {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    },
  } : {};

  const [expenses, employees] = await Promise.all([
    prisma.expense.findMany({
      where: {
        ...dateFilter,
        ...(filter.category ? { category: filter.category } : {}),
      },
      orderBy: { expenseDate: 'desc' },
    }),
    prisma.employee.findMany({ select: { id: true, name: true } }),
  ]);

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  let totalAmountFils = 0;
  const categoryMap: Record<string, number> = {};
  const rawRows: ExpensesReportRow[] = [];

  for (const exp of expenses) {
    totalAmountFils += exp.amount;
    const catName = CATEGORY_LABELS[exp.category] || exp.category;
    categoryMap[catName] = (categoryMap[catName] || 0) + exp.amount;

    rawRows.push({
      date: new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(exp.expenseDate),
      category: catName,
      description: exp.description || 'مصروف تشغيلي عام',
      reference: exp.reference || 'سند صرف داخلي',
      amountFils: exp.amount,
      recordedBy: exp.createdByEmployeeId ? employeeMap.get(exp.createdByEmployeeId) || 'النظام' : 'النظام',
    });
  }

  const categoryBreakdown = Object.entries(categoryMap).map(([category, amountFils]) => {
    const pct = totalAmountFils > 0 ? Math.round((amountFils / totalAmountFils) * 100) : 0;
    return {
      category,
      amountFils,
      percentage: `${pct}%`,
    };
  });

  const isDetailed = filter.isDetailed ?? true;

  const columns = isDetailed
    ? ['التاريخ والوقت', 'التصنيف المحاسبي', 'البيان والشرح التفصيلي', 'المرجع / السند', 'المبلغ بالدينار (د.أ)', 'المسؤول']
    : ['التصنيف التشغيلي', 'إجمالي المصروف', 'النسبة المئوية'];

  const rows = isDetailed
    ? rawRows.map(r => [
        r.date,
        r.category,
        r.description,
        r.reference,
        filsToDisplay(r.amountFils),
        r.recordedBy,
      ])
    : categoryBreakdown.map(c => [
        c.category,
        filsToDisplay(c.amountFils),
        c.percentage,
      ]);

  return {
    reportTitle: isDetailed ? 'تقرير المصروفات التشغيلية المفصل · رَواق' : 'ملخص المصروفات التشغيلية حسب التصنيف · رَواق',
    department: 'EXPENSES',
    generatedAt: new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Amman' }).format(new Date()),
    filtersApplied: {
      ...(filter.category ? { 'التصنيف': CATEGORY_LABELS[filter.category] || filter.category } : {}),
      ...(filter.from ? { 'من تاريخ': filter.from.toLocaleDateString('en-GB') } : {}),
      ...(filter.to ? { 'إلى تاريخ': filter.to.toLocaleDateString('en-GB') } : {}),
    },
    isDetailed,
    summary: {
      totalCount: expenses.length,
      totalAmountFils,
      categoryBreakdown,
    },
    columns,
    rows,
    rawRows,
  };
}
