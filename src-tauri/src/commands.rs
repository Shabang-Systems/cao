use sqlx::Sqlite;

use super::scheduling::Event;
use crate::tasks::core::TaskDescription;
use super::query::core::BrowseRequest;
use super::state::*;

use std::result::Result;

/// initialize application state from nothing
#[tauri::command]
pub async fn bootstrap(path: String, state: tauri::State<'_, GlobalState>) -> Result<bool, String> {
    match state.load(&path).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
}

/// load a snapshot of the application state
#[tauri::command]
pub async fn load(path: String, state: tauri::State<'_, GlobalState>) -> Result<bool, String> {
    match state.load(&path).await {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
}

/// get the user's events 
#[tauri::command]
pub async fn events(state: tauri::State<'_, GlobalState>) -> Result<Vec<Event>, String> {
    let pool = state.pool.read().expect("poisoning... TODO!").clone().unwrap();
    let work_slots: Result<Vec<Event>, String> = match sqlx::query_as::<Sqlite, Event>("SELECT * FROM events").fetch_all(&pool).await {
        Ok(v) => Ok(v),
        Err(e) => Err(e.to_string())
    };

    work_slots
}

/// return a snapshot of the application state
#[tauri::command]
pub async fn snapshot(state: tauri::State<'_, GlobalState>) -> Result<Cao, String> {
    let pool = state.pool.read().expect("poisoning... TODO!").clone().unwrap();
    match Cao::read_pool(&pool).await {
        Ok(x) => Ok(x),
        Err(e) => Err(e.to_string())
    }
}

/// upsert an object into the database
#[tauri::command]
pub async fn upsert(transaction: Transaction, state: tauri::State<'_, GlobalState>) -> Result<(), String> {
    match state.upsert(&transaction).await {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}

/// insert a **task** (only!) into the database
#[tauri::command]
pub async fn insert(task: TaskDescription, state: tauri::State<'_, GlobalState>) -> Result<TaskDescription, String> {
    match state.upsert(&Transaction::Task(task.clone())).await {
        Ok(_) => Ok(task),
        Err(e) => Err(e.to_string())
    }
}

/// upsert a task into the database
#[tauri::command]
pub async fn index(query: BrowseRequest, state: tauri::State<'_, GlobalState>) -> Result<Vec<TaskDescription>, String> {
    match state.index(&query).await {
        Ok(x) => Ok(x),
        Err(e) => Err(e.to_string())
    }
}

/// upsert a task into the database
#[tauri::command]
pub async fn delete(transaction: Delete, state: tauri::State<'_, GlobalState>) -> Result<(), ()> {
    state.delete(&transaction).await;

    Ok(())
}
