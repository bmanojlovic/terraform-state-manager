import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getConfig, setConfig } from '../src/configManager';
import { Env } from '../src/types';

describe('Config Manager', () => {
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

  describe('getConfig', () => {
    it('should return stored configuration', async () => {
      mockEnv.DB.first.mockResolvedValue({ value: '5' });

      const config = await getConfig(mockEnv);
      
      expect(config).toEqual({ maxBackups: 5 });
    });

    it('should return default config when not set', async () => {
      mockEnv.DB.first.mockResolvedValue(null);

      const config = await getConfig(mockEnv);
      
      expect(config).toEqual({ maxBackups: 3 });
    });
  });

  describe('setConfig', () => {
    it('should store configuration', async () => {
      mockEnv.DB.run.mockResolvedValue({ success: true });

      await setConfig({ maxBackups: 10 }, mockEnv);
      
      expect(mockEnv.DB.prepare).toHaveBeenCalled();
      expect(mockEnv.DB.bind).toHaveBeenCalledWith('maxBackups', '10');
    });
  });
});
