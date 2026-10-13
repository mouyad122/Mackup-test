'use client';

import { useActionState, useEffect, useState } from 'react';
import { login } from '@/actions/auth';
import Image from 'next/image';

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state?.requiresMfa && state?.mfaToken) {
      if (state.mfaSetupRequired) {
        window.location.href = `/admin/login/mfa/setup?token=${state.mfaToken}`;
      } else {
        window.location.href = `/admin/login/mfa?token=${state.mfaToken}`;
      }
    }
  }, [state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-ivory-100)] px-4 font-sans" dir="rtl">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-zinc-100">
        <div className="flex flex-col items-center">
          <div className="flex items-center justify-center w-28 h-28 mb-4">
            <img src="/brand/logo_rawaq.png" alt="Rawaq Logo" className="object-contain w-full h-full drop-shadow-md" />
          </div>
          <h2 className="text-center text-3xl font-heading font-extrabold text-[#3F4B32]">
            رَواق
          </h2>
          <p className="mt-2 text-center text-sm text-[#B7935F] font-bold">
            لوحة الإدارة والتحكم
          </p>
        </div>
        
        <form className="mt-8 space-y-6" action={formAction}>
          <input type="hidden" name="loginType" value="admin" />
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-zinc-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                dir="ltr"
                className="appearance-none relative block w-full px-3 py-2 border border-zinc-300 text-zinc-900 rounded-md focus:outline-none focus:ring-[#B7935F] focus:border-[#B7935F] sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-zinc-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  dir="ltr"
                  className="appearance-none relative block w-full pl-10 pr-3 py-2 border border-zinc-300 text-zinc-900 rounded-md focus:outline-none focus:ring-[#B7935F] focus:border-[#B7935F] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-400 hover:text-zinc-600 focus:outline-none"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {state?.error && (
            <div className="text-red-600 text-sm font-bold text-center bg-red-50 border border-red-200 p-3 rounded-md">
              {state.error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isPending}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-[#3F4B32] hover:bg-[#2d3623] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#3F4B32] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
