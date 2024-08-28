// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Result;

mod tasks;
mod state;
mod query;
mod commands;

use state::*;

#[tokio::main]
async fn main() -> Result<()> {
    // TODO initial with actual stored state
    let state = GlobalState::demo_init();

    // rock'n'roll
    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            tasks::parse_tasks,
            commands::snapshot,
            commands::upsert,
            commands::delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    Ok(())
}
