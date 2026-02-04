import { describe, it, expect } from 'vitest';
import { sanitizePath, hashPassword, verifyPassword } from '../src/utils';

describe('Utils', () => {
  describe('sanitizePath', () => {
    it('should remove directory traversal attempts', () => {
      expect(sanitizePath('../../../etc/passwd')).toBe('etc/passwd');
      expect(sanitizePath('project/../other')).toBe('project/other');
    });

    it('should handle normal paths', () => {
      expect(sanitizePath('project/state')).toBe('project/state');
      expect(sanitizePath('my-project/my-state.tfstate')).toBe('my-project/my-state.tfstate');
    });

    it('should normalize slashes', () => {
      expect(sanitizePath('project\\state')).toBe('project/state');
      expect(sanitizePath('project//state')).toBe('project/state');
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('mypassword');
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe('mypassword');
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await hashPassword('password1');
      const hash2 = await hashPassword('password2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword';
      const hash = await hashPassword(password);
      
      const result = await verifyPassword(password, hash);
      
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await hashPassword('correctpassword');
      
      const result = await verifyPassword('wrongpassword', hash);
      
      expect(result).toBe(false);
    });
  });
});
