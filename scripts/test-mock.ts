import Module from 'module';

const originalRequire = (Module as any).prototype.require;
(Module as any).prototype.require = function (this: any, id: string, ...args: any[]) {
  if (id === 'next/headers') {
    return {
      headers: async () => new Map([['x-forwarded-for', '127.0.0.1']]),
      cookies: async () => ({ get: () => undefined }),
    };
  }
  if (id.includes('lib/dal') || id === '@/lib/dal') {
    return {
      requirePermission: async () => ({ employeeId: 'test-employee' }),
    };
  }
  return originalRequire.apply(this, [id, ...args]);
};

async function run() {
  const { processPOSCheckout } = await import('../src/actions/pos');
  console.log("processPOSCheckout loaded:", typeof processPOSCheckout);
}
run();
