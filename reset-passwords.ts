import { prisma } from './src/lib/db';
import * as argon2 from 'argon2';

async function main() {
  const newPassword = 'CosmeticsPassword123!';
  const passwordHash = await argon2.hash(newPassword);

  // Update Admin (system@cosmetics.local)
  await prisma.employee.update({
    where: { email: 'system@cosmetics.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  // Update Admin 2 (admin@cosmetics.local)
  await prisma.employee.update({
    where: { email: 'admin@cosmetics.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  // Update Cashier (cashier@cosmetics.local)
  await prisma.employee.update({
    where: { email: 'cashier@cosmetics.local' },
    data: { passwordHash, isActive: true, failedAttempts: 0, lockoutUntil: null }
  });

  console.log('Passwords updated successfully to:', newPassword);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
