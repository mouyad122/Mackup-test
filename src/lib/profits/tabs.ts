export type ProfitTabKey = 'OVERVIEW' | 'PAYROLL' | 'CLOSE' | 'PARTNERS' | 'LEDGER';

export const TAB_SLUG_MAP: Record<ProfitTabKey, string> = {
  OVERVIEW: 'overview',
  PAYROLL: 'payroll',
  CLOSE: 'close',
  PARTNERS: 'partners',
  LEDGER: 'ledger',
};

export const resolveProfitTab = (val?: string): ProfitTabKey => {
  if (!val) return 'OVERVIEW';
  const clean = decodeURIComponent(val).trim().toLowerCase();
  if (['payroll', 'salaries', 'salary', 'employees', 'رواتب', 'الموظفين', 'موظفين'].includes(clean)) return 'PAYROLL';
  if (['close', 'approval', 'dual_approval', 'period_close', 'إغلاق', 'اعتماد', 'اغلاق'].includes(clean)) return 'CLOSE';
  if (['partners', 'distribution', 'shares', 'شركاء', 'الشركاء', 'أرباح', 'ارباح', 'توزيع'].includes(clean)) return 'PARTNERS';
  if (['ledger', 'audit', 'history', 'سجل', 'السجل', 'سحوبات', 'السحوبات', 'تدقيق'].includes(clean)) return 'LEDGER';
  if (['overview', 'liquidity', 'نظرة-عامة', 'نظرة_عامة', 'نظرة', 'سيولة'].includes(clean)) return 'OVERVIEW';
  return 'OVERVIEW';
};
