use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, serde::ts_microseconds_option};
use std::default::Default;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskDescription {
    //// task ID 
    #[doc(hidden)]
    pub(crate) id: String,
    //// capture board ID, optional
    #[doc(hidden)]
    pub(crate) capture: Option<String>,
    /// the context of the task (i.e. title + description)
    pub content: String,
    /// tags (MD headers above and inside the content)
    pub tags: Vec<String>,
    /// RFC5545 recurrence rule
    pub rrule: Option<String>,
    /// priority of the task, hi gher is more
    pub priority: u8,
    /// effort of the task, in hours
    pub effort: f32,
    /// when the task is able to be done
    #[serde(with = "ts_microseconds_option")]
    pub start: Option<DateTime<Utc>>,
    /// when the task is needs to be done
    #[serde(with = "ts_microseconds_option")]
    pub due: Option<DateTime<Utc>>,
    /// when the task is scheduled to be done
    #[serde(with = "ts_microseconds_option")]
    pub schedule: Option<DateTime<Utc>>,
    /// when the task was capture
    pub captured: DateTime<Utc>,
    /// is the schedule date locked (i.e. no auto schedule)
    pub locked: bool,
    /// is the task completed
    pub completed: bool,
}

impl TaskDescription {
    pub fn new(capture_id: Option<String>) -> Self {
        TaskDescription {
            id: Uuid::new_v4().to_string(),
            capture: capture_id,
            content: String::new(),
            tags: vec![],
            rrule: None,
            priority: 0,
            effort: 1.0,
            start: None,
            due: None,
            schedule: None,
            captured: Utc::now().into(),
            locked: false,
            completed: false,
        }
    }
}
   
impl Default for TaskDescription {
    fn default() -> Self {
        TaskDescription::new(None)
    }
}
