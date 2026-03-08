use regex::Regex;
use serde::{Deserialize, Serialize};
use std::{cmp::Ordering, default::Default};
use sqlx::sqlite::{Sqlite, SqlitePool};
use sqlx::{query_builder::QueryBuilder};

use chrono::{DateTime, Utc};

use anyhow::Result;

use super::super::tasks::core::TaskDescription;

#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
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
pub struct BrowseRequest {
    #[serde(default)]
    pub availability: Availability,
    #[serde(default)]
    pub order: OrderRequest,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub query_regexp: Option<String>,
    #[serde(default)]
    pub query_text: Option<String>,
}

impl BrowseRequest {
    fn compare_fn_dateoptions(
        main_a: Option<DateTime<Utc>>,
        main_b: Option<DateTime<Utc>>,
        backup_a: DateTime<Utc>,
        backup_b: DateTime<Utc>,
    ) -> Ordering {
        if !main_a.is_none() && !main_b.is_none() {
            main_a
                .unwrap()
                .timestamp_millis()
                .cmp(&main_b.unwrap().timestamp_millis())
        } else if main_a.is_none() && !main_b.is_none() {
            Ordering::Greater
        } else if main_b.is_none() && !main_a.is_none() {
            Ordering::Less
        } else {
            backup_a
                .timestamp_millis()
                .cmp(&backup_b.timestamp_millis())
        }
    }

    pub fn search_query(&self) -> String {
        let today = Utc::now();

        let mut query = {
            let mut query = QueryBuilder::<'_, Sqlite>::new("SELECT * FROM tasks ");
            if self.availability != Availability::All || self.tags.len() != 0 {
                query.push(" WHERE ");
            }
            match self.availability {
                Availability::Incomplete => {
                    query.push(" completed == 0 ");
                },
                Availability::Available => {
                    query.push(" completed == 0 AND (");
                    let mut separated = query.separated(" OR ");
                    separated.push("start == NULL");
                    separated.push("start < '");
                    separated.push_bind_unseparated(today);
                    separated.push_unseparated("') ");
                },
                Availability::Done => {
                    query.push(" completed == 1 ");
                },
                Availability::All => {
                    query.push(" TRUE ");
                }
            }
            for tag in self.tags.iter() {
                let tag_percent = format!("%{}%", tag);
                query.push(" AND tags LIKE ");
                query.push_bind(tag_percent);
            }
            query
        };
        let order_direction = if self.order.ascending { "ASC" } else { "DESC" };
        match self.order.order {
            OrderType::Captured => {
                query.push(" ORDER BY captured ");
                query.push(order_direction);
            },
            OrderType::Start => {
                query.push(" ORDER BY start ");
                query.push(order_direction);
                query.push(" , captured ");
                query.push(order_direction);
            },
            OrderType::Due => {
                query.push(" ORDER BY due ");
                query.push(order_direction);
                query.push(" , captured ");
                query.push(order_direction);
            },
            OrderType::Scheduled => {
                query.push(" ORDER BY schedule ");
                query.push(order_direction);
                query.push(" , captured ");
                query.push(order_direction);
            }
        }
        query.into_sql()
    }

    /// Query directly from the sqlite file
    pub async fn execute_sqlite(&self, pool: &SqlitePool) -> Result<Vec<TaskDescription>>{
        // Just get the sql query response
        let today = format!("{}", Utc::now().format("%+"));
        let query = self.search_query();
        // println!("query: {:?}", query);
        let mut query_as = sqlx::query_as(&query);
        if self.availability == Availability::Available {
            // println!("bound {:?}", today);
            query_as = query_as.bind(today);
        }
        for tag in self.tags.iter() {
            let tag_percent = format!("%{}%", tag);
            // println!("bound {:?}", tag_percent);
            query_as = query_as.bind(tag_percent);
        }
        let mut sql_filtered: Vec<TaskDescription> = query_as.fetch_all(pool).await?;

        // Do regex matching on app side
        match &self.query_regexp {
            Some(regexp) => {
                let regex = Regex::new(&regexp)?;
                sql_filtered.retain(|x| !regex.captures(&x.content).is_none());
            },
            None => {}
        }
        Ok(sql_filtered)
    }

