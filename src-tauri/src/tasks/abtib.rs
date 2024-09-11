use super::core::TaskDescription;
use serde::{Serialize, Deserialize};
use std::cell::RefCell;
use std::rc::Rc;
use std::iter::zip;

use uuid::Uuid;
use chrono::{DateTime, Utc, serde::ts_milliseconds_option};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DateTimeHelper {
    #[serde(default)]
    #[serde(with = "ts_milliseconds_option")]
    start: Option<DateTime<Utc>>,
    #[serde(default)]
    #[serde(with = "ts_milliseconds_option")]
    end: Option<DateTime<Utc>>,
}

/// Given a raw capture buffer, parse the structure and tags of a task.
#[tauri::command]
pub fn parse_tasks(captured: Vec<&str>, dates: Vec<DateTimeHelper>) -> Vec<TaskDescription> {
    let tag_stack:Rc<RefCell<Vec<String>>> = Rc::new(RefCell::new(vec![]));
    let start_stack:Rc<RefCell<Vec<Option<DateTime<Utc>>>>> = Rc::new(RefCell::new(vec![]));
    let due_stack:Rc<RefCell<Vec<Option<DateTime<Utc>>>>> = Rc::new(RefCell::new(vec![]));
    let mut result:Vec<TaskDescription> = vec![];
    let capture = Some(Uuid::new_v4().to_string());

    zip(captured.into_iter(), dates.into_iter()).for_each(|(x, dates)| {
        x.split("\n").for_each(|line| {
            let ts_handle = tag_stack.clone();
            let ss_handle = start_stack.clone();
            let ds_handle = due_stack.clone();
            let iter = line.split(" ");
            iter.take(1).next().into_iter().for_each(move |elem| {
                if elem.len() > 0 && elem.bytes().all(|b| matches!(b, b'#')) {
                    let level = elem.len();
                    while ts_handle.borrow().len() >= level {
                        ts_handle.borrow_mut().pop();
                        ss_handle.borrow_mut().pop();
                        ds_handle.borrow_mut().pop();
                    }
                    ts_handle.borrow_mut()
                        .push(line.replace("#", "").trim().to_owned());
                    ss_handle.borrow_mut()
                        .push(dates.start);
                    ds_handle.borrow_mut()
                        .push(dates.end);

                }
            });
        });

        let mut res:TaskDescription = TaskDescription::new(capture.clone());
        res.content = x.to_owned();
        res.tags = sqlx::types::Json(tag_stack.borrow().clone());

        res.start = start_stack.borrow()
            .iter().rev().filter(|&x| x.is_some()).next().and_then(|x| *x);
        res.due = due_stack.borrow()
            .iter().rev().filter(|&x| x.is_some()).next().and_then(|x| *x);

        result.push(res);
    });

    result
}

