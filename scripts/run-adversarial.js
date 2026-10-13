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

console.log('--- Phase 9: Launching Adversarial Tests ---');
console.log(`Using Database: ${localDbUrl}`);

const result = spawnSync('npx', ['vitest', 'run', 'tests-adv/adversarial.test.ts'], {
  env,
  stdio: 'inherit',
  cwd: process.cwd()
});

if (result.error) {
  console.error('Failed to start adversarial test:', result.error);
  process.exit(1);
}

process.exit(result.status || 0);
