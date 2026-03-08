mod commands;
mod query;
mod scheduling;
mod state;
mod tasks;

use state::*;
use tauri::{Builder, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()  {
    let state = GlobalState::new();

    // rock'n'roll
    Builder::default()
        .manage(state)

        .setup(|app| {
            let handle = app.handle().clone();
            let s = app.state::<GlobalState>();
            s.calendar_listen(handle);
            Ok(())
        })

        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())

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

}
