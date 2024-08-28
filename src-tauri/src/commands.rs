use super::state::*;

/// return a snapshot of the application state
#[tauri::command]
pub fn snapshot(state: tauri::State<GlobalState>) -> Cao {
    return {
        let monitor = state.monitor.lock().expect("mutex poisoning, TODO");
        (*monitor).clone()
    }
}

/// upsert a task into the database
#[tauri::command]
pub fn upsert(transaction: Transaction, state: tauri::State<GlobalState>) {
    state.upsert(&transaction);
}

/// upsert a task into the database
#[tauri::command]
pub fn delete(transaction: Delete, state: tauri::State<GlobalState>) {
    state.delete(&transaction);
}
