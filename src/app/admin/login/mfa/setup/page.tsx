'use client';

import React, { useActionState, use, useEffect, useState } from 'react';
import Link from 'next/link';
import { confirmMfaSetup, generateMfaSetup } from '@/actions/auth';
import Image from 'next/image';

export default function MfaSetupPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = use(searchParams);
  const [setupData, setSetupData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(confirmMfaSetup, null);

  useEffect(() => {
    if (!token) {
      setError('رمز الجلسة مفقود');
      return;
    }

    generateMfaSetup(token)
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setSetupData(data);
        }
      })
      .catch(() => {
        setError('حدث خطأ أثناء إعداد التحقق الثنائي');
      });
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4" dir="rtl">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg text-center">
          <p className="text-red-500 font-bold">{error}</p>
          <Link href="/admin/login" className="text-emerald-600 mt-4 inline-block underline">العودة لتسجيل الدخول</Link>
        </div>
      </div>
    );
  }

  if (!setupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50" dir="rtl">
        <p>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4 py-12" dir="rtl">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-lg border border-zinc-100">
        <div className="text-center">
          <h2 className="text-2xl font-extrabold text-zinc-900">إعداد التحقق بخطوتين</h2>
          <p className="mt-2 text-sm text-zinc-600">
            امسح رمز الاستجابة السريعة (QR Code) باستخدام تطبيق مثل Google Authenticator.
          </p>
        </div>

        <div className="flex justify-center my-6">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.qrUrl)}`} 
            alt="QR Code"
            width={200}
            height={200}
            className="border-4 border-white shadow-sm"
          />
        </div>

        <div className="bg-zinc-100 p-4 rounded text-center">
          <p className="text-xs font-bold text-zinc-700 mb-2">رمز الإعداد اليدوي:</p>
          <code className="text-sm tracking-widest text-emerald-700">{setupData.secret}</code>
        </div>

        <div className="bg-red-50 border border-red-100 p-4 rounded text-sm text-red-800">
          <p className="font-bold mb-2">رموز الاسترداد (Recovery Codes):</p>
          <p className="text-xs mb-3">احتفظ بهذه الرموز في مكان آمن، ستحتاجها إذا فقدت هاتفك.</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-center">
            {setupData.rawCodes.map((c: string, i: number) => (
              <span key={i} className="bg-white px-2 py-1 border border-red-200 rounded">{c}</span>
            ))}
          </div>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="token" value={token || ''} />
          <input type="hidden" name="secret" value={setupData.secret} />
          <input type="hidden" name="hashedCodes" value={JSON.stringify(setupData.hashedCodes)} />

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">رمز التحقق (6 أرقام)</label>
            <input
              type="text"
              name="code"
              maxLength={6}
              required
              className="appearance-none block w-full px-3 py-2.5 border border-zinc-300 rounded text-center tracking-widest font-bold text-lg focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="000000"
            />
          </div>

          {state?.error && (
            <div className="text-red-500 text-xs font-medium text-center bg-red-50 p-2.5 rounded">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70"
          >
            {isPending ? 'جاري التحقق...' : 'تأكيد الرمز'}
          </button>
        </form>
      </div>
    </div>
  );
}
