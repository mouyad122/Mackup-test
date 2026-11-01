import React from 'react';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ reference: string }>;
}

const DEPT_NAMES: Record<string, string> = {
  DELIVERY: 'شركات التوصيل واللوجستيات',
  SUPPLIER: 'المحلات الشريكة ومستحقات المتاجر',
  EXPENSES: 'المصروفات التشغيلية',
  DIFFERENCES: 'الفروقات والمطابقة المالية',
  SETTLEMENTS: 'التسويات والتوريدات النقدية',
  FINANCIAL_SUMMARY: 'التقرير المالي الشامل (P&L)',
};

export default async function VerifyReportPage({ params }: Props) {
  const { reference } = await params;

  const report = await prisma.officialReport.findUnique({
    where: { reference },
  });

  if (!report) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 font-sans" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-3xl border border-zinc-200 p-8 text-center shadow-lg space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl font-bold">
            ✕
          </div>
          <h1 className="text-xl font-black text-zinc-900">التقرير غير مسجل أو غير صالح</h1>
          <p className="text-xs text-zinc-600 leading-relaxed">
            الرقم المرجعي <span className="font-mono font-bold text-zinc-900">{reference}</span> غير مسجل في أرشيف منظومة رَواق المالية، أو ربما تم إدخال الرمز بشكل غير صحيح.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block rounded-xl bg-zinc-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-zinc-800 transition"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const deptLabel = DEPT_NAMES[report.department] || report.department;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-950/5 via-zinc-50 to-zinc-100 flex items-center justify-center p-4 md:p-8 font-sans" dir="rtl">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-emerald-900/20 shadow-xl overflow-hidden">
        {/* Verification Header */}
        <div className="bg-emerald-950 text-white p-6 md:p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
          
          <div className="relative z-10 space-y-3">
            <div className="w-16 h-16 mx-auto bg-white rounded-2xl p-2 shadow-md flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/logo_rawaq.png"
                alt="شعار رَواق"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-300 font-mono tracking-widest block uppercase">
                RAWAQ OFFICIAL FINANCIAL CLEARING
              </span>
              <h1 className="text-xl md:text-2xl font-black text-white mt-1">
                بوابة التحقق من صحة الوثائق والتقارير الرسمية
              </h1>
            </div>

            <div className="inline-flex items-center gap-2 bg-emerald-900/80 border border-emerald-700/80 text-amber-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-inner">
              <span>✓</span>
              <span>مستند رسمي معتمد ومطابق في الأرشيف المالي</span>
            </div>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="p-6 md:p-8 space-y-6">
          {/* Reference Banner */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-zinc-500 text-xs block font-semibold">رقم المرجع التسلسلي الرسمي:</span>
              <span className="text-lg font-black font-mono text-emerald-950 block mt-0.5">
                {report.reference}
              </span>
            </div>
            <div className="text-left font-mono text-xs text-zinc-600">
              <span className="text-zinc-400 block text-[11px]">بصمة التشفير الرقمية (SHA-256):</span>
              <span className="text-zinc-700 block truncate max-w-[220px]" title={report.sha256Hash || report.verificationToken}>
                {report.sha256Hash ? `${report.sha256Hash.slice(0, 24)}...` : report.verificationToken.slice(0, 20)}
              </span>
            </div>
          </div>

          {/* Core Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">عنوان التقرير:</span>
              <strong className="text-zinc-900 font-bold block text-sm">{report.reportTitle}</strong>
              <span className="text-emerald-800 text-[11px] font-medium block">{deptLabel}</span>
            </div>

            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">الجهة المعنية:</span>
              <strong className="text-zinc-900 font-bold block text-sm">{report.targetEntityName || 'عام'}</strong>
              <span className="text-zinc-500 text-[11px] block">
                {report.periodFrom || report.periodTo
                  ? `${report.periodFrom ? new Date(report.periodFrom).toLocaleDateString('ar-JO') : ''} إلى ${report.periodTo ? new Date(report.periodTo).toLocaleDateString('ar-JO') : ''}`
                  : 'كافة الفترات'}
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">المسؤول الذي أصدر التقرير:</span>
              <strong className="text-zinc-900 font-bold block">{report.issuedByEmployeeName}</strong>
              <span className="text-zinc-500 text-[11px] block">{report.issuedByEmployeeRole}</span>
            </div>

            <div className="rounded-xl border border-zinc-200 p-3.5 space-y-1">
              <span className="text-zinc-500 font-semibold block text-[11px]">تاريخ ووقت الاعتماد والتجميد:</span>
              <strong className="text-zinc-900 font-bold block font-mono">
                {new Date(report.createdAt).toLocaleString('ar-JO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </strong>
              <span className="text-emerald-700 text-[11px] font-bold block">✓ معتمد رسمياً بختم رَواق</span>
            </div>
          </div>

          {/* Official Seal Snapshot Display */}
          <div className="rounded-2xl border-2 border-dashed border-emerald-900/30 bg-emerald-50/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={report.sealUrlSnapshot || '/brand/rawaq_official_seal.svg'}
                  alt="الختم الرسمي لرَواق"
                  className="w-full h-full object-contain filter drop-shadow-xs"
                />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-emerald-950">
                  الختم الرسمي للإدارة المالية والمطابقة
                </h4>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  هذه الوثيقة صادرة ومعتمدة وموثقة إلكترونياً من منصة رَواق للتجارة الإلكترونية، ومطابقة مباشرة لقاعدة البيانات المالية غير القابلة للتعديل.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-950 text-amber-300 font-mono whitespace-nowrap">
              VERIFIED 100%
            </span>
          </div>

          {/* Legal Footer */}
          <div className="pt-2 text-center text-[11px] text-zinc-400 space-y-1">
            <p>رَواق للتجارة الإلكترونية والتسويات المالية · المملكة الأردنية الهاشمية · عمان</p>
            <p>أي كشط أو تعديل أو اختلاف في الرقم المرجعي يلغي حجية الوثيقة قانونياً ومحاسبياً.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
