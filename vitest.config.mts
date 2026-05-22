import { defineConfig } from 'vitest/config';
import { cloudflarePool } from '@cloudflare/vitest-pool-workers';

export default defineConfig({
	test: {
		include: ['test/**/*.spec.ts'],
		exclude: ['test/integration/**', 'node_modules/**'],
		pool: cloudflarePool({
			main: './src/index.ts',
			wrangler: { configPath: './wrangler.toml' },
		}),
	},
});
