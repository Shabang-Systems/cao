// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Result;

mod tasks;
mod state;
mod query;
mod commands;
mod scheduling;
use state::*;

use tauri::Manager;

#[tokio::main]
async fn main() -> Result<()> {
    let state = GlobalState::new();

        // rock'n'roll
    tauri::Builder::default()
        .manage(state)
        .setup(|app| {
            let handle = app.handle();
            let state = app.state::<GlobalState>();
            state.calendar_listen(handle);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            tasks::parse_tasks,
            commands::snapshot,
            commands::upsert,
            commands::delete,
            commands::index,
            commands::load,
            commands::bootstrap,
            commands::insert,
            commands::events,
            commands::complete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
