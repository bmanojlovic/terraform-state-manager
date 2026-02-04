import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'nielohwe8Eejaizeek6chukughuj4aiVeithegi4';

describe('Integration Tests', () => {
  let adminAuth: string;

  beforeAll(async () => {
    adminAuth = `Bearer ${AUTH_TOKEN}`;
    
    // Initialize admin user
    await fetch(`${BASE_URL}/config/init`, {
      method: 'POST',
      headers: { 'Authorization': adminAuth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin123' })
    });
  });

  describe('User Management', () => {
    it('should create and list users', async () => {
      const createRes = await fetch(`${BASE_URL}/api/v1/users`, {
        method: 'POST',
        headers: { 'Authorization': adminAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'testuser', password: 'pass123', project: 'test-proj', role: 'developer' })
      });
      
      expect(createRes.status).toBe(201);

      const listRes = await fetch(`${BASE_URL}/api/v1/users`, {
        headers: { 'Authorization': adminAuth }
      });
      
      const users = await listRes.json();
      expect(users.length).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should store and retrieve state', async () => {
      const userAuth = 'Basic ' + btoa('testuser:pass123');
      const state = { version: 4, resources: [] };

      const putRes = await fetch(`${BASE_URL}/api/v1/states/test-proj/test-state`, {
        method: 'POST',
        headers: { 'Authorization': userAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
      
      expect(putRes.status).toBe(200);

      const getRes = await fetch(`${BASE_URL}/api/v1/states/test-proj/test-state`, {
        headers: { 'Authorization': userAuth }
      });
      
      expect(getRes.status).toBe(200);
      const retrieved = await getRes.json();
      expect(retrieved.version).toBe(4);
    });
  });

  describe('Lock Management', () => {
    it('should acquire and release locks', async () => {
      const userAuth = 'Basic ' + btoa('testuser:pass123');
      const lockInfo = { ID: 'test-lock-123', Operation: 'test' };

      const acquireRes = await fetch(`${BASE_URL}/api/v1/lock/test-proj/test-state`, {
        method: 'POST',
        headers: { 'Authorization': userAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify(lockInfo)
      });
      
      expect(acquireRes.status).toBe(200);

      const releaseRes = await fetch(`${BASE_URL}/api/v1/lock/test-proj/test-state`, {
        method: 'DELETE',
        headers: { 'Authorization': userAuth, 'Content-Type': 'application/json' },
        body: JSON.stringify(lockInfo)
      });
      
      expect(releaseRes.status).toBe(200);
    });
  });
});
