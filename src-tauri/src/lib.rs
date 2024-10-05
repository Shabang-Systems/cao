use anyhow::Result;

mod commands;
mod query;
mod scheduling;
mod state;
mod tasks;
use futures::future::join_all;

use state::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()  {
    let state = GlobalState::new();
    // let calendar_listen_handle = state.calendar_listen();

    // rock'n'roll
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
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

    // let _ = join_all([calendar_listen_handle]).await;
}
