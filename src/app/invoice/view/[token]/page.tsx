import { getPublicInvoiceDataByToken } from '@/lib/invoices/invoice-service';
import InvoiceViewClient from './InvoiceViewClient';
import { AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function PublicInvoicePage({ params }: PageProps) {
  const { token } = await params;
  const invoice = await getPublicInvoiceDataByToken(token);

  if (!invoice) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xs border border-stone-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-lg font-extrabold text-stone-900">تعذر العثور على الفاتورة</h1>
          <p className="text-xs text-stone-600 leading-relaxed">
            الرابط غير صحيح أو تم تحديث رمز الفاتورة. يرجى مراجعة خدمة عملاء رَواق عبر واتساب للحصول على الفاتورة المحدثة.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/962790924636"
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-[#3F4832] text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-[#2d3424] transition"
            >
              مراسلة خدمة العملاء
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <InvoiceViewClient invoice={invoice} />;
}
