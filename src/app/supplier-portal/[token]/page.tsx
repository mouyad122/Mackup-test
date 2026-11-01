import { getSupplierPortalData } from '@/lib/fulfillment/supplier-session';
import SupplierPortalClient from './SupplierPortalClient';
import { Package, ShieldCheck, AlertCircle } from 'lucide-react';

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SupplierPortalPage({ params }: PageProps) {
  const { token } = await params;

  let portalData = null;
  let errorMessage = null;

  try {
    portalData = await getSupplierPortalData(token);
  } catch (err: any) {
    errorMessage = err?.message || 'الرابط غير صالح أو انتهت مدة صلاحيته.';
  }

  if (errorMessage || !portalData) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-zinc-200 p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 mb-2">رابط غير متاح</h1>
          <p className="text-zinc-600 text-sm mb-6 leading-relaxed">
            {errorMessage}
          </p>
          <div className="text-xs text-zinc-500 bg-zinc-100 p-3 rounded-lg">
            يرجى التواصل مع إدارة رَواق عبر واتساب لإصدار رابط جلسة جديد.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans antialiased" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              ر
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">رَواق | منصة تجهيز المحل</div>
              <div className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                <span>{portalData.supplier.name}</span>
                {portalData.supplier.ownerName && (
                  <span className="text-[11px] font-normal text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                    ({portalData.supplier.ownerName})
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>جلسة مؤمنة</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <SupplierPortalClient token={token} initialData={portalData} />
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-zinc-500 border-t border-zinc-200 mt-12">
        نظام رَواق الذكي لإدارة الموردين والتنفيذ © {new Date().getFullYear()}
      </footer>
    </div>
  );
}
