const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('Tests require TEST_DATABASE_URL pointing to the isolated local makeup_test database.');
}

let testDatabase: URL;
try {
  testDatabase = new URL(testDatabaseUrl);
} catch {
  throw new Error('TEST_DATABASE_URL must be a valid local PostgreSQL URL.');
}

const allowedHosts = new Set(['localhost', '127.0.0.1', '::1']);
if (!allowedHosts.has(testDatabase.hostname) || testDatabase.pathname !== '/makeup_test') {
  throw new Error('Tests are blocked unless TEST_DATABASE_URL targets local database makeup_test.');
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dummy.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-only';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-only';
delete process.env.SUPABASE_SERVICE_ROLE_KEY;
delete process.env.SUPABASE_SECRET_KEY;
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
delete process.env.AWS_ENDPOINT_URL_S3;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_REGION;
delete process.env.S3_UPLOAD_BUCKET;
