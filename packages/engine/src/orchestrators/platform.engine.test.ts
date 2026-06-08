import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActorContext } from '@ridendine/types';
import { PlatformWorkflowEngine } from './platform.engine';
import { getDriverById, updateDriver } from '@ridendine/db';

vi.mock('@ridendine/db', () => ({
  getChefById: vi.fn(),
  getDriverById: vi.fn(),
  getStorefrontByChefId: vi.fn(),
  getStorefrontById: vi.fn(),
  updateChefProfile: vi.fn(),
  updateDriver: vi.fn(),
  updateStorefront: vi.fn(),
}));

const actor: ActorContext = {
  userId: 'ops-1',
  role: 'ops_admin',
};

function makeEngine() {
  return new PlatformWorkflowEngine(
    {} as never,
    { emit: vi.fn(), flush: vi.fn() } as never,
    { log: vi.fn() } as never,
    {} as never,
    {} as never,
    {} as never
  );
}

describe('PlatformWorkflowEngine driver governance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires an audit reason when restoring a suspended driver', async () => {
    vi.mocked(getDriverById).mockResolvedValue({
      id: 'driver-1',
      user_id: null,
      first_name: 'Sean',
      last_name: 'Driver',
      status: 'suspended',
    } as never);
    vi.mocked(updateDriver).mockResolvedValue({
      id: 'driver-1',
      user_id: null,
      first_name: 'Sean',
      last_name: 'Driver',
      status: 'approved',
    } as never);

    const result = await makeEngine().updateDriverGovernance('driver-1', 'approved', actor);

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('REASON_REQUIRED');
    expect(updateDriver).not.toHaveBeenCalled();
  });
});
