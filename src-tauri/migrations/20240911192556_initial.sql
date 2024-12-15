-- Add migration script here

CREATE TABLE IF NOT EXISTS tasks (
    id BLOB PRIMARY KEY,
    capture TEXT DEFAULT NULL,
    content TEXT DEFAULT NULL,
    tags JSON DEFAULT('[]'),
    rrule TEXT DEFAULT NULL,
    priority INTEGER DEFAULT 0,
    effort REAL DEFAULT 1,
    start TIMESTAMP DEFAULT NULL,
    due TIMESTAMP DEFAULT NULL,
    schedule TIMESTAMP DEFAULT NULL,
    captured TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    locked BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_tasks_start ON tasks (start);
CREATE INDEX idx_tasks_due ON tasks (due);
CREATE INDEX idx_tasks_schedule ON tasks (schedule);

CREATE TABLE IF NOT EXISTS scratchpads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request JSON DEFAULT('{}')
);

CREATE TABLE IF NOT EXISTS events (
    start TIMESTAMP NOT NULL,
    end TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    name TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS calendars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS configuration (
    sentry PRIMARY KEY DEFAULT 0,
    horizon INTEGER DEFAULT 8
);

INSERT OR IGNORE INTO configuration (sentry,horizon) VALUES (0,8);

