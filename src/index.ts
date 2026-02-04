import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getState, setState, deleteState, listStates } from './stateManager';
import { acquireLock, releaseLock, getLockInfo } from './lockManager';
import { projectAuth, combinedAuth } from './authMiddleware';
import userManager, { listUsers, addUser, updateUser, deleteUser } from './userManager';
import { getConfig, setConfig } from './configManager';
import { Env, AuthContext } from './types';
import { logger } from './logger';

const app = new Hono<{ Bindings: Env }>();
app.use('*', cors());

const terraformGroup = new Hono<{ Bindings: Env }>();
terraformGroup.use('*', combinedAuth, projectAuth);

// Helper function to get project name and state path
const getProjectAndStatePath = (c: AuthContext, prefix: string) => {
	const projectName = c.req.param('projectName');
	const statePath = c.req.path.split(`/${prefix}/${projectName}/`)[1];
	return { projectName, statePath };
};

// Terraform state routes
terraformGroup.get('/states', async (c: AuthContext) => {
	logger.debug('Entering /states route handler');
	try {
		const user = c.get('user');
		const states = await listStates(c);
		logger.debug('listStates result:', states);
		if (user.project === 'all') {
			return c.json(states);
		} else {
			const filteredStates = states.filter((state) => state.startsWith(`${user.project}/`));
			return c.json(filteredStates);
		}
	} catch (error) {
		logger.error('Error in /states route:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

terraformGroup.get('/states/:projectName/*', async (c: AuthContext) => {
	const { projectName, statePath } = getProjectAndStatePath(c, 'states');
	logger.debug(`Getting state for project: ${projectName}, state path: ${statePath}`);
	return await getState(projectName, statePath, c.env);
});

terraformGroup.post('/states/:projectName/*', async (c: AuthContext) => {
	const { projectName, statePath } = getProjectAndStatePath(c, 'states');
	const body = await c.req.text();
	return await setState(projectName, statePath, body, c.env);
});

terraformGroup.delete('/states/:projectName/*', async (c: AuthContext) => {
	const { projectName, statePath } = getProjectAndStatePath(c, 'states');
	return await deleteState(projectName, statePath, c.env);
});

// Lock routes
const handleLock = async (c: AuthContext, action: 'acquire' | 'release') => {
	const { projectName, statePath } = getProjectAndStatePath(c, 'lock');
	logger.debug(`${action === 'acquire' ? 'Acquiring' : 'Releasing'} lock for project: ${projectName}, state path: ${statePath}`);
	let body;
	try {
		body = await c.req.json();
	} catch (error) {
		logger.debug(`No JSON body provided for lock ${action}. Using empty object.`);
		body = {};
	}
	return action === 'acquire'
		? await acquireLock(projectName, statePath, body, c.env)
		: await releaseLock(projectName, statePath, body, c.env);
};

terraformGroup.post('/lock/:projectName/*', (c: AuthContext) => handleLock(c, 'acquire'));
terraformGroup.delete('/lock/:projectName/*', (c: AuthContext) => handleLock(c, 'release'));
terraformGroup.get('/lock/:projectName/*', async (c: AuthContext) => {
	const { projectName, statePath } = getProjectAndStatePath(c, 'lock');
	logger.debug(`Getting lock info for project: ${projectName}, state path: ${statePath}`);
	return await getLockInfo(projectName, statePath, c.env);
});

terraformGroup.on(['LOCK', 'UNLOCK'], '/lock/:projectName/*', async (c: AuthContext) => {
	return handleLock(c, c.req.method === 'LOCK' ? 'acquire' : 'release');
});

app.route('/api/v1', terraformGroup);

// User management routes
const usersGroup = new Hono<{ Bindings: Env }>();
usersGroup.use('*', combinedAuth, async (c, next) => {
	logger.debug(`Accessing user management route: ${c.req.method} ${c.req.path}`);
	await next();
});
usersGroup.get('/users', (c: AuthContext) => {
	const user = c.get('user');
	return listUsers(c);
});
usersGroup.post('/users', (c: AuthContext) => addUser(c));
usersGroup.put('/users/:username', (c: AuthContext) => updateUser(c));
usersGroup.delete('/users/:username', (c: AuthContext) => deleteUser(c));

app.route('/api/v1', usersGroup);

import { createStatesBackup, createUsersBackupZip } from './backupManager';

// Configuration routes
const configGroup = new Hono<{ Bindings: Env }>();
configGroup.use('*', combinedAuth, async (c, next) => {
	logger.debug(`Accessing configuration management route: ${c.req.method} ${c.req.path}`);
	await next();
});
configGroup.get('/config', async (c) => {
	const config = await getConfig(c.env);
	return c.json(config);
});
configGroup.post('/config', async (c) => {
	const body = await c.req.json();
	if (typeof body.maxBackups === 'number' && body.maxBackups > 0) {
		await setConfig({ maxBackups: body.maxBackups }, c.env);
		return c.json({ message: 'Configuration updated successfully' }, 200);
	} else {
		return c.json({ error: 'Invalid configuration' }, 400);
	}
});

app.route('/api/v1', configGroup);

// Backup routes
const backupGroup = new Hono<{ Bindings: Env }>();
backupGroup.use('*', combinedAuth, async (c, next) => {
	logger.debug(`Accessing backup route: ${c.req.method} ${c.req.path}`);
	await next();
});
backupGroup.get('/backup/states', async (c) => await createStatesBackup(c.env));
backupGroup.get('/backup/users', async (c) => await createUsersBackupZip(c.env));

app.route('/api/v1', backupGroup);

// Initial admin user creation route
app.post('/config/init', combinedAuth, async (c) => {
	await userManager.fetch(c.req.raw, c.env);
});

import { ExportedHandler } from '@cloudflare/workers-types';

export default {
	fetch: app.fetch.bind(app),
	routes: app.routes,
} as unknown as ExportedHandler<Env>;

export type { Env };
