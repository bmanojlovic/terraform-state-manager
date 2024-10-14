import { describe, it, expect, beforeEach, vi, assertType } from 'vitest';
import { listUsers, addUser, updateUser, deleteUser } from '../src/userManager';
import { Env } from '../src/types';
import { Context } from 'hono';

describe('User Manager', () => {
  let mockEnv: Env;
  let mockContext: Context<{ Bindings: Env }>;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn(),
        run: vi.fn(),
        all: vi.fn(),
      } as any,
    } as Env;

    mockContext = {
      env: mockEnv,
      json: vi.fn(),
      text: vi.fn(),
    } as any;
  });

  describe('listUsers', () => {
    it('should return a list of users', async () => {
      const mockUsers = [{ username: 'test-user', project: 'test-project', role: 'developer' }];
      mockEnv.DB.all.mockResolvedValue({ results: mockUsers });

      await listUsers(mockContext);
      
      expect(mockContext.json).toHaveBeenCalledWith(mockUsers);

      // Type check
      assertType<Array<{ username: string; project: string; role: string }>>(mockUsers);
    });
  });

  // Add tests for addUser, updateUser, and deleteUser
});
