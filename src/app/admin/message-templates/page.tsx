import { requirePermission } from '@/lib/dal';
import { AdminSidebar } from '@/components/AdminSidebar';
import { getAllMessageTemplatesAction } from '@/actions/message-templates';
import MessageTemplatesClient from './MessageTemplatesClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'إدارة قوالب الرسائل والواتساب | رَواق',
  description: 'إدارة واعتماد قوالب رسائل تأكيد الطلب وروابط التجهيز وإشعارات التوصيل',
};

export default async function MessageTemplatesPage() {
  const session = await requirePermission('manage:settings');
  const templates = await getAllMessageTemplatesAction();

  return (
    <div className="flex min-h-screen flex-col bg-stone-100/60 md:flex-row font-sans" dir="rtl">
      <AdminSidebar
        employeeName={session.employee.name}
        roleName={session.employee.role.name}
      />
      <main className="min-w-0 max-w-full w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <MessageTemplatesClient initialTemplates={templates} />
      </main>
    </div>
  );
}
