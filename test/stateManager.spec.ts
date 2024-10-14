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

  // Add tests for setState, deleteState, and listStates
});
