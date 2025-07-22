// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use anyhow::Result;

mod tasks;
mod state;
mod query;
mod commands;
mod scheduling;
use futures::future::join_all;

use state::*;

#[tokio::main]
async fn main() -> Result<()> {
    let state = GlobalState::new();
    let calendar_listen_handle = state.calendar_listen();

        // rock'n'roll
    tauri::Builder::default()
        .manage(state)
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

    let _ = join_all([
        calendar_listen_handle
    ]).await;

    Ok(())
}
