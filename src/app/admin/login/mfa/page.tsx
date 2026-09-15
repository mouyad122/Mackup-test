'use client';

import React, { useActionState, use } from 'react';
import { verifyMfaLogin } from '@/actions/auth';

export default function AdminMfaLoginPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = use(searchParams);
  const [state, formAction, isPending] = useActionState(verifyMfaLogin, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4" dir="rtl">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-lg border border-zinc-100 dark:border-zinc-700">
        <div>
          <h2 className="mt-6 text-center text-2xl font-extrabold text-zinc-900 dark:text-white">
            التحقق بخطوتين (MFA)
          </h2>
          <p className="mt-2 text-center text-xs text-zinc-650 dark:text-zinc-400">
            يرجى إدخال الرمز المكون من 6 أرقام من تطبيق التحقق الخاص بك، أو أحد رموز الطوارئ المتبقية.
          </p>
        </div>

        <form className="mt-6 space-y-6" action={formAction}>
          <input type="hidden" name="token" value={token || ''} />

          <div className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                رمز التحقق الثنائي
              </label>
              <input
                id="code"
                name="code"
                type="text"
                maxLength={10}
                required
                className="appearance-none relative block w-full px-3 py-2.5 border border-zinc-300 dark:border-zinc-600 placeholder-zinc-500 text-zinc-900 dark:text-white rounded focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 text-center tracking-widest font-bold text-lg dark:bg-zinc-700"
                placeholder="000000"
              />
            </div>
          </div>

          {state?.error && (
            <div className="text-red-500 text-xs font-medium text-center bg-red-50 p-2.5 rounded">
              {state.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent text-xs font-bold rounded text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'جاري التحقق...' : 'تأكيد الرمز والدخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
