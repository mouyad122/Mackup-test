'use server';

import { prisma } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie, deleteSessionCookie, invalidateSession, getCurrentSession } from '@/lib/auth';
import { verifyTOTP, generateTOTPSecret, getTOTPProvisioningUrl } from '@/lib/totp';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import crypto from 'crypto';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function checkRateLimit(ipAddress: string, route: string, maxPoints: number, windowMinutes: number) {
  const key = crypto.createHash('sha256').update(ipAddress).digest('hex');
  const now = new Date();
  
  // Cleanup expired
  await prisma.rateLimitEvent.deleteMany({
    where: { key, route, expireAt: { lt: now } }
  });

  const events = await prisma.rateLimitEvent.findMany({
    where: { key, route, expireAt: { gt: now } }
  });

  const totalPoints = events.reduce((sum, e) => sum + e.points, 0);

  if (totalPoints >= maxPoints) {
    return false;
  }

  await prisma.rateLimitEvent.create({
    data: {
      key,
      route,
      points: 1,
      expireAt: new Date(now.getTime() + windowMinutes * 60 * 1000)
    }
  });

  return true;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function login(prevState: any, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  if (!parsed.success) {
    return { error: 'يرجى التحقق من البريد الإلكتروني وكلمة المرور' };
  }

  if (!(await checkRateLimit(ipAddress, 'login', 10, 15))) {
    return { error: 'لقد تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة لاحقاً.' };
  }
  
  const { email, password } = parsed.data;
  const loginType = formData.get('loginType') as string;
  
  const employee = await prisma.employee.findUnique({
    where: { email },
    include: { role: true }
  });
  
  if (!employee) {
    await prisma.loginAttempt.create({
      data: { email, ipAddress, userAgent, success: false }
    });
    return { error: 'خطأ في البريد الإلكتروني أو كلمة المرور' };
  }

  if (!employee.isActive) {
    await prisma.loginAttempt.create({
      data: { email, ipAddress, userAgent, success: false, employeeId: employee.id }
    });
    return { error: 'الحساب معطل حالياً' };
  }

  // Account Lockout check
  if (employee.lockoutUntil && employee.lockoutUntil > new Date()) {
    return { error: `الحساب مقفل مؤقتاً بسبب محاولات فاشلة متكررة. حاول مجدداً بعد انتهاء مدة القفل.` };
  }

  // Role constraint checks based on login route
  const roleName = employee.role.name.toUpperCase();
  if (loginType === 'pos' && roleName !== 'CASHIER') {
    return { error: 'خطأ في البريد الإلكتروني أو كلمة المرور' };
  }
  if (loginType === 'admin' && roleName === 'CASHIER') {
    return { error: 'خطأ في البريد الإلكتروني أو كلمة المرور' };
  }

  const isValid = await verifyPassword(password, employee.passwordHash);
  
  if (!isValid) {
    // Increment failed attempts
    const newFailedCount = employee.failedAttempts + 1;
    const isLocking = newFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockoutUntil = isLocking ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        failedAttempts: newFailedCount,
        lockoutUntil
      }
    });

    await prisma.loginAttempt.create({
      data: { email, ipAddress, userAgent, success: false, employeeId: employee.id }
    });

    await prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        action: isLocking ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE',
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress,
        details: JSON.stringify({ failedAttempts: newFailedCount })
      }
    });

    if (isLocking) {
      return { error: `تم قفل الحساب بسبب 5 محاولات خاطئة متتالية. يرجى المحاولة بعد ${LOCKOUT_MINUTES} دقيقة.` };
    }

    return { error: 'خطأ في البريد الإلكتروني أو كلمة المرور' };
  }
  
  // MFA is temporarily disabled as per user request. 
  // It will only trigger if an employee has already explicitly enabled it.
  if (employee.mfaEnabled) {
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.pendingMfaChallenge.deleteMany({ where: { employeeId: employee.id } });
    await prisma.pendingMfaChallenge.create({
      data: {
        employeeId: employee.id,
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      }
    });
    return { requiresMfa: true, mfaToken: token, mfaSetupRequired: !employee.mfaEnabled };
  }

  // Success: Parallelize post-login DB ops for speed
  const [, , , sessionData] = await Promise.all([
    prisma.employee.update({
      where: { id: employee.id },
      data: { failedAttempts: 0, lockoutUntil: null }
    }),
    prisma.loginAttempt.create({
      data: { email, ipAddress, userAgent, success: true, employeeId: employee.id }
    }),
    prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        action: 'SESSION_CREATED',
        entityType: 'Session',
        entityId: employee.id,
        ipAddress
      }
    }),
    createSession(employee.id, roleName)
  ]);

  const { token, expiresAt, role } = sessionData;
  await setSessionCookie(token, expiresAt, role);
  
  if (employee.role.name.toLowerCase() === 'cashier') {
    redirect('/pos/cashier');
  } else {
    redirect('/admin');
  }
}

