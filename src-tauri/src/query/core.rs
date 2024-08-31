use serde::{Serialize, Deserialize};
use std::{cmp::Ordering, default::Default};
use regex::Regex;

use chrono::{Utc, DateTime};

use anyhow::Result;

use super::super::tasks::core::TaskDescription;

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub enum Availability {
    All,
    #[default]
    Incomplete,
    Available,
    Done,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub enum OrderType {
    Due,
    Start,
    #[default]
    Captured,
    Scheduled,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct OrderRequest {
    #[serde(default)]
    pub order: OrderType,
    pub ascending: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct QueryRequest {
    #[serde(default)]
    pub availability: Availability,
    #[serde(default)]
    pub order: OrderRequest,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub query_regexp: Option<String>,
}

impl QueryRequest {
    fn compare_fn_dateoptions(main_a: Option<DateTime<Utc>>,
                              main_b: Option<DateTime<Utc>>,
                              backup_a: DateTime<Utc>,
                              backup_b: DateTime<Utc>) -> Ordering {
        if !main_a.is_none() && !main_b.is_none() {
            main_a.unwrap().timestamp_millis().cmp(&main_b.unwrap().timestamp_millis())
        } else if main_a.is_none() && !main_b.is_none() {
            Ordering::Greater
        } else if main_b.is_none() && !main_a.is_none() {
            Ordering::Less
        } else {
            backup_a.timestamp_millis().cmp(&backup_b.timestamp_millis())
       }
    }

    /// Use a QueryRequest to filter a list of tasks
    pub fn execute<'a>(&self, data: &'a[TaskDescription]) -> Result<Vec<&'a TaskDescription>>{
        let q = match &self.query_regexp {
            Some(x) => Some(Regex::new(&x)?),
            None => None
        };
        let today = Utc::now();
        
        let mut filtered:Vec<_> = data
            .iter()
            .filter(|x|
                    self.tags.iter()
                    .map(|y| x.tags.contains(y))
                    .fold(true, |acc, mk| acc && mk))
            .filter(|x| match &q { Some(y) => !y.captures(&x.content).is_none(), None => true })
            .filter(|x| match self.availability {
                Availability::Incomplete => !x.completed,
                Availability::Available => 
                    !x.completed &&
                    (x.start.is_none() ||
                     x.start.unwrap() < today),
                Availability::Done => x.completed,
                Availability::All => true,
            })
            .collect();

        dbg!(&filtered);

        filtered.sort_by(|x, y| {
            match self.order.order {
                OrderType::Captured => x.captured.timestamp_millis().cmp(&y.captured.timestamp_millis()),
                OrderType::Start => QueryRequest::compare_fn_dateoptions(
                    x.start, y.start, x.captured, y.captured
                ),
                OrderType::Due => QueryRequest::compare_fn_dateoptions(
                    x.due, y.due, x.captured, y.captured
                ),
                OrderType::Scheduled => QueryRequest::compare_fn_dateoptions(
                    x.schedule, y.schedule, x.captured, y.captured
                )
            }
        });

        if !self.order.ascending { 
            filtered.reverse();
        }

        Ok(filtered)
    }
}

