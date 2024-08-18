use serde::{Serialize};
use uuid::Uuid;
use chrono::NaiveDateTime;
use std::default::Default;

#[derive(Serialize, Clone, Debug)]
pub struct TaskDescription {
    id: String,
    pub content: String,
    pub tags: Vec<String>,
    pub rrule: Option<String>,
    pub priority: u8,
    pub effort: u16,
    pub start: Option<NaiveDateTime>,
    pub due: Option<NaiveDateTime>,
    pub schedule: Option<NaiveDateTime>,
}
   
impl Default for TaskDescription {
    fn default() -> Self {
        TaskDescription {
            id: Uuid::new_v4().to_string(),
            content: String::new(),
            tags: vec![],
            rrule: None,
            priority: 0,
            effort: 1,
            start: None,
            due: None,
            schedule: None
        }
    }
}
