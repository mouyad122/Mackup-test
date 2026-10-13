import { vi, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

let currentToken: string | undefined;
vi.mock('server-only', () => ({}));
vi.mock('dotenv/config', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (u: string) => { throw new Error('NEXT_REDIRECT ' + u); }, notFound: () => { throw new Error('NOT_FOUND'); } }));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '10.0.0.9' }),
  cookies: async () => ({
    get: (n: string) => (n === 'makeup_session' && currentToken ? { name: n, value: currentToken } : undefined),
    set() {}, delete() {}, getAll: () => [],
  }),
}));
vi.mock('next/cache', () => ({ revalidatePath() {}, revalidateTag() {}, unstable_cache: (f: any) => f }));

const SKIP = new Set(['auth.ts', 'checkout.ts', 'shop.ts']);
const BLOCK = /Unauthorized|NEXT_REDIRECT|غير مصرح|not authorized|forbidden|permission/i;

it('rbac matrix', async () => {
  const { prisma } = await import('@/lib/db');
  const { createSession } = await import('@/lib/auth');

  async function mkIdentity(roleName: string, perms: string[]) {
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } });
    for (const action of perms) {
      const p = await prisma.permission.upsert({ where: { action }, update: {}, create: { action } });
      await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } }, update: {}, create: { roleId: role.id, permissionId: p.id } });
    }
    const email = `qa-${roleName.replace(/\W/g, '').toLowerCase()}@qa.invalid`;
    const emp = await prisma.employee.upsert({ where: { email }, update: { roleId: role.id, isActive: true }, create: { email, name: roleName, passwordHash: 'x', roleId: role.id } });
    const s: any = await createSession(emp.id, roleName);
    return s.token as string;
  }

  const ids: Record<string, string | undefined> = {
    unauthenticated: undefined,
    restricted: await mkIdentity('QA Restricted', []),
    manager: await mkIdentity('QA Manager', ['manage:inventory', 'manage:products']),
  };
  const adminEmp = await prisma.employee.findFirst({ where: { role: { name: 'Admin' } } });
  if (adminEmp) ids.admin = ((await createSession(adminEmp.id, 'Admin')) as any).token;

  const dir = path.resolve(__dirname, '../src/actions');
  const rows: any[] = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.ts') && !SKIP.has(f))) {
    const mod: any = await import(path.join(dir, f));
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function') continue;
      for (const who of ['unauthenticated', 'restricted']) {
        currentToken = ids[who];
        let outcome: string;
        try {
          const r: any = await Promise.race([(fn as any)(), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 8000))]);
          outcome = r && r.error && BLOCK.test(String(r.error)) ? 'BLOCKED(result)' : 'NOT_BLOCKED:' + JSON.stringify(r)?.slice(0, 60);
        } catch (e: any) {
          outcome = BLOCK.test(String(e.message)) ? 'BLOCKED' : 'NOT_BLOCKED(threw:' + String(e.message).slice(0, 50) + ')';
        }
        rows.push({ file: f, action: name, who, outcome });
      }
    }
  }

  // Positive/negative control with DB verification: createWarehouse (manage:inventory)
  const { createWarehouse } = await import('@/actions/warehouses');
  const ctl: any[] = [];
  for (const who of ['unauthenticated', 'restricted', 'manager', 'admin']) {
    currentToken = ids[who];
    if (who !== 'unauthenticated' && !ids[who]) continue;
    const code = `QA-${who}-${Date.now() % 100000}`;
    const fd = new FormData(); fd.set('name', code); fd.set('code', code);
    let res: string;
    try { const r: any = await createWarehouse(fd); res = JSON.stringify(r); } catch (e: any) { res = 'THREW ' + String(e.message).slice(0, 60); }
    const created = await prisma.warehouse.count({ where: { code } });
    ctl.push({ who, op: 'createWarehouse', res, dbRowsCreated: created });
  }
  fs.writeFileSync('/tmp/rbac-matrix.json', JSON.stringify({ rows, ctl }, null, 1));
  console.log('CONTROL', JSON.stringify(ctl));
  console.log('NOT_BLOCKED count', rows.filter(r => r.outcome.startsWith('NOT_BLOCKED')).length, 'of', rows.length);
}, 600000);
