import { spawnSync } from 'child_process';
import path from 'path';

// Force use of the local test database without TLS
const localDbUrl = 'postgres://postgres:postgres@localhost:51214/makeup_test?sslmode=disable';

// Clean the environment so Prisma doesn't load the remote pooler string
const env = {
  ...process.env,
  DATABASE_URL: localDbUrl,
  TEST_DATABASE_URL: localDbUrl,
  NODE_ENV: 'test'
};

// Start the simulation script
console.log('--- Phase 9: Launching Business Day Simulation ---');
console.log(`Using Database: ${localDbUrl}`);

const result1 = spawnSync('npx', ['tsx', 'scripts/test-concurrent-checkout.ts'], { env, stdio: 'inherit', cwd: process.cwd() });
if (result1.status !== 0) process.exit(result1.status);
const result = spawnSync('npx', ['tsx', 'scripts/simulate-business-day.ts'], {
  env,
  stdio: 'inherit',
  cwd: process.cwd()
});

if (result.error) {
  console.error('Failed to start simulation:', result.error);
  process.exit(1);
}

process.exit(result.status || 0);
