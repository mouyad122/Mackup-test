import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  prisma: { deliveryBatch: { findFirst: mocks.findFirst } },
}));
vi.mock('@/lib/dal', () => ({ requirePermission: mocks.requirePermission }));

import { authorizeManifestAction } from './delivery-manifest-access';

describe('delivery manifest capability authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePermission.mockRejectedValue(new Error('forbidden'));
  });

  it('allows an action only when the random token matches the batch reference', async () => {
    mocks.findFirst.mockResolvedValue({ id: 'batch-id' });

    await expect(authorizeManifestAction('BATCH-1', 'valid-secret-token')).resolves.toBeUndefined();
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { reference: 'BATCH-1', secureToken: 'valid-secret-token' },
      select: { id: true },
    });
    expect(mocks.requirePermission).not.toHaveBeenCalled();
  });

  it('rejects missing or invalid capability tokens for anonymous callers', async () => {
    mocks.findFirst.mockResolvedValue(null);

    await expect(authorizeManifestAction('BATCH-1')).rejects.toThrow('forbidden');
    await expect(authorizeManifestAction('BATCH-1', 'wrong-token')).rejects.toThrow('forbidden');
    expect(mocks.requirePermission).toHaveBeenCalledTimes(2);
  });
});
