import { getDB, generateId, now } from '../indexeddb/database';
import type { SyncQueueItem, SyncOperation, SyncStatus } from '../../types';
import type { StoredSyncMeta } from '../indexeddb/database';

export const syncRepository = {

  // ── Sync metadata ───────────────────────────────────────────────────────────

  async setStatus(entityType: string, entityId: string, status: SyncStatus, errorMessage?: string): Promise<void> {
    const db = getDB();
    const id = `${entityType}:${entityId}`;
    const existing = await db.syncMeta.get(id);
    const ts = now();
    const row: StoredSyncMeta = {
      id,
      entityType,
      entityId,
      status,
      localUpdatedAt: ts,
      remoteUpdatedAt: existing?.remoteUpdatedAt,
      lastSyncedAt: status === 'synced' ? ts : existing?.lastSyncedAt,
      errorMessage: status === 'error' ? errorMessage : undefined,
    };
    await db.syncMeta.put(row);
  },

  async getStatus(entityType: string, entityId: string): Promise<SyncStatus> {
    const db = getDB();
    const row = await db.syncMeta.get(`${entityType}:${entityId}`);
    return row?.status ?? 'pending';
  },

  async getPendingCount(): Promise<number> {
    return getDB().syncMeta.where('status').anyOf(['pending', 'syncing', 'error']).count();
  },

  // ── Sync queue ──────────────────────────────────────────────────────────────

  async enqueue(entityType: string, entityId: string, operation: SyncOperation): Promise<void> {
    const db = getDB();
    // Avoid duplicate queuing
    const existing = await db.syncQueue
      .filter(item =>
        item.entityType === entityType &&
        item.entityId === entityId &&
        item.status === 'queued'
      )
      .first();
    if (existing) return;

    const item: SyncQueueItem = {
      id: generateId('sq'),
      entityType,
      entityId,
      operation,
      createdAt: now(),
      attemptCount: 0,
      status: 'queued',
    };
    await db.syncQueue.add(item);
  },

  async dequeue(limit = 10): Promise<SyncQueueItem[]> {
    return getDB().syncQueue
      .where('status').equals('queued')
      .limit(limit)
      .toArray();
  },

  async markProcessing(id: string): Promise<void> {
    await getDB().syncQueue.update(id, {
      status: 'processing',
      lastAttemptAt: now(),
    });
  },

  async markDone(id: string): Promise<void> {
    await getDB().syncQueue.delete(id);
  },

  async markFailed(id: string, errorMessage: string): Promise<void> {
    const item = await getDB().syncQueue.get(id);
    if (!item) return;
    const attemptCount = (item.attemptCount ?? 0) + 1;
    await getDB().syncQueue.update(id, {
      status: attemptCount >= 3 ? 'failed' : 'queued',
      attemptCount,
      errorMessage,
      lastAttemptAt: now(),
    });
  },

  async clearCompleted(): Promise<void> {
    // Queue items are deleted on success, so just clean up old failures
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    await getDB().syncQueue
      .filter(item => item.status === 'failed' && item.createdAt < cutoff)
      .delete();
  },
};

// ── Drive metadata ─────────────────────────────────────────────────────────────

import type { DriveMetadata } from '../../types';

export const driveMetaRepository = {

  async get(): Promise<DriveMetadata> {
    const row = await getDB().driveMeta.get('singleton');
    if (!row) return {};
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...meta } = row;
    return meta as DriveMetadata;
  },

  async save(meta: DriveMetadata): Promise<void> {
    await getDB().driveMeta.put({ id: 'singleton', ...meta });
  },

  async patch(partial: Partial<DriveMetadata>): Promise<void> {
    const current = await this.get();
    await this.save({ ...current, ...partial });
  },
};
