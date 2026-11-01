import { AuditCategory, AuditSeverity } from './audit';

/**
 * سياسة الاحتفاظ المعتمدة بسجلات منصة رَواق (RAWAQ Audit Retention Policy)
 * -------------------------------------------------------------
 * 1. العمليات المالية والتسويات وتحصيلات COD ودفعات الموردين: 4 سنوات (1460 يوماً).
 * 2. إصدار الفواتير والتقارير المالية الرسمية واعتمادها: 4 سنوات (1460 يوماً).
 * 3. تعديل صلاحيات الموظفين والإعدادات الحساسة: 4 سنوات (1460 يوماً).
 * 4. تعديل الطلبات والأسعار وتجهيز الموردين وعمليات التوصيل: 3 سنوات (1095 يوماً).
 * 5. تسجيل الدخول ومحاولات الوصول المرفوضة والأحداث الأمنية: 12 شهراً (365 يوماً).
 * 6. أحداث النظام الروتينية والتشخيصية: 90 يوماً.
 */

export const AUDIT_RETENTION_RULES = {
  ACCOUNTING: 1460, // 4 years
  REPORTS: 1460,    // 4 years
  SECURITY_SENSITIVE: 1460, // 4 years (roles, permissions, overrides)
  ORDERS: 1095,     // 3 years
  SUPPLIERS: 1095,  // 3 years
  DELIVERY: 1095,   // 3 years
  PRODUCTS: 1095,   // 3 years
  SECURITY_ROUTINE: 365, // 12 months (logins, sessions)
  SYSTEM_ROUTINE: 90,    // 90 days
} as const;

export function getRetentionPeriodDays(category: AuditCategory, severity: AuditSeverity = 'NORMAL'): number {
  if (category === 'ACCOUNTING' || category === 'REPORTS') {
    return AUDIT_RETENTION_RULES.ACCOUNTING;
  }
  if (category === 'SECURITY') {
    return severity === 'CRITICAL' ? AUDIT_RETENTION_RULES.SECURITY_SENSITIVE : AUDIT_RETENTION_RULES.SECURITY_ROUTINE;
  }
  if (severity === 'CRITICAL') {
    return AUDIT_RETENTION_RULES.ACCOUNTING; // 4 years for any critical event
  }
  if (['ORDERS', 'SUPPLIERS', 'DELIVERY', 'PRODUCTS'].includes(category)) {
    return AUDIT_RETENTION_RULES.ORDERS;
  }
  return AUDIT_RETENTION_RULES.SYSTEM_ROUTINE;
}

export function isEligibleForArchival(createdAt: Date, category: AuditCategory, severity: AuditSeverity = 'NORMAL'): boolean {
  const retentionDays = getRetentionPeriodDays(category, severity);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  return createdAt < cutoffDate;
}
