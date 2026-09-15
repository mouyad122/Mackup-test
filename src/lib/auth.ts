import { randomBytes, createHash } from 'crypto';
import * as argon2 from 'argon2';
import { prisma } from './db';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'makeup_session';
const SESSION_EXPIRATION_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  // Use faster argon2 parameters to reduce login time (especially useful in dev)
  return argon2.hash(password, { 
    type: argon2.argon2id,
    timeCost: 2,
    memoryCost: 19456, // 19 MB
    parallelism: 1
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function generateSessionToken(): string {
  // 256 bits = 32 bytes
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(employeeId: string, preFetchedRole?: string) {
  const token = generateSessionToken();
  const hashedToken = hashSessionToken(token);
  
  let roleName = preFetchedRole;
  if (!roleName) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { role: true }
    });
    roleName = employee?.role?.name || 'User';
  }
  
  const isCashier = roleName?.toUpperCase() === 'CASHIER';
  const lifetimeMs = isCashier ? 15 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + lifetimeMs);

  await prisma.session.create({
    data: {
      id: hashedToken,
      employeeId,
      expiresAt,
    },
  });

  return { token, expiresAt, role: roleName };
}

export async function validateSessionToken(token: string) {
  const hashedToken = hashSessionToken(token);
  const session = await prisma.session.findUnique({
    where: { id: hashedToken },
    include: {
      employee: {
        include: { role: true },
      },
    },
  });

  if (!session || !session.employee.isActive) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }
    return null;
  }

  const now = Date.now();
  const isCashier = session.employee.role.name === 'Cashier';

  // 1. Enforce absolute lifetime
  const absoluteLifetimeMs = isCashier
    ? 15 * 60 * 60 * 1000 // 15 hours for Cashier
    : 12 * 60 * 60 * 1000; // 12 hours for Admin
  if (now - session.createdAt.getTime() >= absoluteLifetimeMs) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // 2. Enforce idle timeout (only for Admin sessions, POS uses client-side idle lock)
  if (!isCashier) {
    const idleTimeoutMs = 30 * 60 * 1000; // 30 minutes
    if (now - session.lastActivityAt.getTime() >= idleTimeoutMs) {
      await prisma.session.delete({ where: { id: session.id } });
      return null;
    }
  }

  // 3. Enforce expiration fallback
  if (now >= session.expiresAt.getTime()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // Update last activity and slide session expiration only for non-cashiers
  if (isCashier) {
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date()
      }
    });
  } else {
    const newExpiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * SESSION_EXPIRATION_DAYS);
    await prisma.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        expiresAt: newExpiresAt
      },
    });
    session.expiresAt = newExpiresAt;
  }

  return session;
}

export async function invalidateSession(token: string) {
  const hashedToken = hashSessionToken(token);
  await prisma.session.deleteMany({
    where: { id: hashedToken },
  });
}

export async function setSessionCookie(token: string, expiresAt: Date, role?: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  });
  if (role) {
    cookieStore.set('makeup_role', role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    });
  }
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete('makeup_role');
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const session = await validateSessionToken(token);
  if (!session) {
    try {
      await deleteSessionCookie();
    } catch (e) {
      // Ignore error when called from Server Components during render phase
    }
    return null;
  }

  return session;
}
