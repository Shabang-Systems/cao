use super::scheduling::Event;
use crate::tasks::core::TaskDescription;
use super::query::core::QueryRequest;
use super::state::*;

/// initialize application state from nothing
#[tauri::command]
pub fn bootstrap(path: &str, state: tauri::State<GlobalState>) {
    return {
        state.bootstrap(path)
    }
}

/// get the user's events 
#[tauri::command]
pub fn events(state: tauri::State<GlobalState>) -> Vec<Event> {
    return {
        let res = {
            let monitor = state.monitor.lock().expect("mutex poisoning, TODO");
            monitor.work_slots.clone()
        };

        let _ = state.save();

        res
    }
}

/// load a snapshot of the application state
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

/// upsert an object into the database
#[tauri::command]
pub fn upsert(transaction: Transaction, state: tauri::State<GlobalState>) {
    state.upsert(&transaction);
}

/// insert a **task** (only!) into the database
#[tauri::command]
pub fn insert(task: TaskDescription, state: tauri::State<GlobalState>) -> TaskDescription {
    state.upsert(&Transaction::Task(task.clone()));
    task
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
