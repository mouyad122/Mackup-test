import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var __prismaPool: Pool | undefined;
  var __prismaClient: PrismaClient | undefined;
  var __prismaClientVersion: string | undefined;
}

const PRISMA_SCHEMA_VERSION = 'v5_profits_payroll_2026';

const connectionString = (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL)
  ? process.env.TEST_DATABASE_URL
  : (process.env.DATABASE_URL || '');

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

// إعداد Connection Pool لتحمل أكبر عدد من المستخدمين بنفس الوقت
const poolConfig = {
  connectionString,
  // الحد الأقصى للاتصالات المتزامنة
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  // إغلاق الاتصال الخامل بعد 30 ثانية
  idleTimeoutMillis: 30000,
  // الحد الأقصى للانتظار على اتصال جديد (5 ثواني)
  connectionTimeoutMillis: 5000,
  min: 2,
  ...(!isLocal && { ssl: { rejectUnauthorized: false } }),
};

console.log('[DB Pool] isLocal:', isLocal);
console.log('[DB Pool] poolConfig ssl:', poolConfig.ssl);

let pool: Pool;
let prismaClient: PrismaClient;

function getClient(): PrismaClient {
  if (process.env.NODE_ENV === 'production') {
    if (!prismaClient) {
      pool = new Pool(poolConfig);
      pool.on('error', (err) => {
        console.error('[DB Pool] Unexpected error on idle client:', err.message);
      });
      const adapter = new PrismaPg(pool);
      prismaClient = new PrismaClient({ adapter });
    }
    return prismaClient;
  }

  // In development, ensure pool and fresh client
  if (!global.__prismaPool) {
    global.__prismaPool = new Pool(poolConfig);
    global.__prismaPool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });
  }
  pool = global.__prismaPool;

  const currentClient = global.__prismaClient as any;
  const isStale =
    !currentClient ||
    global.__prismaClientVersion !== PRISMA_SCHEMA_VERSION ||
    !currentClient.partnerShareRule;

  if (isStale) {
    try {
      if (typeof require !== 'undefined' && require.cache) {
        Object.keys(require.cache).forEach((key) => {
          if (key.includes('@prisma') || key.includes('.prisma')) {
            delete require.cache[key];
          }
        });
        const { PrismaClient: FreshPrismaClient } = require('@prisma/client');
        const adapter = new PrismaPg(pool);
        global.__prismaClient = new FreshPrismaClient({
          adapter,
          log: ['error', 'warn'],
        });
      } else {
        const adapter = new PrismaPg(pool);
        global.__prismaClient = new PrismaClient({
          adapter,
          log: ['error', 'warn'],
        });
      }
    } catch {
      const adapter = new PrismaPg(pool);
      global.__prismaClient = new PrismaClient({
        adapter,
        log: ['error', 'warn'],
      });
    }
    global.__prismaClientVersion = PRISMA_SCHEMA_VERSION;
  }
  if (!global.__prismaClient) {
    const adapter = new PrismaPg(pool);
    global.__prismaClient = new PrismaClient({ adapter, log: ['error', 'warn'] });
  }
  return global.__prismaClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

export { pool };

