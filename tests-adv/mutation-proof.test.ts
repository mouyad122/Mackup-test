import { vi, it } from 'vitest';
import fs from 'fs';

let currentToken: string | undefined;
vi.mock('server-only', () => ({}));
vi.mock('dotenv/config', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (u: string) => { throw new Error('NEXT_REDIRECT ' + u); } }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '10.0.0.9' }),
  cookies: async () => ({ get: (n: string) => (n === 'makeup_session' && currentToken ? { name: n, value: currentToken } : undefined), set() {}, delete() {}, getAll: () => [] }),
}));
vi.mock('next/cache', () => ({ revalidatePath() {}, revalidateTag() {}, unstable_cache: (f: any) => f }));

it('mutation proof with DB state', async () => {
  const { prisma } = await import('@/lib/db');
  const { createSession } = await import('@/lib/auth');
  const settings = await import('@/actions/settings-crud');
  const emps = await import('@/actions/employees');

  const tok = async (email: string) => {
    const e = await prisma.employee.findUnique({ where: { email } });
    return e ? ((await createSession(e.id, 'x')) as any).token as string : undefined;
  };
  const adminEmp = await prisma.employee.findFirst({ where: { role: { name: 'Admin' } } });
  const ids: Record<string, string | undefined> = {
    unauthenticated: undefined,
    restricted: await tok('qa-qarestricted@qa.invalid'),
    manager: await tok('qa-qamanager@qa.invalid'),
    admin: adminEmp ? ((await createSession(adminEmp.id, 'Admin')) as any).token : undefined,
  };
  const role = await prisma.role.findFirst({ where: { name: 'QA Restricted' } });
  const out: any[] = [];
  const run = async (who: string, op: string, fn: () => Promise<any>, dbCheck: () => Promise<any>) => {
    currentToken = ids[who];
    const before = JSON.stringify(await dbCheck());
    let res: string;
    try { res = JSON.stringify(await fn()).slice(0, 80); } catch (e: any) { res = 'THREW ' + String(e.message).slice(0, 70); }
    const after = JSON.stringify(await dbCheck());
    out.push({ who, op, res, dbChanged: before !== after });
  };
  const secVal = () => prisma.siteSettings.findUnique({ where: { key: 'security_settings' } }).then(r => r?.value ?? null);
  const taxVal = () => prisma.globalPricingSettings.findUnique({ where: { id: '1' } }).then(r => r ? { e: r.taxEnabled, r: r.taxRate } : null);
  const empCount = () => prisma.employee.count();
  for (const who of ['unauthenticated', 'restricted', 'manager', 'admin']) {
    if (who !== 'unauthenticated' && !ids[who]) continue;
    const n = Date.now() % 1000000;
    await run(who, 'updateSecuritySettings', () => settings.updateSecuritySettings({ passwordMinLength: 16 + (n % 3), requireMFA: true, maxLoginAttempts: 5 } as any, 'spoofed-admin-id'), secVal);
    await run(who, 'updateTaxSettings', () => settings.updateTaxSettings({ taxEnabled: false, taxRate: 0, pricesIncludeTax: true }, 'spoofed-admin-id'), taxVal);
    await run(who, 'createEmployee', () => emps.createEmployee({ name: 'QA X', email: `qa-x-${who}-${n}@qa.invalid`, password: 'Aa1!aaaaaaaaaaaaaaaaaaa', roleId: role!.id, isActive: true, selectedPermissionIds: [] } as any), empCount);
    await run(who, 'getIntegrationsSettings', () => settings.getIntegrationsSettings(), async () => 0);
  }
  fs.writeFileSync('/tmp/mutation-proof.json', JSON.stringify(out, null, 1));
  for (const o of out) console.log('ROW', JSON.stringify(o));
}, 120000);
