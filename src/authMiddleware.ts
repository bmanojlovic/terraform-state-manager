import { Context, Next } from 'hono';
import { Env, User, AuthContext } from './types';
import { verifyPassword } from './utils';
import { GLOBAL_ENDPOINTS } from './constants';
import { logger } from './logger';

// Helper function to handle unauthorized requests
async function handleUnauthorized(c: AuthContext, message: string): Promise<Response> {
	logger.debug(message);
	return c.json({ error: 'Unauthorized' }, 401);
}

// Middleware for combined Bearer and Basic authentication
export async function combinedAuth(c: AuthContext, next: Next) {
	const authHeader = c.req.header('Authorization');

	if (!authHeader) {
		return handleUnauthorized(c, 'Missing Authorization header');
	}

	try {
		if (authHeader.startsWith('Bearer ')) {
			const token = authHeader.split(' ')[1];
			if (token !== c.env.AUTH_TOKEN) {
				return handleUnauthorized(c, 'Invalid Bearer token');
			}
			c.set('user', { username: 'admin', project: 'all', role: 'admin' });
		} else if (authHeader.startsWith('Basic ')) {
			const [username, password] = atob(authHeader.split(' ')[1]).split(':');
			const user = await c.env.DB.prepare('SELECT * FROM auth WHERE username = ?')
				.bind(username)
				.first<{ username: string; password: string; project: string; role: string }>();

			if (!user || !(await verifyPassword(password, user.password))) {
				return handleUnauthorized(c, `Authentication failed for user: ${username}`);
			}

			await c.env.DB.prepare('UPDATE auth SET last_login = CURRENT_TIMESTAMP WHERE username = ?').bind(username).run();

			c.set('user', { username: user.username, project: user.project, role: user.role });
		} else {
			return handleUnauthorized(c, 'Invalid Authorization header format');
		}

		await next();
	} catch (error) {
		logger.error('Error in authentication:', error);
		return handleUnauthorized(c, 'Internal server error during authentication');
	}
}

// Middleware for project-based authorization
export async function projectAuth(c: AuthContext, next: Next) {
	const user = c.get('user');

	if (!user) {
		logger.debug('User object not found in context');
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const url = new URL(c.req.url);
	const pathParts = url.pathname.split('/');
	const projectName = pathParts[4]; // Assuming the URL structure is /api/v1/state/<projectName>/...
	const statePath = pathParts.slice(5).join('/');

	logger.debug(`projectAuth - User: ${user.username}, Project: ${projectName || 'undefined'}, State: ${statePath || 'undefined'}`);

	if (user.role === 'admin') {
		logger.debug(`User ${user.username} has admin access`);
		await next();
		return;
	}

	if (GLOBAL_ENDPOINTS.some((endpoint) => url.pathname.startsWith(endpoint))) {
		logger.debug(`User ${user.username} accessing global endpoint`);
		await next();
		return;
	}

	if (!projectName) {
		logger.debug(`No projectName found in URL for user: ${user.username}`);
		return c.json({ error: 'Bad Request: Missing project name' }, 400);
	}

	if (user.project !== projectName) {
		logger.debug(`User ${user.username} not authorized for project: ${projectName}`);
		return c.json({ error: 'Forbidden' }, 403);
	}

	logger.debug(`User ${user.username} authorized for project: ${projectName}, state path: ${statePath || 'N/A'}`);
	await next();
}
