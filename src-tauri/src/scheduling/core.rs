use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Gap {
    pub start: DateTime<Utc>,
    pub end: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Event {
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    #[serde(default)]
    pub name: String,
}

