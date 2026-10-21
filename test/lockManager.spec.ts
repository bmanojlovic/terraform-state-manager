import { describe, it, expect, beforeEach, vi } from 'vitest';
import { acquireLock, releaseLock, getLockInfo } from '../src/lockManager';
import { Env } from '../src/types';

describe('Lock Manager', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn(),
        run: vi.fn(),
      } as any,
    } as Env;
  });

  describe('acquireLock', () => {
    it('should acquire a lock when none exists', async () => {
      mockEnv.DB.first.mockResolvedValue(null);
      mockEnv.DB.run.mockResolvedValue({ success: true });

      const lockInfo = { ID: 'test-lock', Operation: 'test' };
      const response = await acquireLock('test-project', 'test-state', lockInfo, mockEnv);
      
      expect(response.status).toBe(200);
      expect(JSON.parse(await response.text())).toHaveProperty('ID', 'test-lock');
    });

    it('should return existing lock info when lock is already held', async () => {
      const existingLock = { ID: 'existing-lock', Operation: 'test', Created: new Date().toISOString() };
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify(existingLock) });

      const lockInfo = { ID: 'test-lock', Operation: 'test' };
      const response = await acquireLock('test-project', 'test-state', lockInfo, mockEnv);
      
      expect(response.status).toBe(423);
      expect(JSON.parse(await response.text())).toEqual(existingLock);
    });

    it('should overwrite a stale lock older than the TTL', async () => {
      // Lock created well beyond the TTL (default 30 min) -> treated as stale
      const staleCreated = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1h ago
      const staleLock = { ID: 'stale-lock', Operation: 'apply', Created: staleCreated };
      // 1st first() = existing lock lookup; 2nd first() = config TTL lookup (default)
      mockEnv.DB.first
        .mockResolvedValueOnce({ lock_info: JSON.stringify(staleLock) })
        .mockResolvedValueOnce({ value: '30' });
      mockEnv.DB.run.mockResolvedValue({ success: true });

      const lockInfo = { ID: 'new-lock', Operation: 'apply' };
      const response = await acquireLock('test-project', 'test-state', lockInfo, mockEnv);

      // Should succeed by taking over the expired lock, not return 423
      expect(response.status).toBe(200);
      expect(JSON.parse(await response.text())).toHaveProperty('ID', 'new-lock');
    });

    it('should hold a fresh lock that is within the TTL', async () => {
      const freshCreated = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
      const freshLock = { ID: 'fresh-lock', Operation: 'apply', Created: freshCreated };
      mockEnv.DB.first
        .mockResolvedValueOnce({ lock_info: JSON.stringify(freshLock) })
        .mockResolvedValueOnce({ value: '30' });

      const lockInfo = { ID: 'new-lock', Operation: 'apply' };
      const response = await acquireLock('test-project', 'test-state', lockInfo, mockEnv);

      expect(response.status).toBe(423);
      expect(JSON.parse(await response.text())).toHaveProperty('ID', 'fresh-lock');
    });
  });

  describe('releaseLock', () => {
    it('should release an existing lock', async () => {
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify({ ID: 'test-lock' }) });
      mockEnv.DB.run.mockResolvedValue({ success: true });

      const response = await releaseLock('test-project', 'test-state', { ID: 'test-lock' }, mockEnv);
      
      expect(response.status).toBe(200);
    });

    it('should return 404 when releasing a lock that does not exist', async () => {
      mockEnv.DB.first.mockResolvedValue(null);

      const response = await releaseLock('test-project', 'test-state', { ID: 'test-lock' }, mockEnv);

      expect(response.status).toBe(404);
    });

    it('should return 400 on lock ID mismatch', async () => {
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify({ ID: 'held-lock' }) });

      const response = await releaseLock('test-project', 'test-state', { ID: 'other-lock' }, mockEnv);

      expect(response.status).toBe(400);
    });

    it('should force-release when no ID is supplied', async () => {
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify({ ID: 'held-lock' }) });
      mockEnv.DB.run.mockResolvedValue({ success: true });

      const response = await releaseLock('test-project', 'test-state', {}, mockEnv);

      expect(response.status).toBe(200);
    });
  });

  describe('getLockInfo', () => {
    it('should return lock info if lock exists', async () => {
      const lockInfo = { ID: 'test-lock', Operation: 'test' };
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify(lockInfo) });

      const response = await getLockInfo('test-project', 'test-state', mockEnv);
      
      expect(response.status).toBe(200);
      expect(JSON.parse(await response.text())).toEqual(lockInfo);
    });

    it('should return 200 with locked:false if no lock exists', async () => {
      mockEnv.DB.first.mockResolvedValue(null);

      const response = await getLockInfo('test-project', 'test-state', mockEnv);
      
      expect(response.status).toBe(200);
      expect(JSON.parse(await response.text())).toEqual({ locked: false });
    });
  });
});
