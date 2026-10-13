const fs = require('fs');
let code = fs.readFileSync('scripts/simulate-business-day.ts', 'utf-8');
code = code.replace(
  "const employee = await prisma.employee.findFirst({ where: { isActive: true } });\n  if (!employee) throw new Error('No employee found for test');",
  `
  let employee = await prisma.employee.findFirst({ where: { isActive: true } });
  if (!employee) {
    const role = await prisma.role.findFirst() || await prisma.role.create({ data: { name: 'Admin Role' } });
    employee = await prisma.employee.create({
      data: {
        email: 'test@example.com',
        name: 'Test',
        passwordHash: 'dummy',
        roleId: role.id
      }
    });
  }
`
);
fs.writeFileSync('scripts/simulate-business-day.ts', code);
