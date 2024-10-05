use std::{io::Read, path::Path, sync::atomic::AtomicU64, time::SystemTime};

use super::query::core::QueryRequest;
use super::scheduling::Event;
use super::state::*;
use crate::tasks::core::TaskDescription;

use notify::event::Event as NE;
use tauri::window::Window;

use serde_json::from_str;
use std::fs::File;
use std::sync::Mutex;

use tauri::Emitter;

use std::fs::metadata;
use std::sync::Arc;

use notify::{RecursiveMode, Watcher};

fn get_time(path: &str) -> anyhow::Result<u64> {
    Ok(metadata(path)?
        .modified()?
        .duration_since(SystemTime::UNIX_EPOCH)?
        .as_secs())
}

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

/// initialize application state from nothing
#[tauri::command]
pub fn bootstrap(path: &str, state: tauri::State<GlobalState>, window: Window) {
    state.bootstrap(path);
    let path = state.path.lock().expect("mutex poisoning TODO");

    let c = state.monitor.clone();

    let p = path.to_owned().unwrap();
    let pc = p.clone();

    let load = move || {
        let mut m = c.lock().expect("poisoning...");
        *m = {
            let mut file = File::open(&pc)?;
            let mut buf = String::new();
            let _ = file.read_to_string(&mut buf);
            from_str::<Arc<Mutex<Cao>>>(&buf)?
                .lock()
                .expect("poisionng TODO")
                .clone()
        };

        Ok(())
    };

    watch(p, state.write_time.clone(), window, load);
}

/// load a snapshot of the application state
#[tauri::command]
pub fn load(path: &str, state: tauri::State<GlobalState>, window: Window) -> bool {
    let loaded = state.load(path).is_ok();
    let path = state.path.lock().expect("mutex poisoning TODO");

    let c = state.monitor.clone();

    let p = match path.to_owned() {
        Some(n) => n,
        None => return false,
    };
    let pc = p.clone();

    let load = move || {
        let mut m = c.lock().expect("poisoning...");
        *m = {
            let mut file = File::open(&pc)?;
            let mut buf = String::new();
            let _ = file.read_to_string(&mut buf);
            from_str::<Arc<Mutex<Cao>>>(&buf)?
                .lock()
                .expect("poisionng TODO")
                .clone()
        };

        Ok(())
    };

    watch(p, state.write_time.clone(), window, load);

    loaded
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
    };
}

/// return a snapshot of the application state
#[tauri::command]
pub fn snapshot(state: tauri::State<GlobalState>) -> Cao {
    return {
        let monitor = state.monitor.lock().expect("mutex poisoning, TODO");
        (*monitor).clone()
    };
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
pub fn index(
    query: QueryRequest,
    state: tauri::State<GlobalState>,
) -> Result<Vec<TaskDescription>, String> {
    match state.index(&query) {
        Ok(x) => Ok(x),
        Err(e) => Err(e.to_string()),
    }
}

/// upsert a task into the database
#[tauri::command]
pub fn delete(transaction: Delete, state: tauri::State<GlobalState>) {
    state.delete(&transaction);
}

/// complete a task
#[tauri::command]
pub fn complete(id: String, state: tauri::State<GlobalState>) -> Option<TaskDescription> {
    state.complete(&id)
}