export async function verifyMfaLogin(prevState: any, formData: FormData) {
  const code = formData.get('code') as string;
  const token = formData.get('token') as string;

  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  if (!code || !token) {
    return { error: 'الرمز المدخل غير صالح' };
  }

  if (!(await checkRateLimit(ipAddress, 'mfa_verify', 5, 5))) {
    return { error: 'لقد تجاوزت الحد المسموح به من المحاولات. يرجى المحاولة لاحقاً.' };
  }

  const challenge = await prisma.pendingMfaChallenge.findUnique({
    where: { token },
    include: { employee: { include: { role: true } } }
  });

  if (!challenge || challenge.expiresAt < new Date()) {
    return { error: 'انتهت صلاحية جلسة تسجيل الدخول. يرجى المحاولة مرة أخرى.' };
  }

  const employee = challenge.employee;

  if (employee.lockoutUntil && employee.lockoutUntil > new Date()) {
    return { error: 'الحساب مقفل مؤقتاً' };
  }

  // 1. Replay Protection: Check if this code was recently used
  const replayKey = `last_mfa_code_${employee.id}`;
  const lastUsed = await prisma.siteSettings.findUnique({ where: { key: replayKey } });
  if (lastUsed && lastUsed.value === code) {
    return { error: 'تم استخدام هذا الرمز من قبل. يرجى الانتظار 30 ثانية لتوليد رمز جديد.' };
  }

  // 2. Verify TOTP Code or hashed Recovery Code
  let isVerified = false;
  if (employee.mfaSecret) {
    isVerified = verifyTOTP(employee.mfaSecret, code);
  }

  // Check recovery code if not verified by TOTP
  if (!isVerified && employee.mfaRecoveryCodes) {
    try {
      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
      const codes: string[] = JSON.parse(employee.mfaRecoveryCodes);
      const codeIndex = codes.indexOf(hashedInput);
      
      if (codeIndex > -1) {
        isVerified = true;
        // Omit/remove used recovery code
        codes.splice(codeIndex, 1);
        await prisma.employee.update({
          where: { id: employee.id },
          data: { mfaRecoveryCodes: JSON.stringify(codes) }
        });
      }
    } catch {}
  }

  if (!isVerified) {
    const newFailedCount = employee.failedAttempts + 1;
    const isLocking = newFailedCount >= MAX_FAILED_ATTEMPTS;
    const lockoutUntil = isLocking ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : null;

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        failedAttempts: newFailedCount,
        lockoutUntil
      }
    });

    await prisma.auditLog.create({
      data: {
        employeeId: employee.id,
        action: 'MFA_VERIFICATION_FAILURE',
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress,
        details: JSON.stringify({ failedAttempts: newFailedCount })
      }
    });

    if (isLocking) {
      return { error: `تم قفل الحساب بسبب محاولات خاطئة متتالية. يرجى المحاولة بعد ${LOCKOUT_MINUTES} دقيقة.` };
    }
    return { error: 'رمز التحقق الثنائي غير صحيح' };
  }

  // Save verified code for replay protection
  await prisma.siteSettings.upsert({
    where: { key: replayKey },
    update: { value: code },
    create: { key: replayKey, value: code }
  });

  // Success: Reset failures and start session
  await prisma.employee.update({
    where: { id: employee.id },
    data: { failedAttempts: 0, lockoutUntil: null }
  });

  await prisma.loginAttempt.create({
    data: { email: employee.email, ipAddress, userAgent, success: true, employeeId: employee.id }
  });

  await prisma.pendingMfaChallenge.delete({ where: { id: challenge.id } });

  const { token: sessionToken, expiresAt, role } = await createSession(employee.id);
  await setSessionCookie(sessionToken, expiresAt, role);

  if (employee.role.name.toLowerCase() === 'cashier') {
    redirect('/pos/cashier');
  } else {
    redirect('/admin');
  }
}

