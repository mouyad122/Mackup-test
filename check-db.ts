import { prisma } from './src/lib/db';
async function main() {
  const attempts = await prisma.loginAttempt.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log('Recent attempts in NEW DB:');
  console.table(attempts.map(a => ({ email: a.email, success: a.success, time: a.createdAt })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
