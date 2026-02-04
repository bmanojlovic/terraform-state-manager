const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export const logger = {
	debug: (message: string, ...args: any[]) => {
		if (isDev) console.log(`[DEBUG] ${message}`, ...args);
	},
	error: (message: string, ...args: any[]) => {
		console.error(`[ERROR] ${message}`, ...args);
	},
};
