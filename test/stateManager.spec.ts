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
    it('should retrieve a state file (streamed from R2 body)', async () => {
      const mockState = '{"resources": []}';
      // R2 object exposes a ReadableStream body; getState must stream it through
      // without buffering via .text().
      mockEnv.BUCKET.get.mockResolvedValue({
        body: new Response(mockState).body,
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

    it('should return 500 when R2 get throws', async () => {
      mockEnv.BUCKET.get.mockRejectedValue(new Error('R2 unavailable'));

      const response = await getState('test-project', 'test-state', mockEnv);
      expect(response.status).toBe(500);
    });
  });

  describe('setState', () => {
    it('should store a state file', async () => {
      mockEnv.BUCKET.put.mockResolvedValue({});
      mockEnv.BUCKET.get.mockResolvedValue(null); // no existing state/backups to rotate
      mockEnv.DB = { prepare: vi.fn().mockReturnThis(), bind: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue({ value: '3' }) } as any;

      const response = await setState('test-project', 'test-state', '{"version": 4}', mockEnv);
      expect(response.status).toBe(200);
    });

    it('should accept a ReadableStream body and pass it to R2 without buffering', async () => {
      mockEnv.BUCKET.put.mockResolvedValue({});
      mockEnv.BUCKET.get.mockResolvedValue(null);
      mockEnv.DB = { prepare: vi.fn().mockReturnThis(), bind: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue({ value: '3' }) } as any;

      const stream = new Response('{"big": "state"}').body;
      const response = await setState('test-project', 'test-state', stream, mockEnv);

      expect(response.status).toBe(200);
      // The exact stream object must be handed to R2 (no .text()/buffering)
      expect(mockEnv.BUCKET.put).toHaveBeenCalledWith('test-project/test-state', stream);
    });

    it('should rotate the current state into .1 before writing', async () => {
      mockEnv.DB = { prepare: vi.fn().mockReturnThis(), bind: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue({ value: '3' }) } as any;
      // oldest-delete + rotation gets() return null except the current state
      mockEnv.BUCKET.get.mockImplementation((key: string) =>
        key === 'test-project/test-state'
          ? Promise.resolve({ body: 'current-body' })
          : Promise.resolve(null)
      );
      mockEnv.BUCKET.put.mockResolvedValue({});
      mockEnv.BUCKET.delete.mockResolvedValue({});

      const response = await setState('test-project', 'test-state', '{"version": 5}', mockEnv);
      expect(response.status).toBe(200);
      // current state copied to .1 backup
      expect(mockEnv.BUCKET.put).toHaveBeenCalledWith('test-project/test-state.1', 'current-body');
    });

    it('should return 500 when R2 put throws', async () => {
      mockEnv.BUCKET.get.mockResolvedValue(null);
      mockEnv.BUCKET.put.mockRejectedValue(new Error('R2 write failed'));
      mockEnv.DB = { prepare: vi.fn().mockReturnThis(), bind: vi.fn().mockReturnThis(), first: vi.fn().mockResolvedValue({ value: '3' }) } as any;

      const response = await setState('test-project', 'test-state', '{"version": 4}', mockEnv);
      expect(response.status).toBe(500);
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
