use std::{path::Path, sync::atomic::AtomicU64, time::SystemTime};

use super::scheduling::Event;
use sqlx::Sqlite;

use crate::tasks::core::TaskDescription;
use super::query::core::BrowseRequest;
use super::state::*;

use notify::event::Event as NE;
use tauri::window::Window;
use tauri::Emitter;

use std::fs::metadata;
use std::sync::Arc;

use notify::{RecursiveMode, Watcher};

#[allow(dead_code)]
fn get_time(path: &str) -> anyhow::Result<u64> {
    Ok(metadata(path)?
        .modified()?
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs())
}

#[allow(dead_code)]
fn watch(
    path: String,
    write_time: Arc<AtomicU64>,
    window: Window,
    load: impl Fn() -> anyhow::Result<()> + std::marker::Send + 'static,
) {
    let p = path.clone();
    let refresh = move || {
        let _ = window.emit("refresh", ());
    };

    // hook a notification daemon
    let mut watcher = Box::new(
        notify::recommended_watcher(move |res: Result<NE, _>| {
            match res {
                Ok(_) => {
                    // if let EventKind::Modify(_) = k.kind {
                    let now = match get_time(&p) {
                        Ok(r) => r,
                        Err(_) => 0,
                    };
                    let wt = write_time.load(std::sync::atomic::Ordering::SeqCst);
                    if (now - wt) != 0 {
                        let _ = load();
                        refresh();
                    }
                    // }
                }
                Err(_) => (),
            }
        })
        .expect("failed to watch"),
    );
    // if failed to watch, don't worry about it
    let _ = watcher.watch(Path::new(&path), RecursiveMode::NonRecursive);
    // and do a funny so that our watcher lives forever
    Box::leak(watcher);
}

use std::result::Result;

/// initialize application state from nothing
#[tauri::command]
pub async fn bootstrap(path: String, state: tauri::State<'_, GlobalState>) -> Result<bool, String> {

    // TODO some kind of onboarding
    let loaded = state.load(&path).await;
    match loaded {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
    // TODO
    // watch(p, state.write_time.clone(), window, load);

}


/// initialize state
#[tauri::command]
pub async fn load(path: String, state: tauri::State<'_, GlobalState>) -> Result<bool, String> {
    let loaded = state.load(&path).await;
    match loaded {
        Ok(_) => Ok(true),
        Err(_) => Ok(false)
    }
    // TODO
    // watch(p, state.write_time.clone(), window, load);

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
        Err(e) => Err(e.to_string()),
    }
}

/// upsert a task into the database
#[tauri::command]
pub async fn delete(transaction: Delete, state: tauri::State<'_, GlobalState>) -> Result<(), ()> {
    state.delete(&transaction).await;

    Ok(())
}

/// complete a task
#[tauri::command]
pub async fn complete(id: String, state: tauri::State<'_, GlobalState>) -> Result<TaskDescription, ()> {
    let res = state.complete(&id).await.ok_or(());
    res
}
