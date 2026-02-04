import { Hono } from 'hono';
import { Env, AuthContext, isAdmin } from './types';
import { hashPassword } from './utils';
import { logger } from './logger';

// Helper functions
async function checkUserExists(env: Env, username: string): Promise<boolean> {
	const existingUser = await env.DB.prepare('SELECT username FROM auth WHERE username = ?').bind(username).first();
	return !!existingUser;
}

async function fetchAllUsers(env: Env): Promise<any[]> {
	const users = await env.DB.prepare('SELECT username, project, role, last_login, created_at, updated_at FROM auth').all();
	return users.results;
}

// User management functions
export async function listUsers(c: AuthContext) {
	try {
		const currentUser = c.get('user');
		if (isAdmin(currentUser)) {
			const users = await fetchAllUsers(c.env);
			return c.json(users);
		} else {
			const user = await c.env.DB.prepare('SELECT username, project, role, last_login, created_at, updated_at FROM auth WHERE username = ?')
				.bind(currentUser.username)
				.first();
			return c.json(user ? [user] : []);
		}
	} catch (error) {
		logger.error('Error fetching users:', error);
		return c.json({ error: 'Error fetching users' }, 500);
	}
}

export async function addUser(c: AuthContext) {
	try {
		const currentUser = c.get('user');
		if (!isAdmin(currentUser)) {
			return c.json({ error: 'Unauthorized' }, 403);
		}

		const { username, password, project, role } = await c.req.json();
		if (!username || !password || !project || !role) {
			return c.json({ error: 'Missing required fields' }, 400);
		}

		if (await checkUserExists(c.env, username)) {
			return c.json({ error: 'User already exists' }, 409);
		}

		const hashedPassword = await hashPassword(password);
		const result = await c.env.DB.prepare('INSERT INTO auth (username, password, project, role) VALUES (?, ?, ?, ?)')
			.bind(username, hashedPassword, project, role)
			.run();

		if (result.success) {
			return c.json({ message: 'User added successfully' }, 201);
		} else {
			throw new Error('Failed to insert user into database');
		}
	} catch (error) {
		logger.error('Error adding user:', error);
		if (error instanceof Error) {
			return c.json({ error: 'Error adding user', details: error.message }, 500);
		} else {
			return c.json({ error: 'Error adding user', details: 'An unknown error occurred' }, 500);
		}
	}
}

export async function updateUser(c: AuthContext) {
	const currentUser = c.get('user');
	const username = c.req.param('username');
	const { password, project, role } = await c.req.json();

	if (!isAdmin(currentUser) && currentUser.username !== username) {
		return c.json({ error: 'Unauthorized' }, 403);
	}

	const updates = [];
	const binds = [];
	if (password) {
		updates.push('password = ?');
		binds.push(await hashPassword(password));
	}
	if (project && isAdmin(currentUser)) {
		updates.push('project = ?');
		binds.push(project);
	}
	if (role && isAdmin(currentUser)) {
		updates.push('role = ?');
		binds.push(role);
	}
	if (updates.length === 0) {
		return c.json({ error: 'No updates provided' }, 400);
	}
	try {
		await c.env.DB.prepare(`UPDATE auth SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE username = ?`)
			.bind(...binds, username)
			.run();
		return c.json({ message: 'User updated successfully' }, 200);
	} catch (error) {
		logger.error('Error updating user:', error);
		return c.json({ error: 'Error updating user' }, 500);
	}
}

export async function deleteUser(c: AuthContext) {
	const currentUser = c.get('user');
	if (!isAdmin(currentUser)) {
		return c.json({ error: 'Unauthorized' }, 403);
	}

	const username = c.req.param('username');
	try {
		const userExists = await checkUserExists(c.env, username);
		if (!userExists) {
			return c.json({ error: 'User not found' }, 404);
		}

		const result = await c.env.DB.prepare('DELETE FROM auth WHERE username = ?').bind(username).run();

		if (result.meta?.changes === 0) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({ message: 'User deleted successfully' }, 200);
	} catch (error) {
		logger.error('Error deleting user:', error);
		return c.json({ error: 'Error deleting user' }, 500);
	}
}

// Admin user initialization
async function initAdminUser(c: AuthContext): Promise<Response> {
	const { username, password } = await c.req.json();
	if (!username || !password) {
		return c.json({ error: 'Missing username or password' }, 400);
	}

	try {
		const hashedPassword = await hashPassword(password);
		await c.env.DB.prepare('INSERT INTO auth (username, password, project, role) VALUES (?, ?, ?, ?)')
			.bind(username, hashedPassword, 'all', 'admin')
			.run();
		return c.json({ message: 'Initial admin user created successfully' }, 201);
	} catch (error) {
		logger.error('Error creating initial admin user:', error);
		return c.json({ error: 'Error creating initial admin user' }, 500);
	}
}

const userManager = new Hono<{ Bindings: Env }>();
userManager.post('/config/init', initAdminUser);

// Backup function
export async function createUsersBackup(env: Env): Promise<any[]> {
	return await fetchAllUsers(env);
}

export default userManager;
