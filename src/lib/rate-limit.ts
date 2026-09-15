import { prisma } from './db';
import { createHash } from 'crypto';

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * Checks and records a rate limit attempt.
 * Returns success = false if the rate limit is exceeded.
 * 
 * NOTE: Cleanup of expired events is handled by the nightly cron job
 * (/api/cron/cleanup-ratelimits) to avoid slowing down every request.
 */
export async function rateLimit(options: {
  key: string;       // Unique key (e.g., IP address, email, session token)
  route: string;     // Route or action name
  maxAttempts: number;
  durationMinutes: number;
}): Promise<{
  success: boolean;
  attempts: number;
  remaining: number;
  resetTime: Date;
}> {
  const hashedKey = hashKey(`${options.key}:${options.route}`);
  const now = new Date();
  const resetTime = new Date(now.getTime() + options.durationMinutes * 60 * 1000);

  // عد المحاولات النشطة فقط (بدون تنظيف في كل طلب)
  const count = await prisma.rateLimitEvent.count({
    where: {
      key: hashedKey,
      route: options.route,
      expireAt: { gt: now }
    }
  });

  if (count >= options.maxAttempts) {
    return {
      success: false,
      attempts: count,
      remaining: 0,
      resetTime
    };
  }

  // تسجيل المحاولة الجديدة
  await prisma.rateLimitEvent.create({
    data: {
      key: hashedKey,
      route: options.route,
      points: 1,
      expireAt: resetTime
    }
  });

  return {
    success: true,
    attempts: count + 1,
    remaining: options.maxAttempts - (count + 1),
    resetTime
  };
}

export async function checkRateLimit(key: string, route: string, maxAttempts: number, durationMinutes: number): Promise<boolean> {
  const result = await rateLimit({ key, route, maxAttempts, durationMinutes });
  return result.success;
}

/**
 * Gets the current failed attempt count and lock status for an account (email).
 */
export async function checkAccountLockout(email: string): Promise<{
  isLocked: boolean;
  lockoutTimeRemainingMinutes: number;
}> {
  const employee = await prisma.employee.findUnique({
    where: { email }
  });

  if (!employee) {
    return { isLocked: false, lockoutTimeRemainingMinutes: 0 };
  }

  if (employee.lockoutUntil && employee.lockoutUntil > new Date()) {
    const remainingMs = employee.lockoutUntil.getTime() - Date.now();
    return {
      isLocked: true,
      lockoutTimeRemainingMinutes: Math.ceil(remainingMs / (60 * 1000))
    };
  }

  return { isLocked: false, lockoutTimeRemainingMinutes: 0 };
}

/**
 * Records a failed login attempt for an account, locking it if threshold is reached.
 */
export async function recordFailedLoginAttempt(email: string): Promise<{
  attempts: number;
  locked: boolean;
  lockoutUntil: Date | null;
}> {
  const employee = await prisma.employee.findUnique({
    where: { email }
  });

  if (!employee) {
    return { attempts: 0, locked: false, lockoutUntil: null };
  }

  const newAttempts = employee.failedAttempts + 1;
  let lockoutUntil: Date | null = null;

  if (newAttempts >= 5) {
    lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      failedAttempts: newAttempts,
      lockoutUntil
    }
  });

  return {
    attempts: newAttempts,
    locked: newAttempts >= 5,
    lockoutUntil
  };
}

/**
 * Resets failed login attempt counter and unlocks account.
 */
export async function resetFailedLoginAttempts(email: string): Promise<void> {
  const employee = await prisma.employee.findUnique({
    where: { email }
  });

  if (employee) {
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        failedAttempts: 0,
        lockoutUntil: null
      }
    });
  }
}
