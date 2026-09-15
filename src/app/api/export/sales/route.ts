import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/dal';

export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const filterEmployee = searchParams.get('employeeId');
    const filterSource = searchParams.get('source');
    const filterPayMethod = searchParams.get('payMethod');
    const filterStartDate = searchParams.get('startDate');
    const filterEndDate = searchParams.get('endDate');

    const whereClause: any = {};
    if (filterEmployee) whereClause.employeeId = filterEmployee;
    if (filterSource) whereClause.source = filterSource;
    if (filterPayMethod) {
      whereClause.payments = {
        some: { method: filterPayMethod }
      };
    }
    if (filterStartDate || filterEndDate) {
      whereClause.createdAt = {};
      if (filterStartDate) {
        whereClause.createdAt.gte = new Date(`${filterStartDate}T00:00:00Z`);
      }
      if (filterEndDate) {
        whereClause.createdAt.lte = new Date(`${filterEndDate}T23:59:59Z`);
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        employee: true,
        payments: true
      }
    });

    // Create CSV header
    let csv = 'رقم العملية,الكاشير,المصدر,اسم العميل,المجموع الإجمالي (د.أ),طريقة الدفع,التاريخ\n';

    sales.forEach(sale => {
      const payMethod = sale.payments[0]?.method || '-';
      const total = (sale.total / 1000).toFixed(2);
      const source = sale.source === 'STOREFRONT' ? 'طلب متجر' : 'POS';
      const date = new Date(sale.createdAt).toLocaleString('ar-JO').replace(/,/g, '');
      const empName = sale.employee?.name || '-';
      
      csv += `${sale.reference},${empName},${source},${sale.customerName || '-'},${total},${payMethod},${date}\n`;
    });

    // Need BOM for Excel to open UTF-8 correctly
    const bom = '\uFEFF';
    
    return new NextResponse(bom + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="sales_report.csv"',
      },
    });

  } catch (error) {
    console.error('Export Error:', error);
    return new NextResponse('Error generating export', { status: 500 });
  }
}
