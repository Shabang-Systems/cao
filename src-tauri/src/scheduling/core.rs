use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Gap {
    pub start: DateTime<Utc>,
    pub end: Option<DateTime<Utc>>,
}


