import { describe, it, expect, beforeEach, vi } from 'vitest';
import { combinedAuth, projectAuth } from '../src/authMiddleware';
import { Env, AuthContext } from '../src/types';

describe('Auth Middleware', () => {
  let mockEnv: Env;
  let mockContext: any;
  let mockNext: any;

  beforeEach(() => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn(),
        run: vi.fn(),
      } as any,
      AUTH_TOKEN: 'test-token',
    } as Env;

    mockNext = vi.fn();
    mockContext = {
      env: mockEnv,
      req: {
        header: vi.fn(),
        url: 'http://localhost/api/v1/states/test-project/test-state',
      },
      set: vi.fn(),
      get: vi.fn(),
      json: vi.fn((data, status) => ({ status, data })),
    };
  });

  describe('combinedAuth', () => {
    it('should authenticate with valid Bearer token', async () => {
      mockContext.req.header.mockReturnValue('Bearer test-token');

      await combinedAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalledWith('user', { username: 'admin', project: 'all', role: 'admin' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should authenticate with valid Basic auth', async () => {
      const credentials = btoa('testuser:testpass');
      mockContext.req.header.mockReturnValue(`Basic ${credentials}`);
      mockEnv.DB.first.mockResolvedValue({ 
        username: 'testuser', 
        password: await import('../src/utils').then(m => m.hashPassword('testpass')),
        project: 'test-project',
        role: 'developer'
      });

      await combinedAuth(mockContext, mockNext);

      expect(mockContext.set).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject invalid Bearer token', async () => {
      mockContext.req.header.mockReturnValue('Bearer invalid-token');

      const result = await combinedAuth(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });

    it('should reject missing Authorization header', async () => {
      mockContext.req.header.mockReturnValue(null);

      const result = await combinedAuth(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(result.status).toBe(401);
    });
  });

  describe('projectAuth', () => {
    it('should allow admin access to any project', async () => {
      mockContext.get.mockReturnValue({ username: 'admin', project: 'all', role: 'admin' });

      await projectAuth(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should allow user access to their own project', async () => {
      mockContext.get.mockReturnValue({ username: 'user1', project: 'test-project', role: 'developer' });

      await projectAuth(mockContext, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should deny user access to different project', async () => {
      mockContext.get.mockReturnValue({ username: 'user1', project: 'other-project', role: 'developer' });
      mockContext.req.url = 'http://localhost/api/v1/lock/test-project/test-state';

      const result = await projectAuth(mockContext, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(result.status).toBe(403);
    });
  });
});
