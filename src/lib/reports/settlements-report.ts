import { prisma } from '@/lib/db';
import { filsToDisplay } from '@/lib/money';

export interface SettlementsReportFilter {
  entityType?: 'ALL' | 'DELIVERY' | 'SUPPLIER';
  from?: Date;
  to?: Date;
  isDetailed?: boolean;
}

export interface SettlementsReportSummary {
  totalCount: number;
  totalCodRemittedFils: number;
  totalSupplierPaidFils: number;
  netCashFlowFils: number;
}

export interface SettlementsReportRow {
  date: string;
  typeLabel: string;
  entityName: string;
  reference: string;
  direction: 'IN' | 'OUT';
  amountFils: number;
  description: string;
  recordedBy: string;
}

export interface SettlementsReportResult {
  reportTitle: string;
  department: 'SETTLEMENTS';
  generatedAt: string;
  filtersApplied: Record<string, string>;
  isDetailed: boolean;
  summary: SettlementsReportSummary;
  columns: string[];
  rows: string[][];
  rawRows?: SettlementsReportRow[];
}

export async function generateSettlementsReport(
  filter: SettlementsReportFilter = {}
): Promise<SettlementsReportResult> {
  const dateFilter =
    filter.from || filter.to
      ? {
          createdAt: {
            ...(filter.from ? { gte: filter.from } : {}),
            ...(filter.to ? { lte: filter.to } : {}),
          },
        }
      : {};

  let typeFilter: string[] = ['COD_SETTLEMENT', 'SUPPLIER_PAYMENT', 'SUPPLIER_PAYMENT_REVERSAL', 'RECONCILIATION_CLEARING'];
  if (filter.entityType === 'DELIVERY') {
    typeFilter = ['COD_SETTLEMENT'];
  } else if (filter.entityType === 'SUPPLIER') {
    typeFilter = ['SUPPLIER_PAYMENT', 'SUPPLIER_PAYMENT_REVERSAL'];
  }

  const [transactions, suppliers, employees] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: {
        ...dateFilter,
        type: { in: typeFilter },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.supplier.findMany({ select: { id: true, name: true } }),
    prisma.employee.findMany({ select: { id: true, name: true } }),
  ]);

  const supplierMap = new Map(suppliers.map((s) => [s.id, s.name]));
  const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

  let totalCount = 0;
  let totalCodRemittedFils = 0;
  let totalSupplierPaidFils = 0;

  const rawRows: SettlementsReportRow[] = [];

  for (const tx of transactions) {
    totalCount++;

    let typeLabel = 'تسوية مالية';
    let entityName = 'رَواق';

    if (tx.type === 'COD_SETTLEMENT') {
      typeLabel = 'توريد COD نقد من شركة التوصيل';
      totalCodRemittedFils += tx.amount;
      // استخراج اسم شركة التوصيل إن وجد في الوصف
      const match = tx.description.match(/\((.*?)\)/);
      entityName = match ? match[1] : 'شركة التوصيل المعتمدة';
    } else if (tx.type === 'SUPPLIER_PAYMENT') {
      typeLabel = 'صرف وسداد مستحقات محل شريك';
      totalSupplierPaidFils += tx.amount;
      entityName = tx.supplierId ? supplierMap.get(tx.supplierId) || 'محل شريك' : 'محل شريك';
    } else if (tx.type === 'SUPPLIER_PAYMENT_REVERSAL') {
      typeLabel = 'عكس دفعة محل شريك (استرداد)';
      totalSupplierPaidFils -= tx.amount;
      entityName = tx.supplierId ? supplierMap.get(tx.supplierId) || 'محل شريك' : 'محل شريك';
    } else if (tx.type === 'RECONCILIATION_CLEARING') {
      typeLabel = 'مقاصة تسوية داخلية معتمدة';
      entityName = 'حساب التسويات';
    }

    const recordedBy = tx.createdByEmployeeId ? employeeMap.get(tx.createdByEmployeeId) || 'النظام المالي' : 'النظام المالي';

    rawRows.push({
      date: new Date(tx.createdAt).toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      typeLabel,
      entityName,
      reference: tx.businessEventKey || tx.id.slice(0, 8),
      direction: tx.direction as 'IN' | 'OUT',
      amountFils: tx.amount,
      description: tx.description,
      recordedBy,
    });
  }

  const netCashFlowFils = totalCodRemittedFils - totalSupplierPaidFils;

  const isDetailed = filter.isDetailed !== false;
  let columns: string[];
  let rows: string[][];

  if (isDetailed) {
    columns = [
      'التاريخ والوقت',
      'نوع التسوية',
      'الجهة المعنية',
      'المرجع المحاسبي',
      'حركة النقد',
      'المبلغ',
      'المسؤول الموثق',
    ];
    rows = rawRows.map((r) => [
      r.date,
      r.typeLabel,
      r.entityName,
      r.reference,
      r.direction === 'IN' ? 'وارد للخزينة (+)' : 'صادر للمحل (-)',
      `${r.direction === 'IN' ? '+' : '-'}${filsToDisplay(r.amountFils)} د.أ`,
      r.recordedBy,
    ]);
  } else {
    columns = [
      'نوع التسوية',
      'الجهة المعنية',
      'إجمالي الحركة',
      'المسؤول الموثق',
    ];
    rows = rawRows.map((r) => [
      r.typeLabel,
      r.entityName,
      `${r.direction === 'IN' ? '+' : '-'}${filsToDisplay(r.amountFils)} د.أ`,
      r.recordedBy,
    ]);
  }

  const filterLabels: Record<string, string> = {};
  if (filter.entityType && filter.entityType !== 'ALL') {
    filterLabels['نوع الجهة'] = filter.entityType === 'DELIVERY' ? 'شركات التوصيل' : 'المحلات الشريكة';
  }
  if (filter.from) {
    filterLabels['من تاريخ'] = new Date(filter.from).toLocaleDateString('ar-JO');
  }
  if (filter.to) {
    filterLabels['إلى تاريخ'] = new Date(filter.to).toLocaleDateString('ar-JO');
  }

  return {
    reportTitle: 'كشف التسويات والتوريدات النقدية المعتمدة',
    department: 'SETTLEMENTS',
    generatedAt: new Date().toLocaleDateString('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    filtersApplied: filterLabels,
    isDetailed,
    summary: {
      totalCount,
      totalCodRemittedFils,
      totalSupplierPaidFils,
      netCashFlowFils,
    },
    columns,
    rows,
    rawRows,
  };
}
