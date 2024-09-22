use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{DateTime, Utc, serde::ts_milliseconds_option};
use std::default::Default;
use rrule::{RRuleSet, Tz as RTz};
use chrono::TimeZone;

use anyhow::Result;

fn one() -> f32 {
    return 1.0;
}

fn uuidify() -> String {
    Uuid::new_v4().to_string()
}
fn now() -> DateTime<Utc> {
    Utc::now()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TaskDescription {
    //// task ID 
    #[doc(hidden)]
    #[serde(default = "uuidify")]
    pub(crate) id: String,
    //// capture board ID, optional
    #[doc(hidden)]
    #[serde(default)]
    pub(crate) capture: Option<String>,
    /// the context of the task (i.e. title + description)
    pub content: String,
    /// tags (MD headers above and inside the content)
    #[serde(default)]
    pub tags: Vec<String>,
    /// RFC5545 recurrence rule
    #[serde(default)]
    pub rrule: Option<String>,
    /// priority of the task, hi gher is more
    #[serde(default)]
    pub priority: u8,
    /// effort of the task, in hours
    #[serde(default="one")]
    pub effort: f32,
    /// when the task is able to be done
    #[serde(default)]
    #[serde(with = "ts_milliseconds_option")]
    pub start: Option<DateTime<Utc>>,
    /// when the task is needs to be done
    #[serde(default)]
    #[serde(with = "ts_milliseconds_option")]
    pub due: Option<DateTime<Utc>>,
    /// when the task is scheduled to be done
    #[serde(default)]
    #[serde(with = "ts_milliseconds_option")]
    pub schedule: Option<DateTime<Utc>>,
    /// when the task was capture
    #[serde(default = "now")]
    pub captured: DateTime<Utc>,
    /// is the schedule date locked (i.e. no auto schedule)
    #[serde(default)]
    pub locked: bool,
    /// is the task completed
    #[serde(default)]
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

    pub fn complete(&mut self) -> Result<()> {
        if self.rrule.is_none() || self.due.is_none() {
            self.completed = !self.completed;
        } else {
            // if there is a defer date, compute the distance between defer and due dates
            let distance = self.start.map(|x| self.due.unwrap().signed_duration_since(x));

            // parse and increment due date
            let dtstart = self.due.unwrap().format("DTSTART:%Y%m%dT%H%M%SZ\n").to_string();
            let rrule = format!("{}{}", dtstart, self.rrule.as_ref().unwrap().as_str());
            let rset: RRuleSet = rrule.parse()?;
            let cast = RTz::UTC.from_local_datetime(&self.due.unwrap().naive_utc()).unwrap();
            let cands = rset.after(cast).all(2)
                .dates.into_iter()
                .filter(|x| x > &cast)
                .collect::<Vec<_>>();
            let next = cands.first();
            if next.is_none() {
                self.completed = true;
                return Ok(());
            }

            let res = next.unwrap().to_utc();
            self.due = Some(res);

            // make the user schedule it again
            self.schedule = None;

            // if distance exists, move start date as well
            if let Some(d) = distance {
                self.start = Some(self.due.unwrap().checked_sub_signed(d).unwrap());
            }
        }

        Ok(())
    }
}
   
impl Default for TaskDescription {
    fn default() -> Self {
        TaskDescription::new(None)
    }
}
