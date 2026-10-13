import React from 'react';
import { requirePermission } from '@/lib/dal';
import { prisma } from '@/lib/db';
import { AdminSidebar } from '@/components/AdminSidebar';


export default async function AdminLogsPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await requirePermission('manage:settings'); // Assume only admin can view logs
  const sp = await searchParams;
  
  const typeFilter = typeof sp.type === 'string' ? sp.type : '';
  const searchFilter = typeof sp.q === 'string' ? sp.q : '';

  // Cleanup old logs automatically when the page is visited
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: thirtyDaysAgo } }
  }).catch(() => {});

  const whereClause: any = {};
  if (typeFilter) {
    if (typeFilter === 'products') whereClause.entityType = 'PRODUCT';
    else if (typeFilter === 'orders') whereClause.entityType = 'ORDER';
    else if (typeFilter === 'auth') whereClause.entityType = 'Session';
  }

  if (searchFilter) {
    whereClause.OR = [
      { employee: { name: { contains: searchFilter, mode: 'insensitive' } } },
      { action: { contains: searchFilter, mode: 'insensitive' } },
    ];
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    include: { employee: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100, // Limit to 100 recent
  });

  const statusLabel: Record<string, string> = {
    AWAITING_WHATSAPP: 'بانتظار تأكيد واتساب', PENDING: 'جديد', CONFIRMED: 'مؤكد',
    PREPARING: 'قيد التجهيز', PREPARED: 'جاهز', ASSIGNED: 'مُعيّن للمندوب',
    SHIPPED: 'مع التوصيل', OUT_FOR_DELIVERY: 'قيد التوصيل', DELIVERED: 'مكتمل',
    FAILED_DELIVERY: 'تعذر التوصيل', CANCELLED: 'ملغى', REFUNDED: 'مسترد',
    NOT_DELIVERED: 'بانتظار التوصيل', IN_DELIVERY: 'قيد التوصيل', COMPLETED: 'مكتمل'
  };

  const getActionTitle = (log: any) => {
    const empName = log.employee?.name || 'النظام';
    const actionMap: Record<string, string> = {
      CREATE_PRODUCT: `قام بإضافة منتج جديد`,
      UPDATE_PRODUCT: `قام بتعديل المنتج`,
      DELETE_PRODUCT: `قام بحذف منتج`,
      UPDATE_ORDER_STATUS: `قام بتغيير حالة الطلب`,
      SESSION_CREATED: `تسجيل دخول ناجح`,
      CREATE_EMPLOYEE: `قام بإضافة موظف جديد`,
      EMPLOYEE_CREATED: `قام بإضافة موظف جديد`,
      UPDATE_EMPLOYEE: `قام بتعديل بيانات موظف`,
      EMPLOYEE_UPDATED: `قام بتعديل بيانات موظف`,
      DELETE_EMPLOYEE: `قام بحذف حساب موظف`,
      EMPLOYEE_DELETED: `قام بحذف حساب موظف`,
      EMPLOYEE_STATUS_TOGGLED: `قام بتفعيل/تعطيل حساب موظف`,
      CREATE_CATEGORY: `قام بإنشاء قسم جديد`,
      UPDATE_CATEGORY: `قام بتعديل قسم`,
      DELETE_CATEGORY: `قام بحذف قسم`,
      DELIVERY_BATCH_STATUS_UPDATED: `قام بتحديث حالة التوصيل لمجموعة طلبات (Batch)`,
      POS_CHECKOUT: `قام بإتمام طلب نقطة بيع (POS)`,
      POS_REFUND: `قام بإرجاع طلب نقطة بيع`,
      CMS_UPDATE: `قام بتحديث محتوى المتجر`,
      UPDATE_SETTINGS: `قام بتحديث إعدادات النظام`,
      CREATE_ROLE: `قام بإنشاء دور (صلاحيات) جديد`,
      UPDATE_ROLE: `قام بتعديل صلاحيات`,
      DELETE_ROLE: `قام بحذف دور صلاحيات`,
      PASSWORD_RESET: `قام بإعادة تعيين كلمة مرور`,
      FORCE_PASSWORD_CHANGE: `قام بفرض تغيير كلمة المرور للموظف`,
      FORCE_LOGOUT: `قام بفرض تسجيل الخروج`,
      ALL_SESSIONS_REVOKED: `قام بإنهاء كافة جلسات الموظف`,
      SESSION_REVOKED: `قام بإنهاء جلسة محددة`,
      PERMISSION_OVERRIDE_ADDED: `قام بإضافة استثناء صلاحية لموظف`,
      UPDATE_SUPPLIER: `قام بتعديل مورد`,
      CREATE_SUPPLIER: `قام بإضافة مورد`,
    };

    return actionMap[log.action] ? `${actionMap[log.action]} (${empName})` : `قام ${empName} بعملية: ${log.action}`;
  };

  const getActionDetails = (log: any) => {
    if (!log.details) return null;
    try {
      const d = JSON.parse(log.details);
      const parts: string[] = [];
      if (d.name) parts.push(`الاسم: ${d.name}`);
      if (d.email) parts.push(`البريد الإلكتروني: ${d.email}`);
      
      if (d.newStatus) parts.push(`الحالة الجديدة: ${statusLabel[d.newStatus] || d.newStatus}`);
      if (d.oldStatus) parts.push(`الحالة السابقة: ${statusLabel[d.oldStatus] || d.oldStatus}`);
      if (d.status) parts.push(`الحالة الجديدة: ${statusLabel[d.status] || d.status}`);
      if (d.previousStatus) parts.push(`الحالة السابقة: ${statusLabel[d.previousStatus] || d.previousStatus}`);
      
      if (d.reason) parts.push(`السبب: ${d.reason}`);
      if (d.reference) parts.push(`رقم الطلب / المرجع: ${d.reference}`);
      if (d.count) parts.push(`العدد: ${d.count}`);
      if (d.isActive !== undefined) parts.push(`حالة التفعيل: ${d.isActive ? 'مفعل' : 'معطل'}`);
      if (d.amount) parts.push(`المبلغ: ${d.amount}`);
      if (d.roleId) parts.push(`معرف الصلاحية: ${d.roleId}`);
      if (d.employeeId) parts.push(`معرف الموظف المتأثر: ${d.employeeId}`);
      
      if (d.shippingResponsibility) {
         const respMap: any = { STORE: 'المنصة', CUSTOMER: 'العميل' };
         parts.push(`مسؤولية التوصيل (للملغى): ${respMap[d.shippingResponsibility] || d.shippingResponsibility}`);
      }
      if (Array.isArray(d.cancelledOrderIds) && d.cancelledOrderIds.length > 0) {
        parts.push(`الطلبات الملغاة من التوصيل: ${d.cancelledOrderIds.length} طلبات`);
      }
      
      const knownKeys = ['name', 'email', 'newStatus', 'oldStatus', 'status', 'previousStatus', 'reason', 'reference', 'count', 'isActive', 'amount', 'roleId', 'employeeId', 'shippingResponsibility', 'cancelledOrderIds'];
      Object.keys(d).forEach(k => {
         if (!knownKeys.includes(k) && typeof d[k] !== 'object' && d[k] !== null) {
           parts.push(`${k}: ${d[k]}`);
         }
      });

      return parts.length > 0 ? parts : null;
    } catch (e) {
      return null;
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'PRODUCT': return '📦';
      case 'ORDER': return '🛍️';
      case 'Session': return '🔐';
      default: return '⚙️';
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-ivory-100)] text-zinc-800 overflow-hidden" dir="rtl">
      <AdminSidebar employeeName={session.employee.name} roleName={session?.employee?.role?.name || "ADMIN"} />
      
      <main className="flex-1 overflow-y-auto p-6 md:p-12 font-sans w-full max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading text-[#3F4B32]">سجلات النشاطات (Logs)</h1>
            <p className="text-zinc-500 mt-1">عرض تفصيلي للعمليات التي قام بها فريق العمل (آخر 30 يوماً).</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-[var(--color-ivory-200)] flex flex-wrap gap-4 items-end">
          <form className="flex-1 min-w-[300px] flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-zinc-700 mb-1">بحث في السجلات (اسم أو عملية)</label>
              <input 
                type="text" 
                name="q" 
                defaultValue={searchFilter} 
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B7935F]" 
                placeholder="ابحث هنا..."
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-bold text-zinc-700 mb-1">نوع العملية</label>
              <select 
                name="type" 
                defaultValue={typeFilter} 
                className="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#B7935F]"
              >
                <option value="">الكل</option>
                <option value="products">المنتجات</option>
                <option value="orders">الطلبات</option>
                <option value="auth">تسجيل الدخول</option>
              </select>
            </div>
            <div className="pb-[1px]">
              <button type="submit" className="bg-[#3F4B32] hover:bg-[#2d3623] text-white px-6 py-2 rounded text-sm font-bold shadow-sm transition-colors h-[38px] flex items-center">
                تصفية
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-[var(--color-ivory-200)] overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">لا توجد سجلات مطابقة للبحث.</div>
          ) : (
            <table className="w-full text-start">
              <thead className="bg-[#F7F3EA] border-b border-[#E9DDCC]">
                <tr>
                  <th className="px-6 py-4 text-start text-xs font-bold text-[#3F4B32] w-12">#</th>
                  <th className="px-6 py-4 text-start text-xs font-bold text-[#3F4B32]">العملية والتفاصيل</th>
                  <th className="px-6 py-4 text-start text-xs font-bold text-[#3F4B32] w-48">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4 text-2xl">{getActionIcon(log.entityType)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-zinc-800">{getActionTitle(log)}</div>
                      {(() => {
                        const detailsList = getActionDetails(log);
                        if (!detailsList) return null;
                        return (
                          <ul className="mt-2 text-xs text-zinc-600 list-disc list-inside space-y-1 bg-zinc-50 p-2 rounded border border-zinc-100">
                            {detailsList.map((detail, idx) => (
                              <li key={idx}>{detail}</li>
                            ))}
                          </ul>
                        );
                      })()}
                      <div className="text-xs text-zinc-400 mt-2 font-mono">
                        رقم المرجع: {log.entityId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-zinc-700">{new Date(log.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
