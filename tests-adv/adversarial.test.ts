import { vi, it } from 'vitest';
vi.mock('dotenv/config', () => ({}));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: () => { throw new Error('redirect'); } }));
vi.mock('next/headers', () => ({ headers: async () => new Headers(), cookies: async () => ({ get: () => undefined, set() {}, delete() {} }) }));
vi.mock('next/cache', () => ({ revalidatePath() {}, revalidateTag() {} }));
vi.mock('@/lib/dal', async () => ({ requirePermission: async () => { const { prisma } = await import('@/lib/db'); const e = await prisma.employee.findFirst({ include: { role: true } }); return { employeeId: e?.id, role: e?.role?.name }; } }));
it('adversarial', async () => { const adversarialScript = await import('../scripts/test-adversarial'); await adversarialScript.default(); }, 60000);
