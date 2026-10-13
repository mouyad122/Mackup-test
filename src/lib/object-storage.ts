import 'server-only';
import { S3Client } from '@aws-sdk/client-s3';

export const uploadsBucket = process.env.S3_UPLOAD_BUCKET || 'uploads';

export function hasObjectStorageConfig() {
  return Boolean(
    process.env.AWS_ENDPOINT_URL_S3 &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_REGION,
  );
}

let objectStorageClient: S3Client | undefined;

export function getObjectStorageClient() {
  if (!hasObjectStorageConfig()) {
    throw new Error('إعدادات تخزين الملفات غير مكتملة.');
  }

  if (!objectStorageClient) {
    objectStorageClient = new S3Client({
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION,
      forcePathStyle: true,
    });
  }

  return objectStorageClient;
}

export function mediaUrlForKey(key: string) {
  return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}
