# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

cao is a local-first task management desktop app by Shabang Systems. It uses a Tauri v1 architecture: React 18 frontend + Rust backend, with all data persisted to a local JSON file.

## Development Commands

```bash
# Full dev (frontend + backend together):
cargo tauri dev

# Frontend only (Vite dev server on port 1420):
yarn dev

# Production build:
cargo tauri build

# Rust backend only:
cd src-tauri && cargo build
```

No test suite or linter is configured.

## Architecture

### Frontend (`src/`)

- **Entry**: `main.jsx` → `App.jsx` (handles auth flow, then routes to views)
- **Views** (`src/views/`): `Action` (daily dashboard + calendar workslots), `Capture` (quick-capture text buffers), `Browser` (search/filter), `Settings`, `Auth` (workspace selection)
- **State**: Redux Toolkit in `src/api/`. Each slice (`capture.js`, `tasks.js`, `action.js`, `browse.js`, `events.js`, `ui.js`) manages a domain. Custom async dispatch middleware in `store.js` allows async operations within reducers.
- **Editor**: CodeMirror 6 wrapper in `components/editor.jsx` with markdown support and a custom "chunk mode" line decoration for task splitting
- **Styling**: Tailwind CSS + per-component CSS files. Dark mode only.

### Backend (`src-tauri/src/`)

- **`state.rs`** — `GlobalState` / `Cao` structs. Manages JSON file persistence, file watching (via `notify`), and a 60-second calendar sync loop. Uses `Arc<Mutex<>>` for thread-safe shared state.
- **`commands.rs`** — Tauri IPC command handlers: `bootstrap`, `load`, `snapshot`, `upsert`, `insert`, `delete`, `index`, `events`, `complete`
- **`tasks/core.rs`** — `TaskDescription` struct (id, content, tags, priority, effort, start/due/schedule dates, rrule, completion)
- **`tasks/abtib.rs`** — Parses raw capture buffer text into structured tasks, extracting markdown headers as tags
- **`scheduling/freebusy.rs`** — Downloads and parses .ics calendars, handles recurring events (RRULE), returns free/busy gaps
- **`query/core.rs`** — `QueryRequest` for search: regex/text filtering, tag filtering, availability (complete/incomplete), sort order

### Data Flow

Frontend dispatches Redux actions → thunks call `@tauri-apps/api` `invoke()` → Rust command handlers mutate `GlobalState` → state persisted to JSON file. Frontend polls via `snapshot()` to stay in sync. Backend also watches the JSON file for external edits.

## Import Aliases

Configured in `vite.config.js`:
- `@src` → `src/`
- `@api` → `src/api/`
- `@views` → `src/views/`
- `@components` → `src/components/`
- `@contexts` → `src/contexts.js`
- `@strings` → `src/strings.js`

## Key Conventions

- UI strings are centralized in `src/strings.js`
- React contexts in `src/contexts.js`: `ThemeContext`, `ConfigContext`, `LogoutContext`
- Transaction pattern: state updates use enum-based transactions for type safety on the Rust side
- Date parsing: `chrono-node` on frontend for natural language dates, `chrono` crate on backend
- Animations: `@react-spring/web` for expand/collapse transitions
