use std::str::FromStr;
use super::scheduling::{freebusy::find_events, Event};
use super::tasks::core::TaskDescription;
use serde::{Deserialize, Serialize};
use tokio::time::{sleep, Duration};
use anyhow::{Result};
use std::sync::Arc;
use futures::FutureExt;
use std::panic::AssertUnwindSafe;
use tauri::async_runtime::JoinHandle;
use futures::future::join_all;
use super::query::core::BrowseRequest;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::sync::{Mutex, RwLock};
use tauri::Emitter;

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
    #[serde(default = "eight")]
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
    /// the connection
    pub pool: Arc<RwLock<Option<SqlitePool>>>,
    /// path of the state file
    /// if `None`, it means that we haven't loaded anything
    /// and hence the pool should be empty
    pub path: Arc<Mutex<Option<String>>>,
}

impl Cao {
    pub async fn read_pool(pool: &SqlitePool) -> Result<Cao> {
        let tasks: Vec<TaskDescription> = sqlx::query_as("SELECT * FROM tasks ORDER BY id").fetch_all(pool).await?;
        let scratchpads: Vec<(String, )> = sqlx::query_as("SELECT content FROM scratchpads ORDER BY id").fetch_all(pool).await?;
        let searches: Vec<(sqlx::types::Json<BrowseRequest>, )> = sqlx::query_as("SELECT request FROM searches ORDER BY id").fetch_all(pool).await?;
        let work_slots: Vec<Event> = sqlx::query_as("SELECT * FROM events").fetch_all(pool).await?;
        let calendars: Vec<(String, )> = sqlx::query_as("SELECT content FROM calendars ORDER BY id").fetch_all(pool).await?;
        let horizon: (u32,) = sqlx::query_as("SELECT horizon FROM configuration LIMIT 1").fetch_one(pool).await?;

        let cao = Cao {
            tasks,
            scratchpads: scratchpads.into_iter().map(|x| x.0).collect(),
            searches: searches.into_iter().map(|x| x.0.0).collect(),
            work_slots,
            calendars: calendars.into_iter().map(|x| x.0).collect(),
            horizon: horizon.0 as usize
        };

        Ok(cao)
    }
}

/// Public Operatinos
impl GlobalState {
    pub fn new() -> Self {
        GlobalState {
            pool: Arc::new(RwLock::new(None)),
            path: Arc::new(Mutex::new(None))
        }
    }

    /// Load an existing file, if it could be serialized/loaded
    pub async fn load(&self, path: &str) -> Result<()> {
        let mut path_final = "sqlite://".to_string();
        path_final.push_str(path);
        let pool = SqlitePoolOptions::new()
            .connect_with(
                SqliteConnectOptions::from_str(&path_final)?
                    .create_if_missing(true)
            ).await?;
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await?;

        let pool_copy = pool.clone();

        let mut p = self.path.lock().expect("mutex poisoning TODO");
        *p = Some(path.to_owned());

        let mut pl = self.pool.write().expect("mutex posioning");
        *pl = Some(pool);

        // we need to fire off a thread to update the calendar info
        tauri::async_runtime::spawn(async move {
            if let Err(e) = GlobalState::update_calendar(&pool_copy).await {
                println!("Failed to fetch calendar on load: {e}");
            }
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

    /// complete a task
    pub async fn complete(&self, id: &str) -> Option<TaskDescription> {
        self.complete_task_(id).await
    }

    /// drop something from the system
    pub async fn delete(&self, transaction: &Delete) {
        let _ = match transaction {
            Delete::Task(task) => self.delete_task_(&task).await,
        };
    }

    /// upsert a particular task description into the system
    pub async fn index(&self, request: &BrowseRequest) -> Result<Vec<TaskDescription>> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        //let tasks: Vec<TaskDescription> = sqlx::query_as("SELECT * FROM tasks").fetch_all(&pool).await?;
        //let res = request.execute(&tasks)?;
        let res = request.execute_sqlite(&pool).await?;
        Ok(res)
        //Ok(res.iter().map(|&x| x.clone()).collect::<Vec<TaskDescription>>())
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
        sqlx::query("DELETE FROM events")
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
                 }).collect::<Vec<_>>()).await;
                               
        Ok(())
    }

    /// listen to calendar update
    pub fn calendar_listen(&self, app_handle: tauri::AppHandle) -> JoinHandle<()> {
        // we are not worried about aggressive cloning of self.pool,
        // because its an Arc<RwLock<_>> so we are just copying a pointer around
        let pool = self.pool.clone();
        tauri::async_runtime::spawn(async move {
            loop {
                {
                    let locked = pool.read().expect("poisoning... TODO!").clone();
                    // skip if the pool hasn't been initialized yet (no db loaded)
                    if let Some(db_pool) = locked {
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
                            GlobalState::update_calendar(&db_pool).await.unwrap();
                        };
                        let res = AssertUnwindSafe(may_panic).catch_unwind().await;
                        match res {
                            Ok(_) => {
                                let _ = app_handle.emit("calendar-updated", ());
                            },
                            Err(_) => println!("Failed to read calendar, skipping....")
                        };
                    }
                }
                sleep(Duration::from_secs(1*60)).await;
            };
        })
    }
}

