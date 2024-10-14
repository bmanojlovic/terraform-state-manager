import { Env } from './types';
import JSZip from 'jszip';
import { createUsersBackup } from './userManager';

// Function to create a zip file containing all Terraform state files
export async function createStatesBackup(env: Env): Promise<Response> {
	const zip = new JSZip();

	try {
		// List all objects in the bucket
		const objects = await env.BUCKET.list();

		// Add each state file to the zip
		for (const object of objects.objects) {
			const state = await env.BUCKET.get(object.key);
			if (state) {
				zip.file(object.key, await state.arrayBuffer());
			}
		}

		// Generate the zip file
		const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

		return new Response(zipBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/zip',
				'Content-Disposition': 'attachment; filename="terraform_states_backup.zip"',
			},
		});
	} catch (error) {
		console.error('Error creating states backup:', error);
		return new Response(JSON.stringify({ error: 'Error creating backup' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}

// Function to create a backup of user information
export async function createUsersBackupZip(env: Env): Promise<Response> {
	const usersBackup = await createUsersBackup(env);
	const zip = new JSZip();
	zip.file('users_backup.json', JSON.stringify(usersBackup));

	const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' });

	return new Response(zipBuffer, {
		status: 200,
		headers: {
			'Content-Type': 'application/zip',
			'Content-Disposition': 'attachment; filename="users_backup.zip"',
		},
	});
}
