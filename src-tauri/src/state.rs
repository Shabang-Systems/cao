use futures::FutureExt;
use serde::{Serialize, Deserialize};
use std::panic::AssertUnwindSafe;
use tokio::task::JoinHandle;
use futures::future::join_all;
use super::tasks::{core::TaskDescription};
use super::query::core::BrowseRequest;
use super::scheduling::{Event, freebusy::find_events};
use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use tokio::time::{sleep, Duration};
use anyhow::{Result};
use std::sync::Arc;
use std::sync::{Mutex, RwLock};

/// what's the upsert tryin' to 'sert?
#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum Transaction {
    Task(TaskDescription),
    Board(Vec<String>),
    Search(Vec<BrowseRequest>),
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
    pub searches: Vec<BrowseRequest>,
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
pub struct GlobalState {
    /// registry of the Cao state held in the monitor pattern  
    pub monitor: Arc<Mutex<Cao>>,
    /// the connection
    pub pool: Arc<RwLock<Option<SqlitePool>>>,
    /// path of the state file
    /// if `None`, it means that we haven't loaded anything
    /// and hence the monitor should be empty
    pub path: Arc<Mutex<Option<String>>>,
}

/// Public Operatinos
impl GlobalState {
    pub async fn new() -> Self {
        GlobalState {
            pool: Arc::new(RwLock::new(None)),
            monitor: Arc::new(Mutex::new(Cao::default())),
            path: Arc::new(Mutex::new(None)),
        }
    }

    /// Load an existing file, if it could be serialized/loaded
    pub async fn load(&self, path: &str) -> Result<()> {
        let pool = SqlitePoolOptions::new().connect(path).await?;
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        let pool_copy = pool.clone();

        let mut p = self.path.lock().expect("mutex poisoning TODO");
        *p = Some(path.to_owned());

        let mut pl = self.pool.write().expect("mutex posioning");
        *pl = Some(pool);

        // we need to fire off a thread to update the calendar info
        tokio::spawn(async move {
            GlobalState::update_calendar(&pool_copy).await.expect("failed to fetch calendar; is the internet connected?");
        });

        Ok(())
    }


    /// save to the predetermined save path, calls [GlobalState::save_to]
    pub fn save(&self) -> Result<()> {
        // no-op
        return Ok(());
    }

    /// upsert a particular task description into the system
    pub async fn upsert(&self, transaction: &Transaction) -> Result<()> {
        match transaction {
            Transaction::Task(task) => self.upsert_td_(task).await,
            Transaction::Board(boards) => self.set_scratchpad_(boards).await,
            Transaction::Search(search) => self.set_search_(search).await,
            Transaction::Horizon(horizon) => self.set_horizon_(*horizon).await,
            Transaction::Calendars(calendars) => self.set_calendars_(calendars).await
        }
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
    pub fn index(&self, request: &BrowseRequest) -> Result<Vec<TaskDescription>> {
        let monitor = self.monitor.lock().expect("aaa mutex poisoning TODO");
        let tasks = &monitor.tasks;
        let res = request.execute(&tasks)?;

        Ok(res.iter().map(|&x| x.clone()).collect::<Vec<TaskDescription>>())
    }

    /// update calendar information for some state of self
    pub async fn update_calendar(pool: &SqlitePool) -> Result<()> {
        // we first copy out the current calendar requestse
        let calendars = {
            let cals: Vec<(String, )> = sqlx::query_as("SELECT content FROM calendars")
                .fetch_all(pool).await?;
            cals.into_iter().map(|x| x.0).collect::<Vec<String>>()
        };

        // wait as we load them in
        let events = find_events(&calendars).await?;

        // delete the old events
        sqlx::query("TRUNCATE TABLE events")
            .execute(pool).await?;

        // pop all events in
        let _ = join_all(events.into_iter()
                 .map(|x| {
                     sqlx::query("INSERT INTO events (start, end, is_all_day, name) VALUES (?, ?, ?, ?)")
                         .bind(x.start)
                         .bind(x.end)
                         .bind(x.is_all_day)
                         .bind(x.name)
                         .execute(pool)
                 }).collect::<Vec<_>>());
                               
        Ok(())
    }

    /// listen to calendar update
    pub fn calendar_listen(&self) -> JoinHandle<()> {
        // we are not worried about aggressive cloning of self.monitor,
        // beacuse its an Arc<Mutex<_>> so we are just copying a pointer around
        let pool = self.pool.clone();
        tokio::spawn(async move {
            loop {
                {
                    let locked = pool.read().expect("poisoning... TODO!").clone();
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
                        GlobalState::update_calendar(&locked.unwrap()).await.unwrap();
                    };
                    let res = AssertUnwindSafe(may_panic).catch_unwind().await;
                    match res {
                        Ok(_) => (),
                        Err(_) => println!("Failed to read calendar, skipping....")
                    };
                }
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

    async fn upsert_td_(&self, desc: &TaskDescription) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("INSERT OR REPLACE INTO tasks
                   (id capture content tags rrule priority effort start due schedule captured locked completed)
                   VALUES
                   (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                .bind(desc.id.clone()).bind(desc.capture.clone())
                .bind(desc.content.clone()).bind(desc.tags.clone())
                .bind(desc.rrule.clone()).bind(desc.priority)
                .bind(desc.effort).bind(desc.start)
                .bind(desc.due).bind(desc.schedule)
                .bind(desc.captured).bind(desc.locked)
                .bind(desc.completed)
                .execute(&pool).await?;

        Ok(())
    }

    async fn set_scratchpad_(&self, pads: &Vec<String>) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("TRUNCATE TABLE scratchpads").execute(&pool).await?;
        let _ = join_all(pads.into_iter()
                         .map(|x| {
                             sqlx::query("INSERT INTO scratchpads (content) VALUES (?)")
                                 .bind(x)
                                 .execute(&pool)
                         }).collect::<Vec<_>>());

        Ok(())
    }
    async fn set_search_(&self, queries: &Vec<BrowseRequest>) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("TRUNCATE TABLE searches").execute(&pool).await?;
        let _ = join_all(queries.into_iter()
                         .map(|x| {
                             sqlx::query("INSERT INTO searches (request) VALUES (?)")
                                 .bind(sqlx::types::Json(x))
                                 .execute(&pool)
                         }).collect::<Vec<_>>());

        Ok(())
    }
    async fn set_horizon_(&self, horizon: usize) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("INSERT OR REPLACE INTO configuration (sentry, horizon) VALUES (0, ?)")
            .bind(horizon as u32)
            .execute(&pool).await?;
        Ok(())
    }
    async fn set_calendars_(&self, calendars: &Vec<String>) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("TRUNCATE TABLE calendars").execute(&pool).await?;
        let _ = join_all(calendars.into_iter()
                         .map(|x| {
                             sqlx::query("INSERT INTO calendars (content) VALUES (?)")
                                 .bind(x)
                                 .execute(&pool)
                         }).collect::<Vec<_>>());

        Ok(())
    }
}
