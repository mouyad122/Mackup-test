import { prisma } from './src/lib/db';
import { hashPassword } from './src/lib/auth';

async function main() {
  const passwordHash = await hashPassword('CosmeticsPassword123!');
  
  let role = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
  if (!role) {
    role = await prisma.role.create({ data: { name: 'ADMIN', description: 'System Administrator' } });
  }

  const admins = [
    { email: 'admin@cosmetics.local', name: 'System Admin' },
    { email: 'admin2@cosmetics.local', name: 'System Admin 2' },
  ];

  for (const admin of admins) {
    await prisma.employee.upsert({
      where: { email: admin.email },
      update: {
        name: admin.name,
        passwordHash,
        roleId: role.id,
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
        email: admin.email,
        name: admin.name,
        passwordHash,
        roleId: role.id,
        isActive: true,
        mfaEnabled: false,
        mustChangePassword: false,
        bootstrapCredential: false,
      }
    });
  }

  console.log('Two admin users successfully configured.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
