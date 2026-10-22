import { prisma } from '../src/lib/db';
import { hashPassword } from '../src/lib/auth';

async function main() {
  const password = 'Rawaq!Admin7Kp2mQ9v';
  const passwordHash = await hashPassword(password);

  let adminRole = await prisma.role.findFirst({
    where: {
      OR: [
        { name: 'ADMIN' },
        { name: 'أدمن رئيسي' }
      ]
    }
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: 'ADMIN', description: 'System Administrator' }
    });
  }

  const accounts = [
    { email: 'admin@rawaq.local', name: 'مدير النظام رَواق' },
    { email: 'admin@cosmetics.local', name: 'System Admin' },
  ];

  for (const acc of accounts) {
    const employee = await prisma.employee.upsert({
      where: { email: acc.email },
      update: {
        name: acc.name,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        failedAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: false,
        mfaSecret: null,
        mfaRecoveryCodes: null,
        mustChangePassword: false,
        bootstrapCredential: false,
      },
      create: {
        email: acc.email,
        name: acc.name,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        failedAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: false,
        mustChangePassword: false,
        bootstrapCredential: false,
      }
    });

    console.log(`Configured admin user: ${employee.email} with role: ${adminRole.name}`);
  }

  // Clear all rate limit records to prevent lockout
  await prisma.rateLimitEvent.deleteMany({});
  console.log('Cleared rate limits.');

  process.exit(0);
}

main().catch(err => {
  console.error('Error seeding admin:', err);
  process.exit(1);
});
