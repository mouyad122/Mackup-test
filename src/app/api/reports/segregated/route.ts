import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/dal';
import { generateDifferencesReport } from '@/lib/reports/differences-report';
import { generateSettlementsReport } from '@/lib/reports/settlements-report';
import { generateDeliveryReport } from '@/lib/reports/delivery-report';
import { generateSupplierReport } from '@/lib/reports/supplier-report';
import { generateExpensesReport } from '@/lib/reports/expenses-report';
import { generateFinancialSummaryReport } from '@/lib/reports/financial-summary-report';

export async function GET(request: NextRequest) {
  try {
    await requirePermission('manage:settings');
    const { searchParams } = new URL(request.url);

    const dept = (searchParams.get('dept') || 'DELIVERY').toUpperCase();
    const isDetailed = searchParams.get('detailed') !== 'false';
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');
    const from = fromStr ? new Date(`${fromStr}T00:00:00`) : undefined;
    const to = toStr ? new Date(`${toStr}T23:59:59.999`) : undefined;

    if (dept === 'DELIVERY') {
      const courierCompany = searchParams.get('courierCompany') || undefined;
      const batchRef = searchParams.get('batchRef') || undefined;
      const status = searchParams.get('status') || undefined;
      const deliveryScope = (searchParams.get('deliveryScope') || searchParams.get('scope') || undefined) as any;

      const report = await generateDeliveryReport({
        courierCompany,
        batchReference: batchRef,
        status,
        from,
        to,
        isDetailed,
        deliveryScope,
      });
      return NextResponse.json(report);
    }

    if (dept === 'SUPPLIER' || dept === 'SHOPS') {
      const supplierId = searchParams.get('supplierId') || undefined;
      const itemStatus = searchParams.get('itemStatus') || undefined;
      const report = await generateSupplierReport({
        supplierId,
        from,
        to,
        itemStatus,
        isDetailed,
      });
      return NextResponse.json(report);
    }

    if (dept === 'EXPENSES') {
      const category = searchParams.get('category') || undefined;
      const report = await generateExpensesReport({
        category,
        from,
        to,
        isDetailed,
      });
      return NextResponse.json(report);
    }

    if (dept === 'DIFFERENCES') {
      const status = searchParams.get('status') || undefined;
      const entityType = searchParams.get('entityType') || undefined;
      const report = await generateDifferencesReport({
        status,
        entityType,
        from,
        to,
        isDetailed,
      });
      return NextResponse.json(report);
    }

    if (dept === 'SETTLEMENTS') {
      const entityType = (searchParams.get('entityType') as any) || undefined;
      const report = await generateSettlementsReport({
        entityType,
        from,
        to,
        isDetailed,
      });
      return NextResponse.json(report);
    }

    if (dept === 'FINANCIAL_SUMMARY' || dept === 'FINANCIAL') {
      const report = await generateFinancialSummaryReport({
        from,
        to,
        isDetailed,
      });
      return NextResponse.json(report);
    }

    return NextResponse.json({ error: 'قسم غير معروف' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'خطأ في توليد التقرير' }, { status: 500 });
  }
}
