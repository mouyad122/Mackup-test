import { prisma } from './db';
import { Prisma } from '@prisma/client';

export type AuditCategory =
  | 'ORDERS'
  | 'SUPPLIERS'
  | 'DELIVERY'
  | 'ACCOUNTING'
  | 'REPORTS'
  | 'PRODUCTS'
  | 'SECURITY';

export type AuditSeverity = 'NORMAL' | 'HIGH' | 'CRITICAL';
export type AuditOutcome = 'SUCCESS' | 'FAILED' | 'DENIED';
export type AuditActorType = 'ADMIN' | 'SUPPLIER' | 'COURIER' | 'SYSTEM' | 'ANONYMOUS';

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  outcome?: AuditOutcome;
  actorType?: AuditActorType;
  actorId?: string;
  actorNameSnapshot?: string;
  employeeId?: string;
  ipAddress?: string;
  reason?: string;
  correlationId?: string;
  eventKey?: string;
  requestId?: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
    [key: string]: any;
  } | any;
  details?: any;
}

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /hash/i,
  /token/i,
  /secret/i,
  /pin/i,
  /auth/i,
  /cookie/i,
  /cvv/i,
  /card/i,
  /credential/i,
];

/**
 * دالة مركزية لتنقية وتصفية البيانات الحساسة والأسرار قبل التخزين (OWASP Logging Compliance)
 */
