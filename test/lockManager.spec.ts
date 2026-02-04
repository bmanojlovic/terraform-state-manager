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
      const existingLock = { ID: 'existing-lock', Operation: 'test' };
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify(existingLock) });

      const lockInfo = { ID: 'test-lock', Operation: 'test' };
      const response = await acquireLock('test-project', 'test-state', lockInfo, mockEnv);
      
      expect(response.status).toBe(423);
      expect(JSON.parse(await response.text())).toEqual(existingLock);
    });
  });

  describe('releaseLock', () => {
    it('should release an existing lock', async () => {
      mockEnv.DB.first.mockResolvedValue({ lock_info: JSON.stringify({ ID: 'test-lock' }) });
      mockEnv.DB.run.mockResolvedValue({ success: true });

      const response = await releaseLock('test-project', 'test-state', { ID: 'test-lock' }, mockEnv);
      
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
