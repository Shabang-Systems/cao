use futures::FutureExt;
use serde::{Serialize, Deserialize};
use std::panic::AssertUnwindSafe;
use tokio::task::JoinHandle;
use super::tasks::{core::TaskDescription};
use super::query::core::QueryRequest;
use super::scheduling::{Event, freebusy::find_events};

use tokio::time::{sleep, Duration};

use anyhow::{Result, anyhow};
use std::fs::File;
use std::io::prelude::*;

use std::sync::Arc;


use std::sync::Mutex;

use serde_json::{to_string_pretty, from_str};

/// what's the upsert tryin' to 'sert?
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Transaction {
    Task(TaskDescription),
    Board(Vec<String>),
    Search(Vec<QueryRequest>),
    Horizon(usize),
    Calendars(Vec<String>),
}
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Delete {
    Task(String),
}

fn eight() -> usize {
    return 8;
}

/// Application registry
/// This should contain everything about the application that
/// includes user generated, non-instance-specific data
#[derive(Serialize, Deserialize, Debug, Clone, Default)]
pub struct Cao {
    #[serde(default)]
    pub tasks: Vec<TaskDescription>,
    #[serde(default)]
    pub scratchpads: Vec<String>,
    #[serde(default)]
    pub searches: Vec<QueryRequest>,
    #[serde(default)]
    pub work_slots: Vec<Event>,
    #[serde(default)]
    pub calendars: Vec<String>,
    #[serde(default="eight")]
    pub horizon: usize,

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
    pub monitor: Arc<Mutex<Cao>>,
    /// path of the state file
    /// if `None`, it means that we haven't loaded anything
    /// and hence the monitor should be empty
    pub path: Arc<Mutex<Option<String>>>,
}

impl From<tauri::State<'_, GlobalState>> for GlobalState {
    fn from(value: tauri::State<GlobalState>) -> Self {
        let state = value.monitor.lock().expect("aaa mutex poisoning TODO");
        Self {
            monitor: Arc::new(Mutex::new((*state).clone())),
            path: Arc::new(Mutex::new(value.path.lock().expect("poisioning TODO").clone()))
        } 
    }
}

/// Public Operatinos
impl GlobalState {
    pub fn new() -> Self {
        GlobalState {
            monitor: Arc::new(Mutex::new(Cao::default())),
            path: Arc::new(Mutex::new(None))
        }
    }

    /// Seed the new global state with demo content + saving it to a file
    pub fn bootstrap(&self, path: &str) {
        {
            let mut p = self.path.lock().expect("mutex poisoning TODO");
            *p = Some(path.to_owned());

            let mut m = self.monitor.lock().expect("mutex poisoning TODO");
            *m = Cao { tasks: vec![], scratchpads: vec![],
                       searches: vec![], horizon: 8, work_slots: vec![],
                       calendars: vec![] };
        }
        let mc = self.monitor.clone();
        // we need to fire off a thread to update the calendar info
        tokio::spawn(async move {
            GlobalState::update_calendar(mc).await.unwrap();

        });
        let _ = self.save();
    }

    /// Load an existing file, if it could be serialized/loaded
    pub fn load(&self, path: &str) -> Result<()> {
        let mut m = self.monitor.lock().expect("mutex poisoning TODO");
        *m = {
            let mut file = File::open(&path)?;
            let mut buf = String::new();
            let _ = file.read_to_string(&mut buf);
            from_str::<Arc<Mutex<Cao>>>(&buf)?.lock().expect("poisionng TODO").clone()
        };

        let mut p = self.path.lock().expect("mutex poisoning TODO");
        *p = Some(path.to_owned());

        let mc = self.monitor.clone();
        // we need to fire off a thread to update the calendar info
        tokio::spawn(async move {
            GlobalState::update_calendar(mc).await.expect("failed to fetch calendar; is the internet connected?");

        });


        Ok(())
    }


    /// save to the predetermined save path, calls [GlobalState::save_to]
    pub fn save(&self) -> Result<()> {
        let path = self.path
                     .lock()
                     .expect("mutex poisinong TODO")
                     .clone();
        self.save_to(&path
                     .ok_or(anyhow!("attempted to write to nonexistant state"))?)
    }

    /// save state to path
    pub fn save_to(&self, path: &str) -> Result<()> {
        let text = to_string_pretty(&(*self.monitor))?;
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
            Transaction::Horizon(horizon) => self.set_horizon_(*horizon),
            Transaction::Calendars(calendars) => self.set_calendars_(calendars),
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

    /// update calendar information for some state of self
    pub async fn update_calendar(monitor: Arc<Mutex<Cao>>) -> Result<()> {
        // we first copy out the current calendar requestse
        let calendars = {
            let m = monitor.lock().expect("mutex poisoning TODO");
            m.calendars.clone()
        };

        // wait as we load them in
        let events = find_events(&calendars).await?;

        // we update the calendar info every minute
        {
            let mut m = monitor.lock().expect("mutex poisoning TODO");
            m.work_slots = events;
        }

        Ok(())
    }

    /// listen to calendar update
    pub fn calendar_listen(&self) -> JoinHandle<()> {
        // we are not worried about aggressive cloning of self.monitor,
        // beacuse its an Arc<Mutex<_>> so we are just copying a pointer around
        let cao = self.monitor.clone();
        tokio::spawn(async move {
            loop {
                let c_copy = cao.clone();
                // BIG BIG WARNING
                // we AssertUnwindSafe on the following closure, meaning if you
                // use any mutable reference or RefCell inside which panics
                // it will cause the shared data to be in an INCONSISTENT STATE
                //
                // Across any .unwrap() / .expect() boundary, make sure that you
                // are not holding cao's monitor mutex (that is, NO UNWRAPS WHEN
                // YOU HOLD THE CAO MUTEX). If you do, you will poison the global
                // monitor mutex and crash the app. You can, however, poison
                // your own/calendar mutexes because they will be re-created on the
                // next loop.
                //
                // so anything in this reference needs to be a standard mutex (NOT
                // tokio mutex), because standard mutexes have correctly-implemneted
                // poisoning semantics or have interior mutability which is not
                // held across await boundaries. The complier WILL NOT check it
                // for you.
                let may_panic = async move {
                    GlobalState::update_calendar(c_copy).await.unwrap();
                };
                let res = AssertUnwindSafe(may_panic).catch_unwind().await;
                match res {
                    Ok(_) => (),
                    Err(_) => println!("Failed to read calendar, skipping....")
                };
                sleep(Duration::from_secs(1*60)).await;
            };
        })
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
            monitor.scratchpads = pads.clone();
        }
    }
    fn upsert_search_(&self, queries: &Vec<QueryRequest>) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            monitor.searches = queries.clone();
        }
    }
    fn set_horizon_(&self, horizon: usize) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            monitor.horizon = horizon;
        }
    }
    fn set_calendars_(&self, calendars: &Vec<String>) {
        {
            let mut monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
            monitor.calendars = calendars.clone();
        }
    }
}
