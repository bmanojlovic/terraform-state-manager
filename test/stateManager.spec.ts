import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getState, setState, deleteState, listStates } from '../src/stateManager';
import { Env } from '../src/types';

describe('State Manager', () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      BUCKET: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
    } as Env;
  });

  describe('getState', () => {
    it('should retrieve a state file', async () => {
      const mockState = '{"resources": []}';
      mockEnv.BUCKET.get.mockResolvedValue({
        text: () => Promise.resolve(mockState),
      });

      const response = await getState('test-project', 'test-state', mockEnv);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(mockState);
    });

    it('should return 404 when state file is not found', async () => {
      mockEnv.BUCKET.get.mockResolvedValue(null);

      const response = await getState('test-project', 'non-existent-state', mockEnv);
      expect(response.status).toBe(404);
    });
  });

  describe('setState', () => {
    it('should store a state file', async () => {
      mockEnv.BUCKET.put.mockResolvedValue({});
      mockEnv.DB = { prepare: vi.fn().mockReturnThis(), bind: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue({ value: '3' }) } as any;

      const response = await setState('test-project', 'test-state', '{"version": 4}', mockEnv);
      expect(response.status).toBe(200);
    });
  });

  describe('deleteState', () => {
    it('should delete a state file', async () => {
      mockEnv.BUCKET.delete.mockResolvedValue({});

      const response = await deleteState('test-project', 'test-state', mockEnv);
      expect(response.status).toBe(200);
    });
  });

  describe('listStates', () => {
    it('should list all state files', async () => {
      const mockContext = {
        env: {
          BUCKET: {
            list: vi.fn().mockResolvedValue({
              objects: [{ key: 'project1/state1' }, { key: 'project2/state2' }]
            })
          }
        }
      } as any;

      const states = await listStates(mockContext);
      
      expect(states).toHaveLength(2);
      expect(states).toEqual(['project1/state1', 'project2/state2']);
    });
  });
});
