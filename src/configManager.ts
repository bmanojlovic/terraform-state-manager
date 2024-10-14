import { Env } from './types';
import { Hono } from 'hono';

const configManager = new Hono<{ Bindings: Env }>();

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
		console.error('Error fetching configuration:', error);
		return { maxBackups: 3 }; // Return default config on error
	}
}

configManager.get('/config', async (c) => {
	const config = await getConfig(c.env);
	return c.json(config);
});

// Function to set configuration
export async function setConfig(config: StateConfig, env: Env): Promise<void> {
	await env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').bind('maxBackups', config.maxBackups.toString()).run();
}

configManager.post('/config', async (c) => {
	const body = await c.req.json();
	if (typeof body.maxBackups === 'number' && body.maxBackups > 0) {
		await setConfig({ maxBackups: body.maxBackups }, c.env);
		return c.text('Configuration updated successfully', 200);
	} else {
		return c.text('Invalid configuration', 400);
	}
});

export default configManager;
