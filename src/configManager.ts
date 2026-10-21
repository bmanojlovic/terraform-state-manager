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

// Default lock TTL in minutes when not configured. A lock older than this is
// considered abandoned and may be taken over. Chosen to exceed typical
// `terraform apply` durations while still auto-healing crashed runs.
const DEFAULT_LOCK_TTL_MINUTES = 30;

// Function to get the lock TTL in milliseconds (0 disables expiry).
export async function getLockTtlMs(env: Env): Promise<number> {
	try {
		const result = await env.DB.prepare('SELECT value FROM config WHERE key = ?')
			.bind('lockTtlMinutes')
			.first<{ value: string }>();
		const minutes = result ? parseInt(result.value, 10) : DEFAULT_LOCK_TTL_MINUTES;
		if (Number.isNaN(minutes) || minutes < 0) {
			return DEFAULT_LOCK_TTL_MINUTES * 60 * 1000;
		}
		return minutes * 60 * 1000;
	} catch (error) {
		logger.error('Error fetching lock TTL, using default:', error);
		return DEFAULT_LOCK_TTL_MINUTES * 60 * 1000;
	}
}

// Function to set configuration
export async function setConfig(config: StateConfig, env: Env): Promise<void> {
	await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind('maxBackups', config.maxBackups.toString()).run();
}
