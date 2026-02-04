import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		include: ['test/**/*.spec.ts'],
		exclude: ['test/integration/**', 'node_modules/**'],
		poolOptions: {
			workers: {
				wrangler: { configPath: './wrangler.toml' },
			},
		},
	},
});
