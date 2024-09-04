use crate::tasks::core::TaskDescription;
use super::query::core::QueryRequest;
use super::state::*;

/// return a snapshot of the application state
#[tauri::command]
pub fn bootstrap(path: &str, state: tauri::State<GlobalState>) {
    return {
        state.bootstrap(path)
    }
}

/// return a snapshot of the application state
#[tauri::command]
pub fn load(path: &str, state: tauri::State<GlobalState>) -> bool {
    return {
        state.load(path).is_ok()
    }
}

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
pub fn index(query: QueryRequest, state: tauri::State<GlobalState>) -> Result<Vec<TaskDescription>, String> {
    match state.index(&query) {
        Ok(x) => Ok(x),
        Err(e) => Err(e.to_string())
    }
}

/// upsert a task into the database
#[tauri::command]
pub fn delete(transaction: Delete, state: tauri::State<GlobalState>) {
    state.delete(&transaction);
}
