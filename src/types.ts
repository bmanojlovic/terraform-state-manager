import { Env as HonoEnv, Context } from 'hono';

// Extended environment interface for the application

export interface Env extends HonoEnv {
  DB: D1Database;        // D1 database for storing metadata and locks
  BUCKET: R2Bucket;      // R2 bucket for storing Terraform state files
  AUTH_TOKEN: string;    // Authentication token for admin operations
}

export interface User {
  username: string;
  project: string;
  role: string;
}

export type AuthContext = Context<{ Bindings: Env, Variables: { user: User } }>;

// Helper functions for authorization
export const isAdmin = (user: User): boolean => user.role === 'admin';

export const requireAdmin = (c: AuthContext): Response | null => {
  const user = c.get('user');
  return isAdmin(user) ? null : c.json({ error: 'Unauthorized' }, 403);
};

