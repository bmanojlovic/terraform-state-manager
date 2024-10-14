import { Env, AuthContext } from './types';
import { getConfig } from './configManager';
import { sanitizePath } from './utils';

// Function to retrieve a Terraform state file
export async function getState(projectName: string, statePath: string, env: Env): Promise<Response> {
	const fullStateName = `${projectName}/${statePath}`;
	const sanitizedStateName = sanitizePath(fullStateName);
	console.log(`Debug: Getting state for ${sanitizedStateName}`);
	try {
		const object = await env.BUCKET.get(sanitizedStateName);

		if (object) {
			const state = await object.text();
			console.log(`Debug: State found for ${fullStateName}`);
			return new Response(state, {
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			console.log(`Debug: State not found for ${fullStateName}`);
			return new Response(JSON.stringify({ error: 'State not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (error) {
		console.error(`Error getting state for ${fullStateName}:`, error);
		return new Response(JSON.stringify({ error: 'Error getting state' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

// Function to list Terraform state files
export async function listStates(c: AuthContext): Promise<string[]> {
	console.log(`Debug: Listing states`);
	try {
		if (!c.env.BUCKET) {
			console.error('Debug: BUCKET is undefined');
			throw new Error('Internal server error: BUCKET is undefined');
		}
		const objects = await c.env.BUCKET.list();
		console.log(`Debug: Successfully listed objects from R2 bucket`);

		const states = objects.objects.map((obj: { key: string }) => obj.key);

		console.log(`Debug: Found ${states.length} states`);
		return states;
	} catch (error) {
		console.error(`Error listing states:`, error);
		return []; // Return an empty array instead of throwing
	}
}

// Function to set a Terraform state file
export async function setState(projectName: string, statePath: string, state: string, env: Env): Promise<Response> {
	const fullStateName = `${projectName}/${statePath}`;
	const sanitizedStateName = sanitizePath(fullStateName);
	console.log(`Debug: Setting state for ${sanitizedStateName}`);
	try {
		await rotateBackups(sanitizedStateName, env);
		await env.BUCKET.put(sanitizedStateName, state);
		console.log(`Debug: State updated successfully for ${sanitizedStateName}`);
		return new Response(JSON.stringify({ message: 'State updated successfully' }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error(`Error setting state for ${fullStateName}:`, error);
		return new Response(JSON.stringify({ error: 'Error setting state' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

// Function to delete a Terraform state file and its backups
export async function deleteState(projectName: string, statePath: string, env: Env): Promise<Response> {
	const fullStateName = `${projectName}/${statePath}`;
	const sanitizedStateName = sanitizePath(fullStateName);
	await env.BUCKET.delete(sanitizedStateName);
	// Delete all backups
	const config = await getConfig(env);
	for (let i = 1; i <= config.maxBackups; i++) {
		await env.BUCKET.delete(`${sanitizedStateName}.${i}`);
	}
	return new Response(JSON.stringify({ message: 'State and all backups deleted successfully' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

// Function to rotate backups of a Terraform state file
async function rotateBackups(fullStateName: string, env: Env): Promise<void> {
	const sanitizedStateName = sanitizePath(fullStateName);
	const config = await getConfig(env);

	// Delete the oldest backup if it exists
	await env.BUCKET.delete(`${sanitizedStateName}.${config.maxBackups}`);

	// Rotate existing backups
	for (let i = config.maxBackups - 1; i > 0; i--) {
		const oldKey = `${sanitizedStateName}.${i}`;
		const newKey = `${sanitizedStateName}.${i + 1}`;
		const object = await env.BUCKET.get(oldKey);
		if (object) {
			await env.BUCKET.put(newKey, object.body);
			await env.BUCKET.delete(oldKey);
		}
	}

	// Move the current state to .1
	const currentState = await env.BUCKET.get(sanitizedStateName);
	if (currentState) {
		await env.BUCKET.put(`${sanitizedStateName}.1`, currentState.body);
	}
}
