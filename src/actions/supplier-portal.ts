'use server';

import {
  getSupplierPortalData,
  updateSupplierFulfillmentStatus,
  reportSupplierItemShortage,
} from '@/lib/fulfillment/supplier-session';
import { revalidatePath } from 'next/cache';

export async function fetchSupplierPortalAction(token: string) {
  try {
    const data = await getSupplierPortalData(token);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تحميل بيانات المورد.' };
  }
}

export async function updateFulfillmentFromPortalAction(
  token: string,
  fulfillmentOrderId: string,
  action: 'START' | 'READY' | 'REPORT_ISSUE',
  payload?: {
    packagesCount?: number;
    issueReason?: string;
    supplierNotes?: string;
  }
) {
  try {
    const result = await updateSupplierFulfillmentStatus(
      token,
      fulfillmentOrderId,
      action,
      payload
    );
    revalidatePath(`/supplier-portal/${token}`);
    return result;
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تحديث حالة التجهيز.' };
  }
}

export async function reportSupplierItemShortageAction(
  token: string,
  fulfillmentItemId: string,
  missingQuantity: number,
  reason: string
) {
  try {
    const result = await reportSupplierItemShortage(
      token,
      fulfillmentItemId,
      missingQuantity,
      reason
    );
    revalidatePath(`/supplier-portal/${token}`);
    revalidatePath('/admin/orders');
    return result;
  } catch (err: any) {
    return { success: false, error: err?.message || 'تعذر تسجيل إشعار النقص.' };
  }
}
