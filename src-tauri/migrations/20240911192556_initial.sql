-- Add migration script here

CREATE TABLE tasks (
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
)

CREATE TABLE scratchpads (
    content TEXT DEFAULT ''
)

CREATE TABLE searches (
    request JSON DEFAULT('{}')
)

CREATE TABLE events (
    start TIMESTAMP NOT NULL,
    end TIMESTAMP NOT NULL,
    is_all_day BOOLEAN DEFAULT FALSE,
    name TEXT DEFAULT ''
)

CREATE TABLE calendars (
    content TEXT DEFAULT ''
)

CREATE TABLE configuration (
    sentry PRIMARY KEY DEFAULT 0,
    horizon INTEGER DEFAULT 8
)
