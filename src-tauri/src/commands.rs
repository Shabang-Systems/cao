use super::state::*;
use super::tasks::core::TaskDescription;

/// return a snapshot of the application state
#[tauri::command]
pub fn snapshot(state: tauri::State<GlobalState>) -> GlobalState {
    state.into()
}

/// upsert a task into the database
#[tauri::command]
pub fn upsert(task: TaskDescription, state: tauri::State<GlobalState>) {
    state.upsert(&task);
}
