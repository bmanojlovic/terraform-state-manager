import { Env } from './types';
import { sanitizePath } from './utils';
import { logger } from './logger';

// Interface for lock information
interface LockInfo {
	ID: string;
	Operation: string;
	Info: string;
	Who: string;
	Version: string;
	Created: string;
	Path: string;
}

// Function to acquire a lock for a Terraform state
export async function acquireLock(projectName: string, statePath: string, lockInfo: LockInfo, env: Env): Promise<Response> {
	const sanitizedProjectName = sanitizePath(projectName);
	const sanitizedStatePath = sanitizePath(statePath);
	const fullPath = `${sanitizedProjectName}/${sanitizedStatePath}`;

	try {
		// Check if a lock already exists
		const existingLock = await env.DB.prepare('SELECT lock_info FROM locks WHERE project = ? AND name = ?')
			.bind(sanitizedProjectName, sanitizedStatePath)
			.first<{ lock_info: string }>();

		if (existingLock) {
			const existingLockInfo = JSON.parse(existingLock.lock_info);
			return new Response(JSON.stringify(existingLockInfo), {
				status: 423,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Set lock information
		lockInfo.Path = fullPath;
		if (!lockInfo.Created) {
			lockInfo.Created = new Date().toISOString();
		}

		// Insert new lock
		const insertResult = await env.DB.prepare('INSERT INTO locks (project, name, lock_info) VALUES (?, ?, ?)')
			.bind(sanitizedProjectName, sanitizedStatePath, JSON.stringify(lockInfo))
			.run();

		if (insertResult.success) {
			return new Response(JSON.stringify(lockInfo), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			return new Response('Failed to acquire lock', { status: 500 });
		}
	} catch (error) {
		logger.error('Error acquiring lock:', error);
		return new Response('Internal server error', { status: 500 });
	}
}

// Function to get lock information for a Terraform state
export async function getLockInfo(projectName: string, statePath: string, env: Env): Promise<Response> {
	const sanitizedProjectName = sanitizePath(projectName);
	const sanitizedStatePath = sanitizePath(statePath);

	try {
		const lockInfo = await env.DB.prepare('SELECT lock_info FROM locks WHERE project = ? AND name = ?')
			.bind(sanitizedProjectName, sanitizedStatePath)
			.first<{ lock_info: string }>();

		if (lockInfo) {
			return new Response(lockInfo.lock_info, {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			});
		} else {
			return new Response(JSON.stringify({ locked: false }), {
				headers: { 'Content-Type': 'application/json' },
				status: 200,
			});
		}
	} catch (error) {
		logger.error('Error getting lock info:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

// Function to release a lock for a Terraform state
export async function releaseLock(projectName: string, statePath: string, lockInfo: Partial<LockInfo>, env: Env): Promise<Response> {
	const sanitizedProjectName = sanitizePath(projectName);
	const sanitizedStatePath = sanitizePath(statePath);

	try {
		// Check if the lock exists
		const existingLock = await env.DB.prepare('SELECT lock_info FROM locks WHERE project = ? AND name = ?')
			.bind(sanitizedProjectName, sanitizedStatePath)
			.first<{ lock_info: string }>();

		if (!existingLock) {
			return new Response(JSON.stringify({ error: 'Lock not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		const existingLockInfo: LockInfo = JSON.parse(existingLock.lock_info);

		// Verify lock ID if provided
		if (lockInfo.ID && existingLockInfo.ID !== lockInfo.ID) {
			return new Response(JSON.stringify({ error: 'Lock ID mismatch' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Delete the lock
		const result = await env.DB.prepare('DELETE FROM locks WHERE project = ? AND name = ?')
			.bind(sanitizedProjectName, sanitizedStatePath)
			.run();

		if (result.success) {
			return new Response(JSON.stringify({ message: 'Lock released successfully' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			return new Response(JSON.stringify({ error: 'Failed to release lock' }), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (error) {
		logger.error('Error releasing lock:', error);
		return new Response(JSON.stringify({ error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
