use serde::{Serialize, Deserialize};
use super::tasks::{parse_tasks, core::TaskDescription};
use super::query::core::QueryRequest;

use anyhow::Result;
use std::fs::File;
use std::io::prelude::*;
use std::path::Path;

use std::sync::Mutex;

use serde_json::{to_string_pretty, from_str};

/// what's the upsert tryin' to 'sert?
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Transaction {
    Task(TaskDescription),
    Board(Vec<String>),
    Search(Vec<QueryRequest>),
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Delete {
    Task(String),
}

/// Application registry
/// This should contain everything about the application that
/// includes user generated, non-instance-specific data
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Cao {
    #[serde(default)]
    pub tasks: Vec<TaskDescription>,
    #[serde(default)]
    pub scratchpads: Vec<String>,
    #[serde(default)]
    pub searches: Vec<QueryRequest>,
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

/// Public Operatinos
impl GlobalState {
    /// a temporary global init scheme before more careful thinking transpires
    /// TODO obviously can't go to production
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
                let state = Cao { tasks: tasks, scratchpads: vec![], searches: vec![] };
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
    pub fn upsert(&self, transaction: &Transaction) {
        match transaction {
            Transaction::Task(task) => self.upsert_td_(task),
            Transaction::Board(boards) => self.upsert_scratchpad_(boards),
            Transaction::Search(search) => self.upsert_search_(search),
        }
        
        // commit to file
        let _ = self.save();
    }

    /// drop something from the system
    pub fn delete(&self, transaction: &Delete) {
        let _ = match transaction {
            Delete::Task(task) => self.delete_task_(&task),
        };
        
        // commit to file
        let _ = self.save();
    }

    /// upsert a particular task description into the system
    pub fn index(&self, request: &QueryRequest) -> Result<Vec<TaskDescription>> {
        let monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
        let tasks = &monitor.tasks;
        let res = request.execute(&tasks)?;

        Ok(res.iter().map(|&x| x.clone()).collect::<Vec<TaskDescription>>())
    }
}


/// Type-specific CRUD Operatinos
impl GlobalState {

    fn delete_task_(&self, id: &str) {
        let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
        let tasks = &mut monitor.tasks;
        match tasks.iter().position(|x| x.id == id) {
            Some(idx) => { tasks.remove(idx); },
            None => (),
        };
    }

    fn upsert_td_(&self, desc: &TaskDescription) {
        let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
        let tasks = &mut monitor.tasks;

        // TODO make this not cringé
        if let Some(idx) = tasks.iter().position(|r| r.id == desc.id) {
            tasks[idx] = desc.clone();
        } else {
            tasks.push(desc.clone());
        }
    }
    fn upsert_scratchpad_(&self, pads: &Vec<String>) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            // TODO this is goofy fix it
            monitor.scratchpads = pads.clone();
        }
    }
    fn upsert_search_(&self, queries: &Vec<QueryRequest>) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            // TODO this is goofy fix it
            monitor.searches = queries.clone();
        }
    }
}
