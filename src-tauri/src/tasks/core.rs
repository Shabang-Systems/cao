use chrono::TimeZone;
use chrono::{serde::ts_milliseconds_option, DateTime, Utc};
use rrule::{RRuleSet, Tz as RTz};
use serde::{Deserialize, Serialize};
use std::default::Default;
use uuid::Uuid;

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

#[derive(Serialize, Deserialize, Clone, Debug, sqlx::FromRow)]
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
    pub tags: sqlx::types::Json<Vec<String>>,
    /// RFC5545 recurrence rule
    #[serde(default)]
    pub rrule: Option<String>,
    /// priority of the task, hi gher is more
    #[serde(default)]
    pub priority: u8,
    /// effort of the task, in hours
    #[serde(default = "one")]
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
            tags: vec![].into(),
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
            let distance = self
                .start
                .map(|x| self.due.unwrap().signed_duration_since(x));

            // parse and increment due date
            let dtstart = self
                .due
                .unwrap()
                .format("DTSTART:%Y%m%dT%H%M%SZ\n")
                .to_string();
            let rrule = format!("{}{}", dtstart, self.rrule.as_ref().unwrap().as_str());
            let rset: RRuleSet = rrule.parse()?;
            let cast = RTz::UTC
                .from_local_datetime(&self.due.unwrap().naive_utc())
                .unwrap();
            let cands = rset
                .after(cast)
                .all(2)
                .dates
                .into_iter()
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

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, Duration, TimeZone};

    #[test]
    fn test_new_task_has_uuid() {
        let task = TaskDescription::new(None);
        assert!(!task.id.is_empty());
        // UUID v4 format: 8-4-4-4-12
        assert_eq!(task.id.len(), 36);
    }

    #[test]
    fn test_new_task_defaults() {
        let task = TaskDescription::new(None);
        assert_eq!(task.content, "");
        assert_eq!(task.tags.len(), 0);
        assert_eq!(task.priority, 0);
        assert_eq!(task.effort, 1.0);
        assert!(!task.completed);
        assert!(!task.locked);
        assert!(task.start.is_none());
        assert!(task.due.is_none());
        assert!(task.schedule.is_none());
        assert!(task.rrule.is_none());
        assert!(task.capture.is_none());
    }

    #[test]
    fn test_new_task_with_capture_id() {
        let task = TaskDescription::new(Some("cap-123".to_string()));
        assert_eq!(task.capture, Some("cap-123".to_string()));
    }

    #[test]
    fn test_complete_toggles_simple_task() {
        let mut task = TaskDescription::new(None);
        assert!(!task.completed);
        task.complete().unwrap();
        assert!(task.completed);
        task.complete().unwrap();
        assert!(!task.completed);
    }

    #[test]
    fn test_complete_no_rrule_toggles() {
        let mut task = TaskDescription::new(None);
        task.due = Some(Utc::now());
        // No rrule, so complete should toggle
        task.complete().unwrap();
        assert!(task.completed);
    }

    #[test]
    fn test_complete_with_rrule_advances_due() {
        let mut task = TaskDescription::new(None);
        let base_due = Utc.with_ymd_and_hms(2025, 1, 1, 12, 0, 0).unwrap();
        task.due = Some(base_due);
        task.rrule = Some("RRULE:FREQ=WEEKLY;INTERVAL=1".to_string());

        task.complete().unwrap();

        // Should NOT be marked completed (recurring task)
        assert!(!task.completed);
        // Due date should have advanced by ~1 week
        let new_due = task.due.unwrap();
        assert!(new_due > base_due);
        assert!((new_due - base_due).num_days() >= 6);
        assert!((new_due - base_due).num_days() <= 8);
    }

    #[test]
    fn test_complete_with_rrule_clears_schedule() {
        let mut task = TaskDescription::new(None);
        let base_due = Utc.with_ymd_and_hms(2025, 1, 1, 12, 0, 0).unwrap();
        task.due = Some(base_due);
        task.schedule = Some(base_due);
        task.rrule = Some("RRULE:FREQ=DAILY;INTERVAL=1".to_string());

        task.complete().unwrap();

        // Schedule should be cleared so the user re-schedules
        assert!(task.schedule.is_none());
    }

    #[test]
    fn test_complete_with_rrule_preserves_start_distance() {
        let mut task = TaskDescription::new(None);
        let base_due = Utc.with_ymd_and_hms(2025, 3, 10, 12, 0, 0).unwrap();
        let base_start = base_due - Duration::days(3);
        task.due = Some(base_due);
        task.start = Some(base_start);
        task.rrule = Some("RRULE:FREQ=WEEKLY;INTERVAL=1".to_string());

        task.complete().unwrap();

        // Start should have moved to maintain the 3-day gap
        let new_due = task.due.unwrap();
        let new_start = task.start.unwrap();
        let gap = new_due.signed_duration_since(new_start);
        assert_eq!(gap.num_days(), 3);
    }

    #[test]
    fn test_unique_ids() {
        let task1 = TaskDescription::new(None);
        let task2 = TaskDescription::new(None);
        assert_ne!(task1.id, task2.id);
    }

    #[test]
    fn test_default_effort_is_one() {
        let task = TaskDescription::default();
        assert_eq!(task.effort, 1.0);
    }

    // ---- fixture JSON deserialization tests ----

    fn load_fixtures() -> Vec<TaskDescription> {
        let json = include_str!("../../tests/fixtures.json");
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn test_fixture_loads_all_tasks() {
        let tasks = load_fixtures();
        assert_eq!(tasks.len(), 15);
    }

    #[test]
    fn test_fixture_preserves_ids() {
        let tasks = load_fixtures();
        assert_eq!(tasks[0].id, "aaaa-1111-bbbb-2222");
        assert_eq!(tasks[1].id, "bbbb-2222-cccc-3333");
    }

    #[test]
    fn test_fixture_fields_out_of_order() {
        // tasks[1] has "content" before "id", tasks[2] has "tags" first
        let tasks = load_fixtures();
        assert_eq!(tasks[1].content, "Fix login bug");
        assert_eq!(tasks[1].id, "bbbb-2222-cccc-3333");
        assert_eq!(tasks[2].id, "cccc-3333-dddd-4444");
        assert!(tasks[2].completed);
    }

    #[test]
    fn test_fixture_negative_epoch_dates() {
        let tasks = load_fixtures();
        // due: -1ms => 1969-12-31T23:59:59.999Z
        let task = &tasks[3];
        assert_eq!(task.content, "Task due on Feb 30 (impossible day)");
        let due = task.due.unwrap();
        assert!(due.timestamp_millis() == -1);

        // task from 1969 with negative start and due
        let task = &tasks[4];
        assert_eq!(task.due.unwrap().timestamp_millis(), -86400000);
        assert_eq!(task.start.unwrap().timestamp_millis(), -172800000);
        assert!(task.start.unwrap() < task.due.unwrap());
    }

    #[test]
    fn test_fixture_distant_future() {
        let tasks = load_fixtures();
        let task = &tasks[5];
        assert_eq!(task.content, "Task in distant future year 2099");
        let due = task.due.unwrap();
        assert!(due.year() >= 2099);
        assert!(task.schedule.is_some());
    }

    #[test]
    fn test_fixture_backwards_timeline() {
        // due < start (due is before start)
        let tasks = load_fixtures();
        let task = &tasks[6];
        assert_eq!(task.content, "Due before start (backwards timeline)");
        assert!(task.due.unwrap() < task.start.unwrap());
    }

    #[test]
    fn test_fixture_minimal_task_defaults() {
        let tasks = load_fixtures();
        let task = &tasks[7];
        assert_eq!(task.content, "Minimal task - only required fields");
        // serde defaults should fill in
        assert_eq!(task.priority, 0);
        assert_eq!(task.effort, 1.0);
        assert!(task.tags.is_empty());
        assert!(task.start.is_none());
        assert!(task.due.is_none());
        assert!(task.schedule.is_none());
        assert!(task.rrule.is_none());
        assert!(!task.locked);
    }

    #[test]
    fn test_fixture_max_values() {
        let tasks = load_fixtures();
        let task = &tasks[8];
        assert_eq!(task.effort, 100.0);
        assert_eq!(task.priority, 255);
        assert_eq!(task.tags.len(), 4);
        assert!(task.locked);
        assert!(task.rrule.is_some());
        assert!(task.start.is_some());
        assert!(task.due.is_some());
        assert!(task.schedule.is_some());
    }

    #[test]
    fn test_fixture_completed_recurring() {
        let tasks = load_fixtures();
        let task = &tasks[9];
        assert!(task.completed);
        assert!(task.rrule.is_some());
    }

    #[test]
    fn test_fixture_empty_content() {
        let tasks = load_fixtures();
        let task = &tasks[10];
        assert_eq!(task.content, "");
    }

    #[test]
    fn test_fixture_schedule_without_due() {
        let tasks = load_fixtures();
        let task = &tasks[11];
        assert!(task.schedule.is_some());
        assert!(task.due.is_none());
    }

    #[test]
    fn test_fixture_zero_effort() {
        let tasks = load_fixtures();
        let task = &tasks[12];
        assert_eq!(task.effort, 0.0);
    }

    #[test]
    fn test_fixture_unicode_content_and_tags() {
        let tasks = load_fixtures();
        let task = &tasks[13];
        assert!(task.content.contains("买菜"));
        assert!(task.content.contains("café"));
        assert!(task.tags.contains(&"i18n".to_string()));
        assert!(task.tags.contains(&"日本語".to_string()));
    }

    #[test]
    fn test_fixture_all_dates_identical() {
        let tasks = load_fixtures();
        let task = &tasks[14];
        assert_eq!(task.due, task.start);
        assert_eq!(task.due, task.schedule);
        // due/start/schedule are all 1735689600000ms = 2025-01-01T00:00:00Z
        // captured is "2025-01-01T00:00:00Z" (RFC3339)
        assert_eq!(task.captured.timestamp_millis(), task.due.unwrap().timestamp_millis());
    }

    #[test]
    fn test_fixture_roundtrip_serialize_deserialize() {
        let tasks = load_fixtures();
        for task in &tasks {
            let json = serde_json::to_string(task).unwrap();
            let back: TaskDescription = serde_json::from_str(&json).unwrap();
            assert_eq!(back.id, task.id);
            assert_eq!(back.content, task.content);
            assert_eq!(back.completed, task.completed);
            assert_eq!(back.priority, task.priority);
            assert_eq!(back.effort, task.effort);
            assert_eq!(back.due, task.due);
            assert_eq!(back.start, task.start);
            assert_eq!(back.schedule, task.schedule);
            assert_eq!(back.locked, task.locked);
        }
    }

    #[test]
    fn test_fixture_filter_by_tag_work() {
        let tasks = load_fixtures();
        let work_tasks: Vec<_> = tasks.iter()
            .filter(|t| t.tags.contains(&"work".to_string()))
            .collect();
        assert_eq!(work_tasks.len(), 3); // Fix login bug, Max effort, Completed recurring
    }

    #[test]
    fn test_fixture_filter_incomplete() {
        let tasks = load_fixtures();
        let incomplete: Vec<_> = tasks.iter().filter(|t| !t.completed).collect();
        assert_eq!(incomplete.len(), 13); // 15 - 2 completed
    }

    #[test]
    fn test_fixture_complete_recurring_advances() {
        // Take the "Fix login bug" task (has rrule + due) and complete it
        let tasks = load_fixtures();
        let mut task = tasks[1].clone();
        let original_due = task.due.unwrap();
        assert!(task.rrule.is_some());

        task.complete().unwrap();

        // Should NOT be marked completed (recurring)
        assert!(!task.completed);
        // Due should have advanced
        assert!(task.due.unwrap() > original_due);
        // Start-due distance should be preserved
        let original_gap = original_due.signed_duration_since(tasks[1].start.unwrap());
        let new_gap = task.due.unwrap().signed_duration_since(task.start.unwrap());
        assert_eq!(original_gap.num_days(), new_gap.num_days());
    }
}
