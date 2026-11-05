import { prisma } from '@/lib/db';
import { requirePermission } from '@/lib/dal';

export async function authorizeManifestAction(batchReference: string, secureToken?: string) {
  if (secureToken) {
    const batch = await prisma.deliveryBatch.findFirst({
      where: { reference: batchReference, secureToken },
      select: { id: true },
    });
    if (batch) return;
  }

  // Legacy manifests without a capability token remain staff-only.
  await requirePermission('manage:orders');
}