export function sanitizePayload(data: any, depth = 0): any {
  if (depth > 6 || data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // إخفاء الرموز الطويلة أو التوكنات إن ظهرت كنص
    if (data.length > 500 && !data.includes(' ')) {
      return `[TRUNCATED_BLOB: ${data.length} chars]`;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.slice(0, 50).map(item => sanitizePayload(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEY_PATTERNS.some(regex => regex.test(key));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_FOR_SECURITY]';
    } else if (key === 'email' && typeof value === 'string' && value.includes('@')) {
      // إخفاء جزئي للبريد الإلكتروني لحماية الخصوصية
      const [user, domain] = value.split('@');
      const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : '***';
      sanitized[key] = `${maskedUser}@${domain}`;
    } else if (key === 'phone' && typeof value === 'string' && value.length >= 7) {
      // إخفاء جزئي للهاتف
      sanitized[key] = value.slice(0, 4) + '***' + value.slice(-2);
    } else {
      sanitized[key] = sanitizePayload(value, depth + 1);
    }
  }

  return sanitized;
}

/**
 * تحديد القسم التلقائي بناء على كود العملية أو الكيان في حال عدم تمريره
 */
export function inferCategory(action: string, entityType: string): AuditCategory {
  const act = action.toUpperCase();
  const ent = entityType.toUpperCase();

  if (act.includes('REPORT') || act.includes('OFFICIAL')) return 'REPORTS';
  if (act.includes('COD') || act.includes('SETTLEMENT') || act.includes('PAYMENT') || act.includes('EXPENSE') || act.includes('TAX') || act.includes('POS_') || ent.includes('FINANCIAL')) return 'ACCOUNTING';
  if (act.includes('SUPPLIER') || ent.includes('SUPPLIER') || act.includes('FULFILLMENT') || act.includes('SHORTAGE')) return 'SUPPLIERS';
  if (act.includes('DELIVERY') || act.includes('BATCH') || act.includes('SHIPPING') || act.includes('CARRIER') || act.includes('COURIER')) return 'DELIVERY';
  if (act.includes('ORDER') || act.includes('INVOICE') || ent.includes('ORDER') || ent.includes('CUSTOMER')) return 'ORDERS';
  if (act.includes('PRODUCT') || act.includes('INVENTORY') || act.includes('STOCK') || act.includes('RETURN_INSPECTED') || act.includes('COUPON') || act.includes('REWARD')) return 'PRODUCTS';
  
  return 'SECURITY';
}

/**
 * تحديد درجة خطورة العملية التلقائية
 */
export function inferSeverity(action: string, outcome?: AuditOutcome): AuditSeverity {
  if (outcome === 'DENIED' || outcome === 'FAILED') return 'HIGH';
  const act = action.toUpperCase();
  if (
    act.includes('REVERS') ||
    act.includes('DELETE') ||
    act.includes('OVERRIDE') ||
    act.includes('SETTLEMENT') ||
    act.includes('COD_REMITTANCE') ||
    act.includes('TAX_SETTINGS') ||
    act.includes('PERMISSION') ||
    act.includes('ROLE') ||
    act.includes('PRICE') ||
    act.includes('CANCEL')
  ) {
    return 'CRITICAL';
  }
  if (
    act.includes('UPDATE') ||
    act.includes('ADJUST') ||
    act.includes('REPORT') ||
    act.includes('SHORTAGE')
  ) {
    return 'HIGH';
  }
  return 'NORMAL';
}

/**
 * 1. تسجيل التدقيق الإلزامي للعمليات الحساسة والمالية داخل Transaction (لا يسمح بالنجاح في حال فشل التدقيق)
 */
export async function recordCriticalAudit(
  tx: Prisma.TransactionClient,
  event: AuditEvent
): Promise<void> {
  const category = event.category || inferCategory(event.action, event.entityType);
  const severity = event.severity || inferSeverity(event.action, event.outcome);
  const outcome = event.outcome || 'SUCCESS';
  const actorType = event.actorType || (event.employeeId ? 'ADMIN' : 'SYSTEM');

  // معالجة وتنقية التغييرات والتفاصيل
  const sanitizedChanges = event.changes ? sanitizePayload(event.changes) : null;
  const sanitizedDetails = event.details ? sanitizePayload(event.details) : null;

  // توحيد الحقل المزدوج details للتوافق القديم
  const finalDetailsPayload = sanitizedDetails || (sanitizedChanges ? { changes: sanitizedChanges } : null);

  await tx.auditLog.create({
    data: {
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      employeeId: event.employeeId || (actorType === 'ADMIN' ? event.actorId : null),
      actorType,
      actorId: event.actorId || event.employeeId || null,
      actorNameSnapshot: event.actorNameSnapshot || null,
      category,
      severity,
      outcome,
      eventKey: event.eventKey || null,
      requestId: event.requestId || null,
      correlationId: event.correlationId || null,
      reason: event.reason || null,
      changes: sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
      details: finalDetailsPayload ? JSON.stringify(finalDetailsPayload) : null,
      ipAddress: event.ipAddress || null,
    },
  });
}

/**
 * 2. تسجيل الأحداث الروتينية والتشغيلية المنفصلة (مع حماية مسار العمل من الانهيار عند حدوث عارض)
 */
export async function recordOperationalEvent(event: AuditEvent): Promise<void> {
  try {
    const category = event.category || inferCategory(event.action, event.entityType);
    const severity = event.severity || inferSeverity(event.action, event.outcome);
    const outcome = event.outcome || 'SUCCESS';
    const actorType = event.actorType || (event.employeeId ? 'ADMIN' : 'SYSTEM');

    const sanitizedChanges = event.changes ? sanitizePayload(event.changes) : null;
    const sanitizedDetails = event.details ? sanitizePayload(event.details) : null;
    const finalDetailsPayload = sanitizedDetails || (sanitizedChanges ? { changes: sanitizedChanges } : null);

    await prisma.auditLog.create({
      data: {
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        employeeId: event.employeeId || (actorType === 'ADMIN' ? event.actorId : null),
        actorType,
        actorId: event.actorId || event.employeeId || null,
        actorNameSnapshot: event.actorNameSnapshot || null,
        category,
        severity,
        outcome,
        eventKey: event.eventKey || null,
        requestId: event.requestId || null,
        correlationId: event.correlationId || null,
        reason: event.reason || null,
        changes: sanitizedChanges ? JSON.stringify(sanitizedChanges) : null,
        details: finalDetailsPayload ? JSON.stringify(finalDetailsPayload) : null,
        ipAddress: event.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Non-blocking operational audit logging failed:', error);
  }
}

/**
 * 3. دالة التوافق القديمة (Backward-Compatible logAction)
 */
export async function logAction(
  employeeId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: any
): Promise<void> {
  await recordOperationalEvent({
    employeeId,
    actorId: employeeId,
    actorType: employeeId ? 'ADMIN' : 'SYSTEM',
    action,
    entityType,
    entityId,
    details,
  });
}
