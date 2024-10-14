-- Migration number: 0002 	 2024-10-08T00:00:00.000Z
-- Create config table
CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Insert default configuration
-- This sets the default number of backups to keep
INSERT OR REPLACE INTO config (key, value) VALUES ('maxBackups', '10');
