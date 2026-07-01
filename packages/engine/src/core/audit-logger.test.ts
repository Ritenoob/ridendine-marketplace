import { describe, expect, it, vi } from 'vitest';
import { AuditLogger } from './audit-logger';

function createClient() {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ insert }));

  return {
    client: { from },
    from,
    insert,
  };
}

describe('AuditLogger', () => {
  it('writes required audit actor columns for customer actors', async () => {
    const { client, insert } = createClient();
    const logger = new AuditLogger(client as any);

    await logger.log({
      action: 'create',
      entityType: 'order',
      entityId: 'order-1',
      actor: {
        userId: 'user-1',
        role: 'customer',
      },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'user',
        actor_id: 'user-1',
        user_id: 'user-1',
        actor_role: 'customer',
      })
    );
  });

  it('maps ops and system actors to audit-log compatible actor types', async () => {
    const opsClient = createClient();
    await new AuditLogger(opsClient.client as any).log({
      action: 'override',
      entityType: 'order',
      entityId: 'order-1',
      actor: {
        userId: 'ops-1',
        role: 'ops_admin',
      },
    });

    const systemClient = createClient();
    await new AuditLogger(systemClient.client as any).log({
      action: 'status_change',
      entityType: 'order',
      entityId: 'order-1',
      actor: {
        userId: 'system',
        role: 'system',
      },
    });

    expect(opsClient.insert).toHaveBeenCalledWith(expect.objectContaining({ actor_type: 'admin' }));
    expect(systemClient.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_type: 'system',
        actor_id: null,
        user_id: null,
      })
    );
  });
});