/// Type-specific CRUD Operatinos
impl GlobalState {
    async fn complete_task_(&self, id: &str) -> Option<TaskDescription> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        let mut task: TaskDescription = sqlx::query_as(
            "SELECT * FROM tasks WHERE id = ? LIMIT 1"
        ).bind(id).fetch_one(&pool).await.ok()?;
        task.complete().ok()?;

        // commit to db
        self.upsert_td_(&task).await.ok()?;

        Some(task)
    }

    async fn delete_task_(&self, id: &str)  -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(id)
            .execute(&pool).await?;

        Ok(())
    }

    async fn upsert_td_(&self, desc: &TaskDescription) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("INSERT OR REPLACE INTO tasks
                   (id, capture, content, tags, rrule, priority, effort, start, due, schedule, captured, locked, completed)
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
        sqlx::query("DELETE FROM scratchpads").execute(&pool).await?;
        let _ = join_all(pads.into_iter()
                         .enumerate()
                         .map(|(i, x)| {
                             sqlx::query("INSERT INTO scratchpads (id,content) VALUES (?,?)")
                                 .bind(i as u32)
                                 .bind(x)
                                 .execute(&pool)
                         }).collect::<Vec<_>>()).await;

        Ok(())
    }
    async fn set_search_(&self, queries: &Vec<BrowseRequest>) -> Result<()> {
        let pool = self.pool.read().expect("poisoning... TODO!").clone().unwrap();
        sqlx::query("DELETE FROM searches").execute(&pool).await?;
        let futs: Vec<_> = queries.into_iter()
            .enumerate()
            .map(|(i, x)| {
                let pc = pool.clone();
                let json = sqlx::types::Json(x.clone());
                async move {
                    sqlx::query("INSERT INTO searches (id,request) VALUES (?,?)")
                        .bind(i as u32)
                        .bind(json)
                        .execute(&pc).await
                }
            }).collect();
        let _ = join_all(futs).await;

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
        sqlx::query("DELETE FROM calendars").execute(&pool).await?;
        let futs: Vec<_> = calendars.into_iter()
            .enumerate()
            .map(|(i,x)| {
                let pc = pool.clone();
                let val = x.clone();
                async move {
                    sqlx::query("INSERT INTO calendars (id,content) VALUES (?,?)")
                        .bind(i as u32)
                        .bind(val)
                        .execute(&pc).await
                }
            }).collect();
        let _ = join_all(futs).await;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Datelike;
    use crate::query::core::Availability;

    /// Helper: create an in-memory SQLite pool with migrations applied
    async fn test_pool() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect_with(
                SqliteConnectOptions::from_str("sqlite::memory:")
                    .unwrap()
                    .create_if_missing(true),
            )
            .await
            .unwrap();
        sqlx::migrate!("./migrations").run(&pool).await.unwrap();
        pool
    }

    #[tokio::test]
    async fn test_new_state_has_no_pool() {
        let state = GlobalState::new();
        let locked = state.pool.read().unwrap().clone();
        assert!(locked.is_none(), "fresh GlobalState should have no pool");
    }

    #[tokio::test]
    async fn test_new_state_has_no_path() {
        let state = GlobalState::new();
        let p = state.path.lock().unwrap().clone();
        assert!(p.is_none(), "fresh GlobalState should have no path");
    }

    #[tokio::test]
    async fn test_cao_read_pool_empty_db() {
        let pool = test_pool().await;
        let cao = Cao::read_pool(&pool).await.unwrap();
        assert!(cao.tasks.is_empty());
        assert!(cao.scratchpads.is_empty());
        assert!(cao.searches.is_empty());
        assert!(cao.work_slots.is_empty());
        assert!(cao.calendars.is_empty());
        assert_eq!(cao.horizon, 8);
    }

    #[tokio::test]
    async fn test_upsert_and_read_task() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let task = TaskDescription::new(None);
        let tid = task.id.clone();
        state.upsert(&Transaction::Task(task)).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.tasks.len(), 1);
        assert_eq!(cao.tasks[0].id, tid);
    }

    #[tokio::test]
    async fn test_upsert_horizon() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        state.upsert(&Transaction::Horizon(14)).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.horizon, 14);
    }

    #[tokio::test]
    async fn test_upsert_scratchpads() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let pads = vec!["pad1".to_string(), "pad2".to_string()];
        state.upsert(&Transaction::Board(pads.clone())).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.scratchpads, pads);
    }

    #[tokio::test]
    async fn test_upsert_searches() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let searches = vec![BrowseRequest::default(), BrowseRequest::default()];
        state.upsert(&Transaction::Search(searches.clone())).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.searches.len(), 2);
    }

    #[tokio::test]
    async fn test_upsert_calendars() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let cals = vec!["https://cal.example.com/a.ics".to_string()];
        state.upsert(&Transaction::Calendars(cals.clone())).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.calendars, cals);
    }

    #[tokio::test]
    async fn test_delete_task() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let task = TaskDescription::new(None);
        let tid = task.id.clone();
        state.upsert(&Transaction::Task(task)).await.unwrap();

        state.delete(&Delete::Task(tid)).await;

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert!(cao.tasks.is_empty());
    }

    #[tokio::test]
    async fn test_complete_task() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let mut task = TaskDescription::new(None);
        task.due = Some(chrono::Utc::now());
        let tid = task.id.clone();
        state.upsert(&Transaction::Task(task)).await.unwrap();

        let result = state.complete(&tid).await;
        assert!(result.is_some());
        assert!(result.unwrap().completed);
    }

    #[tokio::test]
    async fn test_index_returns_results() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        let task = TaskDescription::new(None);
        state.upsert(&Transaction::Task(task)).await.unwrap();

        let results = state.index(&BrowseRequest::default()).await.unwrap();
        assert_eq!(results.len(), 1);
    }

    #[tokio::test]
    async fn test_update_calendar_empty_calendars() {
        // update_calendar with no calendar URLs should succeed (no events)
        let pool = test_pool().await;
        GlobalState::update_calendar(&pool).await.unwrap();

        let events: Vec<(i64,)> = sqlx::query_as("SELECT COUNT(*) FROM events")
            .fetch_one(&pool).await.map(|r| vec![r]).unwrap();
        assert_eq!(events[0].0, 0);
    }

    #[tokio::test]
    async fn test_scratchpads_overwrite_on_re_upsert() {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);

        state.upsert(&Transaction::Board(vec!["a".into(), "b".into()])).await.unwrap();
        state.upsert(&Transaction::Board(vec!["c".into()])).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.scratchpads, vec!["c".to_string()]);
    }

    // ---- fixture-based integration tests: round-trip through SQLite ----

    fn load_fixtures() -> Vec<TaskDescription> {
        let json = include_str!("../tests/fixtures.json");
        serde_json::from_str(json).unwrap()
    }

    async fn state_with_fixtures() -> GlobalState {
        let pool = test_pool().await;
        let state = GlobalState::new();
        *state.pool.write().unwrap() = Some(pool);
        let tasks = load_fixtures();
        for task in &tasks {
            state.upsert(&Transaction::Task(task.clone())).await.unwrap();
        }
        state
    }

    #[tokio::test]
    async fn test_fixture_all_tasks_persist() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        assert_eq!(cao.tasks.len(), 15);
    }

    #[tokio::test]
    async fn test_fixture_ids_survive_roundtrip() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let ids: Vec<&str> = cao.tasks.iter().map(|t| t.id.as_str()).collect();
        assert!(ids.contains(&"aaaa-1111-bbbb-2222"));
        assert!(ids.contains(&"ffff-6666-0000-7777"));
        assert!(ids.contains(&"7777-eeee-8888-ffff"));
    }

    #[tokio::test]
    async fn test_fixture_negative_dates_survive_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "dddd-4444-eeee-5555").unwrap();
        assert_eq!(task.due.unwrap().timestamp_millis(), -1);

        let task = cao.tasks.iter().find(|t| t.id == "eeee-5555-ffff-6666").unwrap();
        assert_eq!(task.due.unwrap().timestamp_millis(), -86400000);
        assert_eq!(task.start.unwrap().timestamp_millis(), -172800000);
    }

    #[tokio::test]
    async fn test_fixture_distant_future_survives_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "ffff-6666-0000-7777").unwrap();
        assert!(task.due.unwrap().year() >= 2099);
        assert!(task.schedule.is_some());
    }

    #[tokio::test]
    async fn test_fixture_backwards_timeline_survives_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "0000-7777-1111-8888").unwrap();
        assert!(task.due.unwrap() < task.start.unwrap());
    }

    #[tokio::test]
    async fn test_fixture_unicode_survives_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "7777-eeee-8888-ffff").unwrap();
        assert!(task.content.contains("买菜"));
        assert!(task.content.contains("café"));
        assert!(task.tags.contains(&"日本語".to_string()));
    }

    #[tokio::test]
    async fn test_fixture_max_values_survive_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "2222-9999-3333-aaaa").unwrap();
        assert_eq!(task.effort, 100.0);
        assert_eq!(task.priority, 255);
        assert!(task.locked);
        assert_eq!(task.tags.len(), 4);
    }

    #[tokio::test]
    async fn test_fixture_empty_content_survives_sqlite() {
        let state = state_with_fixtures().await;
        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        let task = cao.tasks.iter().find(|t| t.id == "4444-bbbb-5555-cccc").unwrap();
        assert_eq!(task.content, "");
    }

    #[tokio::test]
    async fn test_fixture_query_incomplete_via_sqlite() {
        let state = state_with_fixtures().await;
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        // 15 total, 2 completed => 13 incomplete
        assert_eq!(results.len(), 13);
        assert!(results.iter().all(|t| !t.completed));
    }

    #[tokio::test]
    async fn test_fixture_query_completed_via_sqlite() {
        let state = state_with_fixtures().await;
        let req = BrowseRequest {
            availability: Availability::Done,
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        assert_eq!(results.len(), 2);
        assert!(results.iter().all(|t| t.completed));
    }

    #[tokio::test]
    async fn test_fixture_query_by_tag_via_sqlite() {
        let state = state_with_fixtures().await;
        let req = BrowseRequest {
            availability: Availability::All,
            tags: vec!["edge-case".to_string()],
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        assert_eq!(results.len(), 3); // negative epoch, impossible date, backwards timeline
    }

    #[tokio::test]
    async fn test_fixture_query_by_multiple_tags_via_sqlite() {
        let state = state_with_fixtures().await;
        let req = BrowseRequest {
            availability: Availability::All,
            tags: vec!["edge-case".to_string(), "time-travel".to_string()],
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].id, "eeee-5555-ffff-6666");
    }

    #[tokio::test]
    async fn test_fixture_query_ordered_by_due_asc() {
        let state = state_with_fixtures().await;
        let req = BrowseRequest {
            availability: Availability::All,
            order: super::super::query::core::OrderRequest {
                order: super::super::query::core::OrderType::Due,
                ascending: true,
            },
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        // tasks with due dates should be ordered ascending
        let dues: Vec<Option<i64>> = results.iter()
            .map(|t| t.due.map(|d| d.timestamp_millis()))
            .collect();
        // verify non-null dues are sorted
        let non_null: Vec<i64> = dues.iter().filter_map(|d| *d).collect();
        for w in non_null.windows(2) {
            assert!(w[0] <= w[1], "due dates not ascending: {} > {}", w[0], w[1]);
        }
    }

    #[tokio::test]
    async fn test_fixture_delete_then_query() {
        let state = state_with_fixtures().await;
        state.delete(&Delete::Task("aaaa-1111-bbbb-2222".to_string())).await;
        let req = BrowseRequest {
            availability: Availability::All,
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        assert_eq!(results.len(), 14);
        assert!(!results.iter().any(|t| t.id == "aaaa-1111-bbbb-2222"));
    }

    #[tokio::test]
    async fn test_fixture_complete_then_query() {
        let state = state_with_fixtures().await;
        // Complete "Buy groceries" (no rrule, should toggle completed)
        let result = state.complete("aaaa-1111-bbbb-2222").await.unwrap();
        assert!(result.completed);

        let req = BrowseRequest {
            availability: Availability::Done,
            ..Default::default()
        };
        let results = state.index(&req).await.unwrap();
        // Was 2 completed, now 3
        assert_eq!(results.len(), 3);
    }

    #[tokio::test]
    async fn test_fixture_upsert_updates_existing() {
        let state = state_with_fixtures().await;
        let mut tasks = load_fixtures();
        tasks[0].content = "Updated content".to_string();
        tasks[0].priority = 99;
        state.upsert(&Transaction::Task(tasks[0].clone())).await.unwrap();

        let pool_ref = state.pool.read().unwrap().clone().unwrap();
        let cao = Cao::read_pool(&pool_ref).await.unwrap();
        // Should still be 15 (upsert, not insert)
        assert_eq!(cao.tasks.len(), 15);
        let updated = cao.tasks.iter().find(|t| t.id == "aaaa-1111-bbbb-2222").unwrap();
        assert_eq!(updated.content, "Updated content");
        assert_eq!(updated.priority, 99);
    }

    #[tokio::test]
    async fn test_fixture_available_filters_correctly() {
        let state = state_with_fixtures().await;
        let available_req = BrowseRequest {
            availability: Availability::Available,
            ..Default::default()
        };
        let available = state.index(&available_req).await.unwrap();
        // Available means: incomplete AND (start is null OR start < now)
        // All returned tasks must be incomplete
        assert!(available.iter().all(|t| !t.completed));
        // Available count should be <= incomplete count (13)
        assert!(available.len() <= 13);
        // Available count should be > 0 (we have tasks without start dates)
        assert!(available.len() > 0);
    }
}
