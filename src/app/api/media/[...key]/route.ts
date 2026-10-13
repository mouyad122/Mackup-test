import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getObjectStorageClient, uploadsBucket } from '@/lib/object-storage';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.map(decodeURIComponent).join('/');

  // Only expose files that were created through the uploads flow.
  if (!key.startsWith('uploads/')) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const object = await getObjectStorageClient().send(new GetObjectCommand({
      Bucket: uploadsBucket,
      Key: key,
    }));
    const bytes = await object.Body?.transformToByteArray();

    if (!bytes) return new Response('Not found', { status: 404 });

    return new Response(new Uint8Array(bytes).buffer, {
      headers: {
        'Content-Type': object.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