    /// Use a BrowseRequest to filter a list of tasks (in-memory, used for tests)
    pub fn execute<'a>(&self, data: &'a [TaskDescription]) -> Result<Vec<&'a TaskDescription>> {
        let q = match &self.query_regexp {
            Some(x) => Some(Regex::new(&x)?),
            None => None,
        };
        let today = Utc::now();

        let mut filtered: Vec<_> = data
            .iter()
            .filter(|x| {
                self.tags
                    .iter()
                    .map(|y| x.tags.contains(y))
                    .fold(true, |acc, mk| acc && mk)
            })
            .filter(|x| match &q {
                Some(y) => !y.captures(&x.content).is_none(),
                None => true,
            })
            .filter(|x| match self.availability {
                Availability::Incomplete => !x.completed,
                Availability::Available => {
                    !x.completed && (x.start.is_none() || x.start.unwrap() < today)
                }
                Availability::Done => x.completed,
                Availability::All => true,
            })
            .collect();

        filtered.sort_by(|x, y| match self.order.order {
            OrderType::Captured => x
                .captured
                .timestamp_millis()
                .cmp(&y.captured.timestamp_millis()),
            OrderType::Start => {
                BrowseRequest::compare_fn_dateoptions(x.start, y.start, x.captured, y.captured)
            }
            OrderType::Due => {
                BrowseRequest::compare_fn_dateoptions(x.due, y.due, x.captured, y.captured)
            }
            OrderType::Scheduled => {
                BrowseRequest::compare_fn_dateoptions(x.schedule, y.schedule, x.captured, y.captured)
            }
        });

        if !self.order.ascending {
            filtered.reverse();
        }

        Ok(filtered)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Duration, TimeZone};

    fn make_task(content: &str, tags: Vec<&str>, completed: bool) -> TaskDescription {
        let mut task = TaskDescription::new(None);
        task.content = content.to_string();
        task.tags = sqlx::types::Json(tags.iter().map(|s| s.to_string()).collect());
        task.completed = completed;
        task
    }

    #[test]
    fn test_default_browse_request() {
        let req = BrowseRequest::default();
        assert_eq!(req.availability, Availability::Incomplete);
        assert!(req.tags.is_empty());
        assert!(req.query_regexp.is_none());
    }

    #[test]
    fn test_filter_incomplete() {
        let tasks = vec![
            make_task("task1", vec![], false),
            make_task("task2", vec![], true),
            make_task("task3", vec![], false),
        ];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 2);
        // Default order is Captured descending, so task3 (created last) comes first
        let contents: Vec<&str> = result.iter().map(|t| t.content.as_str()).collect();
        assert!(contents.contains(&"task1"));
        assert!(contents.contains(&"task3"));
    }

    #[test]
    fn test_filter_completed() {
        let tasks = vec![
            make_task("task1", vec![], false),
            make_task("task2", vec![], true),
        ];
        let req = BrowseRequest {
            availability: Availability::Done,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].content, "task2");
    }

    #[test]
    fn test_filter_all() {
        let tasks = vec![
            make_task("task1", vec![], false),
            make_task("task2", vec![], true),
        ];
        let req = BrowseRequest {
            availability: Availability::All,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_filter_by_tags() {
        let tasks = vec![
            make_task("task1", vec!["work", "urgent"], false),
            make_task("task2", vec!["personal"], false),
            make_task("task3", vec!["work"], false),
        ];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            tags: vec!["work".to_string()],
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 2);
        assert!(result.iter().all(|t| t.tags.contains(&"work".to_string())));
    }

    #[test]
    fn test_filter_by_multiple_tags() {
        let tasks = vec![
            make_task("task1", vec!["work", "urgent"], false),
            make_task("task2", vec!["work"], false),
        ];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            tags: vec!["work".to_string(), "urgent".to_string()],
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].content, "task1");
    }

    #[test]
    fn test_filter_by_regex() {
        let tasks = vec![
            make_task("fix bug #123", vec![], false),
            make_task("add feature", vec![], false),
            make_task("fix bug #456", vec![], false),
        ];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            query_regexp: Some("fix bug #\\d+".to_string()),
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 2);
    }

    #[test]
    fn test_order_by_captured_descending() {
        let mut task1 = make_task("first", vec![], false);
        task1.captured = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap();
        let mut task2 = make_task("second", vec![], false);
        task2.captured = Utc.with_ymd_and_hms(2025, 1, 2, 0, 0, 0).unwrap();

        let tasks = vec![task1, task2];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            order: OrderRequest {
                order: OrderType::Captured,
                ascending: false,
            },
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result[0].content, "second");
        assert_eq!(result[1].content, "first");
    }

    #[test]
    fn test_order_by_captured_ascending() {
        let mut task1 = make_task("first", vec![], false);
        task1.captured = Utc.with_ymd_and_hms(2025, 1, 1, 0, 0, 0).unwrap();
        let mut task2 = make_task("second", vec![], false);
        task2.captured = Utc.with_ymd_and_hms(2025, 1, 2, 0, 0, 0).unwrap();

        let tasks = vec![task1, task2];
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            order: OrderRequest {
                order: OrderType::Captured,
                ascending: true,
            },
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result[0].content, "first");
        assert_eq!(result[1].content, "second");
    }

    #[test]
    fn test_filter_available_excludes_future_start() {
        let mut task = make_task("future task", vec![], false);
        task.start = Some(Utc::now() + Duration::days(30));

        let tasks = vec![task];
        let req = BrowseRequest {
            availability: Availability::Available,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 0);
    }

    #[test]
    fn test_filter_available_includes_past_start() {
        let mut task = make_task("available task", vec![], false);
        task.start = Some(Utc::now() - Duration::days(1));

        let tasks = vec![task];
        let req = BrowseRequest {
            availability: Availability::Available,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_filter_available_includes_no_start() {
        let task = make_task("no start task", vec![], false);

        let tasks = vec![task];
        let req = BrowseRequest {
            availability: Availability::Available,
            ..Default::default()
        };
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 1);
    }

    #[test]
    fn test_search_query_generates_sql() {
        let req = BrowseRequest {
            availability: Availability::Incomplete,
            order: OrderRequest {
                order: OrderType::Due,
                ascending: true,
            },
            ..Default::default()
        };
        let sql = req.search_query();
        assert!(sql.contains("SELECT * FROM tasks"));
        assert!(sql.contains("completed == 0"));
        assert!(sql.contains("ORDER BY due"));
        assert!(sql.contains("ASC"));
    }

    #[test]
    fn test_search_query_with_tags() {
        let req = BrowseRequest {
            availability: Availability::All,
            tags: vec!["work".to_string()],
            ..Default::default()
        };
        let sql = req.search_query();
        assert!(sql.contains("tags LIKE"));
    }

    #[test]
    fn test_empty_filter_returns_all_incomplete() {
        let tasks = vec![
            make_task("a", vec![], false),
            make_task("b", vec![], false),
        ];
        let req = BrowseRequest::default();
        let result = req.execute(&tasks).unwrap();
        assert_eq!(result.len(), 2);
    }
}
