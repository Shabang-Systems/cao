use serde::{Serialize};
use uuid::Uuid;
use chrono::{NaiveDateTime, Utc};
use std::default::Default;

#[derive(Serialize, Clone, Debug)]
pub struct TaskDescription {
    //// task ID 
    id: String,
    //// capture board ID, optional
    capture: Option<String>,
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
    pub start: Option<NaiveDateTime>,
    /// when the task is needs to be done
    pub due: Option<NaiveDateTime>,
    /// when the task is scheduled to be done
    pub schedule: Option<NaiveDateTime>,
    /// when the task was capture
    pub captured: NaiveDateTime,
    /// is the schedule date locked (i.e. no auto schedule)
    pub locked: bool,
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
            captured: Utc::now().naive_local(),
            locked: false
        }
    }
}
   
impl Default for TaskDescription {
    fn default() -> Self {
        TaskDescription::new(None)
    }
}