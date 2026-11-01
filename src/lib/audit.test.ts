import { describe, it, expect } from 'vitest';
import { sanitizePayload, inferCategory, inferSeverity } from './audit';
import { getRetentionPeriodDays, isEligibleForArchival, AUDIT_RETENTION_RULES } from './audit-retention';

describe('RAWAQ Audit & Security Engine', () => {
  describe('Sanitization & Privacy (OWASP Compliance)', () => {
    it('redacts sensitive fields like passwords, secrets, tokens, and hashes', () => {
      const payload = {
        name: 'Ahmad',
        password: 'SuperSecretPassword!123',
        token: 'eyJhGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        mfaSecret: 'JBSWY3DPEHPK3PXP',
        nested: {
          pinHash: 'argon2id$v=19$m=65536...',
          creditCard: '4111222233334444',
          regularKey: 'Normal Value',
        },
      };

      const sanitized = sanitizePayload(payload);
      expect(sanitized.password).toBe('[REDACTED_FOR_SECURITY]');
      expect(sanitized.token).toBe('[REDACTED_FOR_SECURITY]');
      expect(sanitized.mfaSecret).toBe('[REDACTED_FOR_SECURITY]');
      expect(sanitized.nested.pinHash).toBe('[REDACTED_FOR_SECURITY]');
      expect(sanitized.nested.creditCard).toBe('[REDACTED_FOR_SECURITY]');
      expect(sanitized.nested.regularKey).toBe('Normal Value');
      expect(sanitized.name).toBe('Ahmad');
    });

    it('masks emails and phone numbers for privacy', () => {
      const payload = {
        email: 'customer.service@rawaq.jo',
        phone: '0791234567',
      };

      const sanitized = sanitizePayload(payload);
      expect(sanitized.email).toContain('@rawaq.jo');
      expect(sanitized.email).not.toBe('customer.service@rawaq.jo');
      expect(sanitized.phone).toContain('***');
      expect(sanitized.phone.startsWith('0791')).toBe(true);
      expect(sanitized.phone.endsWith('67')).toBe(true);
    });
  });

  describe('Category & Severity Inference', () => {
    it('accurately maps operations to the 7 operational pillars', () => {
      expect(inferCategory('ORDER_CONFIRMED', 'Order')).toBe('ORDERS');
      expect(inferCategory('SUPPLIER_ORDER_READY', 'FulfillmentOrder')).toBe('SUPPLIERS');
      expect(inferCategory('DELIVERY_BATCH_APPROVED', 'DeliveryBatch')).toBe('DELIVERY');
      expect(inferCategory('COD_REMITTANCE_RECORDED', 'FinancialTransaction')).toBe('ACCOUNTING');
      expect(inferCategory('OFFICIAL_REPORT_APPROVED', 'OfficialReport')).toBe('REPORTS');
      expect(inferCategory('PRODUCT_PRICING_UPDATED', 'Product')).toBe('PRODUCTS');
      expect(inferCategory('SESSION_CREATED', 'Session')).toBe('SECURITY');
    });

    it('classifies severity appropriately', () => {
      expect(inferSeverity('SETTLEMENT_REVERSED')).toBe('CRITICAL');
      expect(inferSeverity('DELIVERY_BATCH_CANCELLED')).toBe('CRITICAL');
      expect(inferSeverity('ORDER_STATUS_UPDATED')).toBe('HIGH');
      expect(inferSeverity('SESSION_CREATED')).toBe('NORMAL');
      expect(inferSeverity('ANY_ACTION', 'DENIED')).toBe('HIGH');
    });
  });

  describe('Retention Policy Compliance', () => {
    it('enforces approved retention durations according to Rawaq policy', () => {
      // 4 years for financials, reports, and critical security
      expect(getRetentionPeriodDays('ACCOUNTING')).toBe(1460);
      expect(getRetentionPeriodDays('REPORTS')).toBe(1460);
      expect(getRetentionPeriodDays('SECURITY', 'CRITICAL')).toBe(1460);

      // 3 years for orders, suppliers, delivery, products
      expect(getRetentionPeriodDays('ORDERS')).toBe(1095);
      expect(getRetentionPeriodDays('SUPPLIERS')).toBe(1095);
      expect(getRetentionPeriodDays('DELIVERY')).toBe(1095);
      expect(getRetentionPeriodDays('PRODUCTS')).toBe(1095);

      // 12 months for routine security/sessions
      expect(getRetentionPeriodDays('SECURITY', 'NORMAL')).toBe(365);

      // 90 days for routine system events
      expect(AUDIT_RETENTION_RULES.SYSTEM_ROUTINE).toBe(90);
    });

    it('evaluates archival eligibility accurately', () => {
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(now.getFullYear() - 5);

      // Financial record 2 years ago is NOT eligible for deletion (needs 4 years)
      expect(isEligibleForArchival(twoYearsAgo, 'ACCOUNTING')).toBe(false);

      // Financial record 5 years ago is eligible for archival
      expect(isEligibleForArchival(fiveYearsAgo, 'ACCOUNTING')).toBe(true);

      // Security session from 2 years ago is eligible (limit 12 months)
      expect(isEligibleForArchival(twoYearsAgo, 'SECURITY', 'NORMAL')).toBe(true);
    });
  });
});
