import { Env } from './types';
import { logger } from './logger';

// Interface for state configuration
interface StateConfig {
	maxBackups: number;
}

// Function to get current configuration
export async function getConfig(env: Env): Promise<StateConfig> {
	try {
		const result = await env.DB.prepare('SELECT value FROM config WHERE key = ?').bind('maxBackups').first<{ value: string }>();

		if (result) {
			return { maxBackups: parseInt(result.value, 10) };
		}
		return { maxBackups: 3 }; // Default configuration if not set
	} catch (error) {
		logger.error('Error fetching configuration:', error);
		return { maxBackups: 3 }; // Return default config on error
	}
}

// Function to set configuration
export async function setConfig(config: StateConfig, env: Env): Promise<void> {
	await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind('maxBackups', config.maxBackups.toString()).run();
}
