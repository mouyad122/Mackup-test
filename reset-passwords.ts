import { prisma } from './src/lib/db';
import * as argon2 from 'argon2';

async function main() {
  const newPassword = 'DahabPassword123!';
  const passwordHash = await argon2.hash(newPassword);

  // Update Admin (system@dahab.local)
  await prisma.employee.update({
    where: { email: 'system@dahab.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  // Update Admin 2 (admin@dahabperfume.local)
  await prisma.employee.update({
    where: { email: 'admin@dahabperfume.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  // Update Cashier (cashier@dahabperfume.local)
  await prisma.employee.update({
    where: { email: 'cashier@dahabperfume.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  console.log('Passwords updated successfully to:', newPassword);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
