use serde::{Serialize, Deserialize};
use super::tasks::{parse_tasks, core::TaskDescription};

use anyhow::Result;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;

use std::sync::Mutex;

use serde_json::{to_string_pretty, from_str};

/// Application registry
/// This should contain everything about the application that
/// includes user generated, non-instance-specific data
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Cao {
    pub tasks: Vec<TaskDescription>
}

/// Global shared application state
///
/// # Note
/// Everything that is serializable to file/should be synced
/// should be held in the / [Cao] struct. Other variables here
/// should be loaded at runtime.
///
/// Recall, [GlobalState] does **not** leave the Rust backend
/// and the view controller only gets a JSON snapshot of [Cao]
#[derive(Serialize, Deserialize, Debug)]
pub struct GlobalState {
    /// registry of the Cao state held in the monitor pattern  
    pub monitor: Mutex<Cao>,
    /// path of the state file
    pub path: String
}

impl From<tauri::State<'_, GlobalState>> for GlobalState {
    fn from(value: tauri::State<GlobalState>) -> Self {
        let state = value.monitor.lock().expect("aaa mutex poisoning TODO");
        Self {
            monitor: Mutex::new((*state).clone()),
            path: value.path.clone()
        } 
    }
}

impl GlobalState {
    pub fn demo_init() -> Self {
        let test_path = expanduser::expanduser("~/Downloads/cao.json")
            .unwrap().display().to_string();


        GlobalState {
            monitor:
            if Path::new(&test_path).exists() {
                let mut file = File::open(&test_path).expect("whoops, can't read demo file");
                let mut buf = String::new();
                let _ = file.read_to_string(&mut buf);
                from_str::<Mutex<Cao>>(&buf).expect("whoops, serialized format is wrong")
            } else {
                let tasks = parse_tasks(vec!["# omg!\nI have an empty day.",
                                             "## what\nam I say this?.",
                                             "# what!\nshall"]);
                let state = Cao { tasks: tasks };
                Mutex::new(state)
            },
            path: test_path
        }
    }

    /// save to the predetermined save path, calls [GlobalState::save_to]
    pub fn save(&self) -> Result<()> {
        self.save_to(&self.path)
    }

    /// save state to path
    pub fn save_to(&self, path: &str) -> Result<()> {
        let text = to_string_pretty(&self.monitor)?;
        let mut file = File::create(path)?;
        file.write_all(text.as_bytes())?;

        Ok(())
    }

    /// upsert a particular task description into the system
    pub fn upsert(&self, desc: &TaskDescription) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            let tasks = &mut monitor.tasks;

            // TODO make this not cringé
            if let Some(idx) = tasks.iter().position(|r| r.id == desc.id) {
                tasks[idx] = desc.clone();
            } else {
                tasks.push(desc.clone());
            }
        }
        // commit to file
        let _ = self.save();
    }
}


