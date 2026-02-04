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
      get: vi.fn().mockReturnValue({ username: 'admin', role: 'admin' }),
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

  describe('addUser', () => {
    it('should add a new user', async () => {
      mockEnv.DB.first.mockResolvedValue(null);
      mockEnv.DB.run.mockResolvedValue({ success: true });
      mockContext.req = { json: vi.fn().mockResolvedValue({ username: 'new-user', password: 'pass123', project: 'proj1', role: 'developer' }) } as any;

      await addUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith({ message: 'User added successfully' }, 201);
    });

    it('should return 409 if user already exists', async () => {
      mockEnv.DB.first.mockResolvedValue({ username: 'existing-user' });
      mockContext.req = { json: vi.fn().mockResolvedValue({ username: 'existing-user', password: 'pass123', project: 'proj1', role: 'developer' }) } as any;

      await addUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith({ error: 'User already exists' }, 409);
    });
  });

  describe('updateUser', () => {
    it('should update user password', async () => {
      mockEnv.DB.run.mockResolvedValue({ success: true });
      mockContext.req = { 
        json: vi.fn().mockResolvedValue({ password: 'newpass123' }),
        param: vi.fn().mockReturnValue('test-user')
      } as any;

      await updateUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith({ message: 'User updated successfully' }, 200);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      mockEnv.DB.first.mockResolvedValue({ username: 'test-user' });
      mockEnv.DB.run.mockResolvedValue({ success: true, meta: { changes: 1 } });
      mockContext.req = { param: vi.fn().mockReturnValue('test-user') } as any;

      await deleteUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith({ message: 'User deleted successfully' }, 200);
    });

    it('should return 404 if user not found', async () => {
      mockEnv.DB.first.mockResolvedValue(null);
      mockContext.req = { param: vi.fn().mockReturnValue('non-existent') } as any;

      await deleteUser(mockContext);

      expect(mockContext.json).toHaveBeenCalledWith({ error: 'User not found' }, 404);
    });
  });
});