export async function generateMfaSetup(token: string) {
  const challenge = await prisma.pendingMfaChallenge.findUnique({
    where: { token },
    include: { employee: true }
  });

  if (!challenge || challenge.expiresAt < new Date() || challenge.employee.mfaEnabled) {
    return { error: 'Invalid or expired setup token' };
  }

  const secret = generateTOTPSecret();
  const qrUrl = getTOTPProvisioningUrl(challenge.employee.email, secret);
  
  const rawCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex'));
  const hashedCodes = rawCodes.map(c => crypto.createHash('sha256').update(c).digest('hex'));

  return { secret, qrUrl, rawCodes, hashedCodes };
}

export async function confirmMfaSetup(prevState: any, formData: FormData) {
  const token = formData.get('token') as string;
  const secret = formData.get('secret') as string;
  const code = formData.get('code') as string;
  const hashedCodesJson = formData.get('hashedCodes') as string;

  if (!token || !secret || !code || !hashedCodesJson) {
    return { error: 'بيانات مفقودة' };
  }

  const challenge = await prisma.pendingMfaChallenge.findUnique({
    where: { token },
    include: { employee: { include: { role: true } } }
  });

  if (!challenge || challenge.expiresAt < new Date()) {
    return { error: 'انتهت صلاحية الجلسة' };
  }

  const isValid = verifyTOTP(secret, code);
  if (!isValid) {
    return { error: 'الرمز غير صحيح' };
  }

  const employee = challenge.employee;

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      mfaSecret: secret,
      mfaRecoveryCodes: hashedCodesJson,
      mfaEnabled: true
    }
  });

  await prisma.pendingMfaChallenge.delete({ where: { id: challenge.id } });

  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
  const userAgent = headersList.get('user-agent') || 'unknown';

  await prisma.loginAttempt.create({
    data: { email: employee.email, ipAddress, userAgent, success: true, employeeId: employee.id }
  });

  const { token: sessionToken, expiresAt, role } = await createSession(employee.id);
  await setSessionCookie(sessionToken, expiresAt, role);

  if (employee.role.name.toLowerCase() === 'cashier') {
    redirect('/pos/cashier');
  } else {
    redirect('/admin');
  }
}

export async function logout() {
  const session = await getCurrentSession();
  let redirectUrl = '/admin/login';

  if (session) {
    if (session.employee?.role?.name?.toUpperCase() === 'CASHIER') {
      redirectUrl = '/pos/login';
    }
    const { cookies } = await import('next/headers');
    const token = (await cookies()).get('makeup_session')?.value;
    if (token) {
      await invalidateSession(token);
      
      const headersList = await headers();
      const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
      
      await prisma.auditLog.create({
        data: {
          employeeId: session.employeeId,
          action: 'SESSION_REVOKED',
          entityType: 'Session',
          entityId: session.id,
          ipAddress,
          details: 'User logged out'
        }
      });
    }
  }
  await deleteSessionCookie();
  redirect(redirectUrl);
}

export async function verifyUnlockPassword(password: string) {
  const session = await getCurrentSession();
  if (!session) return { success: false, error: 'الجلسة منتهية' };

  const employee = await prisma.employee.findUnique({
    where: { id: session.employeeId }
  });

  if (!employee) return { success: false, error: 'الموظف غير موجود' };

  const isValid = await verifyPassword(password, employee.passwordHash);
  if (!isValid) return { success: false, error: 'كلمة المرور غير صحيحة' };

  return { success: true };
}
