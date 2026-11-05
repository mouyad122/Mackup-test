export default async function globalSetup() {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw) throw new Error('E2E tests require TEST_DATABASE_URL for isolated local database makeup_test.');

  let database: URL;
  try {
    database = new URL(raw);
  } catch {
    throw new Error('TEST_DATABASE_URL must be a valid local PostgreSQL URL.');
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(database.hostname) || database.pathname !== '/makeup_test') {
    throw new Error('E2E tests are blocked unless TEST_DATABASE_URL targets local database makeup_test.');
  }

  const targetUrl = new URL(process.env.BASE_URL || 'http://localhost:3000');
  if (targetUrl.protocol !== 'http:' || !['localhost', '127.0.0.1', '::1'].includes(targetUrl.hostname) || targetUrl.port !== '3000') {
    throw new Error('E2E tests are blocked unless BASE_URL targets the local app at http://localhost:3000.');
  }

  // Prevent tests from inheriting credentials for real integrations from local env files.
  process.env.E2E_TEST_MODE = '1';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-only';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-only';
  for (const key of [
    'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEY',
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID',
    'AWS_ENDPOINT_URL_S3', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION',
  ]) delete process.env[key];
}
