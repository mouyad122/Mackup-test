'use server';

import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/dal';
import { ProfitsService } from '@/lib/profits/profits-service';

export async function getProfitsOverviewAction(fromDateStr?: string, toDateStr?: string) {
  await requireAuth();
  const fromDate = fromDateStr ? new Date(`${fromDateStr}T00:00:00.000Z`) : undefined;
  const toDate = toDateStr ? new Date(`${toDateStr}T23:59:59.999Z`) : undefined;
  return await ProfitsService.getProfitsKPIs(fromDate, toDate);
}

export async function getEmployeePayrollAction() {
  await requireAuth();
  return await ProfitsService.getEmployeePayrollList();
}

export async function disburseSalaryPaymentAction(
  payrollPeriodId: string,
  input: {
    amountFils?: number;
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CLIK';
    paymentReference?: string;
    notes?: string;
  }
) {
  const session = await requireAuth();
  try {
    const payment = await ProfitsService.disburseSalaryPayment(
      payrollPeriodId,
      input,
      session.employeeId,
      session.employee.name
    );
    revalidatePath('/admin/profits');
    revalidatePath('/admin/reports');
    return { success: true, payment };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر صرف الراتب.' };
  }
}

export async function getPartnersSummaryAction(fromDateStr?: string, toDateStr?: string) {
  await requireAuth();
  const fromDate = fromDateStr ? new Date(`${fromDateStr}T00:00:00.000Z`) : undefined;
  const toDate = toDateStr ? new Date(`${toDateStr}T23:59:59.999Z`) : undefined;
  return await ProfitsService.getPartnersSummary(fromDate, toDate);
}

export async function disbursePartnerPayoutAction(
  partnerRuleId: string,
  input: {
    amountFils: number;
    payoutType: 'PROFIT_DISTRIBUTION' | 'DRAWING_ON_ACCOUNT' | 'ADMINISTRATIVE_WAGE';
    paymentMethod: string;
    paymentReference?: string;
    notes?: string;
  }
) {
  const session = await requireAuth();
  try {
    const payout = await ProfitsService.disbursePartnerPayout(
      partnerRuleId,
      input,
      session.employeeId,
      session.employee.name
    );
    revalidatePath('/admin/profits');
    revalidatePath('/admin/reports');
    return { success: true, payout };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر صرف دفعة الشريك.' };
  }
}

export async function createPeriodCloseDraftAction(
  fromStr: string,
  toStr: string,
  notes?: string
) {
  const session = await requireAuth();
  try {
    const from = new Date(fromStr);
    const to = new Date(toStr);
    const close = await ProfitsService.createPeriodCloseDraft(
      from,
      to,
      session.employeeId,
      notes
    );
    revalidatePath('/admin/profits');
    return { success: true, close };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر إنشاء مسودة الإغلاق.' };
  }
}

export async function approvePeriodCloseAction(closeId: string, partnerNumber: 1 | 2) {
  const session = await requireAuth();
  try {
    const updated = await ProfitsService.approvePeriodCloseByPartner(
      closeId,
      partnerNumber,
      session.employeeId,
      session.employee.name
    );
    revalidatePath('/admin/profits');
    revalidatePath('/admin/reports');
    return { success: true, close: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر اعتماد الإغلاق المالي.' };
  }
}

export async function updateEmployeePayAgreementAction(
  employeeId: string,
  input: {
    baseRateFils: number;
    contractType: string;
    weeklyAgreedHours: number;
    notes?: string;
  }
) {
  const session = await requireAuth();
  try {
    const agreement = await ProfitsService.updateEmployeePayAgreement(
      employeeId,
      input,
      session.employeeId,
      session.employee.name
    );
    revalidatePath('/admin/profits');
    return { success: true, agreement };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر تحديث اتفاقية الراتب.' };
  }
}

export async function updatePartnerShareRulesAction(
  rules: Array<{
    id?: string;
    partnerName: string;
    sharePercentage: number;
    partnerEmployeeId?: string | null;
    bankDetails?: string | null;
    notes?: string | null;
    isActive?: boolean;
  }>
) {
  const session = await requireAuth();
  try {
    const updatedRules = await ProfitsService.updatePartnerShareRules(
      rules,
      session.employeeId,
      session.employee.name
    );
    revalidatePath('/admin/profits');
    return { success: true, rules: updatedRules };
  } catch (err: any) {
    return { success: false, error: err.message || 'تعذر تحديث نسب الشركاء.' };
  }
}

export async function getProfitsLedgerAction(limit = 50, fromDateStr?: string, toDateStr?: string) {
  await requireAuth();
  const fromDate = fromDateStr ? new Date(`${fromDateStr}T00:00:00.000Z`) : undefined;
  const toDate = toDateStr ? new Date(`${toDateStr}T23:59:59.999Z`) : undefined;
  return await ProfitsService.getProfitsFullLedger(limit, fromDate, toDate);
}
