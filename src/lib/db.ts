import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  var __prismaPool: Pool | undefined;
  var __prismaClient: PrismaClient | undefined;
}

const connectionString = (process.env.NODE_ENV === 'test' && process.env.TEST_DATABASE_URL)
  ? process.env.TEST_DATABASE_URL
  : (process.env.DATABASE_URL || '');

// إعداد Connection Pool لتحمل أكبر عدد من المستخدمين بنفس الوقت
const poolConfig = {
  connectionString,
  // الحد الأقصى للاتصالات المتزامنة
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  // إغلاق الاتصال الخامل بعد 30 ثانية
  idleTimeoutMillis: 30000,
  // الحد الأقصى للانتظار على اتصال جديد (5 ثواني)
  connectionTimeoutMillis: 5000,
  // الحد الأدنى للاتصالات الجاهزة
  min: 2,
};

let pool: Pool;
let prismaClient: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool(poolConfig);
  pool.on('error', (err) => {
    console.error('[DB Pool] Unexpected error on idle client:', err.message);
  });
  const adapter = new PrismaPg(pool);
  prismaClient = new PrismaClient({ adapter });
} else {
  // In development, strictly cache the client and pool
  if (!global.__prismaPool) {
    global.__prismaPool = new Pool(poolConfig);
    global.__prismaPool.on('error', (err) => {
      console.error('[DB Pool] Unexpected error on idle client:', err.message);
    });
  }
  pool = global.__prismaPool;

  if (!global.__prismaClient) {
    const adapter = new PrismaPg(pool);
    global.__prismaClient = new PrismaClient({
      adapter,
      log: ['error', 'warn'],
    });
  }
  prismaClient = global.__prismaClient;
}

export const prisma = prismaClient;
export { pool };


