// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, afterEach, vi, assertType } from 'vitest';
import worker from '../src/index';
import { Env } from '../src/types';
import { hashPassword } from '../src/utils';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Terraform State Management System', () => {
  let mockEnv: Env;

  beforeEach(async () => {
    mockEnv = {
      DB: {
        prepare: vi.fn().mockReturnThis(),
        bind: vi.fn().mockReturnThis(),
        first: vi.fn(),
        run: vi.fn(),
        all: vi.fn(),
      } as any,
      BUCKET: {
        put: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
      } as any,
      AUTH_TOKEN: 'test-auth-token',
    };

    // Mock the verifyPassword function
    vi.mock('../src/utils', async (importOriginal) => {
      const actual = await importOriginal();
      return {
        ...actual,
        verifyPassword: vi.fn().mockResolvedValue(true),
        hashPassword: vi.fn().mockImplementation(async (password) => `hashed_${password}`),
        sanitizePath: vi.fn().mockImplementation((path) => path),
      };
    });

    // Mock the DB.first call for user authentication
    const hashedPassword = await hashPassword('test-password');
    mockEnv.DB.first.mockResolvedValue({
      username: 'test',
      password: hashedPassword,
      project: 'all',
      role: 'admin',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('State Management', () => {
    it('should get a state file', async () => {
      const request = new IncomingRequest('http://example.com/api/v1/states/test-project/test-state');
      request.headers.set('Authorization', 'Basic dGVzdDp0ZXN0LXBhc3N3b3Jk'); // test:test-password in base64

      mockEnv.BUCKET.get.mockResolvedValue({
        text: () => Promise.resolve('{"test": "state"}'),
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const responseText = await response.text();
      expect(responseText).toBe('{"test": "state"}');
    });

    // Add more tests for state management (set state, delete state, list states)
  });

  describe('Lock Management', () => {
    it('should acquire a lock', async () => {
      const request = new IncomingRequest('http://example.com/api/v1/lock/test-project/test-state', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic dGVzdDp0ZXN0LXBhc3N3b3Jk',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ID: 'test-lock' }),
      });

      mockEnv.DB.first.mockResolvedValueOnce({
        username: 'test',
        password: await hashPassword('test-password'),
        project: 'all',
        role: 'admin',
      }).mockResolvedValueOnce(null); // No existing lock

      mockEnv.DB.run.mockResolvedValue({ success: true });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const responseBody = JSON.parse(await response.text());
      expect(responseBody).toHaveProperty('ID', 'test-lock');
    });

    // Add more tests for lock management (release lock, get lock info)
  });

  describe('User Management', () => {
    it('should list users', async () => {
      const request = new IncomingRequest('http://example.com/api/v1/users');
      request.headers.set('Authorization', `Bearer ${mockEnv.AUTH_TOKEN}`);

      mockEnv.DB.all.mockResolvedValue({
        results: [{ username: 'test-user', project: 'test-project', role: 'developer' }],
      });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      const users = JSON.parse(await response.text());
      expect(users).toEqual([
        { username: 'test-user', project: 'test-project', role: 'developer' },
      ]);

      // Type check
      assertType<Array<{ username: string; project: string; role: string }>>(users);
    });

    // Add more tests for user management (add user, update user, delete user)
  });

  describe('Configuration Management', () => {
    it('should get configuration', async () => {
      const request = new IncomingRequest('http://example.com/api/v1/config');
      request.headers.set('Authorization', `Bearer ${mockEnv.AUTH_TOKEN}`);

      mockEnv.DB.first.mockResolvedValue({ value: '5' });

      const ctx = createExecutionContext();
      const response = await worker.fetch(request, mockEnv, ctx);
      await waitOnExecutionContext(ctx);

      expect(response.status).toBe(200);
      expect(JSON.parse(await response.text())).toEqual({ maxBackups: 5 });
    });

    // Add more tests for configuration management (set configuration)
  });

  // Add tests for backup functionality
});
