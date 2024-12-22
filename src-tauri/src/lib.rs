mod commands;
mod query;
mod scheduling;
mod state;
mod tasks;

use state::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()  {
    let state = GlobalState::new();

    // let calendar_listen_handle = state.calendar_listen();

    // rock'n'roll
    tauri::Builder::default()
       // .setup(|_| {
        //     tauri::async_runtime::spawn(async move {
        //         // let _ = join_all([calendar_listen_handle]).await;
        //     });

        //     Ok(())
        // })

        .manage(state)

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
