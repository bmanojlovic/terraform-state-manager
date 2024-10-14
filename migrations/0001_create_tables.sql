-- Migration number: 0001 	 2024-10-07T20:31:16.370Z
-- Create locks table
CREATE TABLE locks (
    project TEXT NOT NULL,
    name TEXT NOT NULL,
    lock_info TEXT NOT NULL,
    PRIMARY KEY (project, name)
);
