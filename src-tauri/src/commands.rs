use super::scheduling::Event;
use crate::tasks::core::TaskDescription;
use super::query::core::BrowseRequest;
use super::state::*;

use std::result::Result;

/// initialize application state from nothing
#[tauri::command]
pub async fn bootstrap(path: String, state: tauri::State<'_, GlobalState>) -> Result<(), String> {
    match state.load(&path).await {
        Ok(_) => Ok(()),
        Err(_) => Err("failed to load file".to_owned())
    }
}

/// load a snapshot of the application state
#[tauri::command]
pub async fn load(path: String, state: tauri::State<'_, GlobalState>) -> Result<(), String> {
    match state.load(&path).await {
        Ok(_) => Ok(()),
        Err(_) => Err("failed to load file".to_owned())
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

        res
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
pub async fn upsert(transaction: Transaction, state: tauri::State<'_, GlobalState>) -> Result<(), String> {
    match state.upsert(&transaction).await {
        Ok(_) => Ok(()),
        Err(_) => Err("upsert failed".to_owned())
    }
}

/// insert a **task** (only!) into the database
#[tauri::command]
pub async fn insert(task: TaskDescription, state: tauri::State<'_, GlobalState>) -> Result<TaskDescription, String> {
    match state.upsert(&Transaction::Task(task.clone())).await {
        Ok(_) => Ok(task),
        Err(_) => Err("insert failed".to_owned())
    }
}

/// upsert a task into the database
#[tauri::command]
pub fn index(query: BrowseRequest, state: tauri::State<GlobalState>) -> Result<Vec<TaskDescription>, String> {
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
