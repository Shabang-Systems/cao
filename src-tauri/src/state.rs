use serde::{Serialize, Deserialize};
use super::tasks::{parse_tasks, core::TaskDescription};

use anyhow::Result;
use std::fs::File;
use std::io::prelude::*;

use std::sync::Mutex;

use serde_lexpr::{print, to_string_custom};

#[derive(Serialize, Deserialize, Debug)]
pub struct GlobalState {
    pub tasks: Mutex<Vec<TaskDescription>>,
    pub path: String
}

impl From<tauri::State<'_, GlobalState>> for GlobalState {
    fn from(value: tauri::State<GlobalState>) -> Self {
        let tasks = value.tasks.lock().expect("aaa mutex poisoning TODO");
        Self { tasks: Mutex::new(tasks.clone()), path: value.path.clone() } 
    }
}

impl GlobalState {
    pub fn demo_init() -> Self {
        // TODO the actual init function should UPDATE PATH on load
        let tasks = Mutex::new(parse_tasks(vec!["# omg!\nI have an empty day.",
                                                "## what\nam I say this?.",
                                                "# what!\nshall"]));
        GlobalState {
            tasks: tasks,
            path: expanduser::expanduser("~/Downloads/cao.el").unwrap().display().to_string()
        }
    }

    /// save to the predetermined save path, calls [GlobalState::save_to]
    pub fn save(&self) -> Result<()> {
        self.save_to(&self.path)
    }

    /// save state to path
    pub fn save_to(&self, path: &str) -> Result<()> {
        let text = to_string_custom(self, print::Options::elisp())?;
        let mut file = File::create(path)?;
        file.write_all(text.as_bytes())?;

        Ok(())
    }

    /// upsert a particular task description into the system
    pub fn upsert(&self, desc: &TaskDescription) {
        {
            let mut tasks = self.tasks.lock().expect("aaa mutex poisoning TODO");

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


