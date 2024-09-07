//! Read Freebusy Information
use super::core::Gap;
use std::{cmp::Ordering, str::FromStr};
use chrono::{DateTime, FixedOffset, Local, TimeZone, Utc};
use icalendar::{Calendar, CalendarComponent, CalendarDateTime,
                Component, DatePerhapsTime};
use reqwest;

use anyhow::{Result, anyhow};
use futures::future::join_all;


async fn load_ical_file(calendar: &str) -> Result<Calendar> {
    let resp = reqwest::get(calendar).await?.text().await?;
    let cal = match resp.parse::<Calendar>() {
        Ok(x) => Ok(x),
        Err(_) => Err(anyhow!("calendar parse error"))
    }?;

    Ok(cal)
}

fn resolve_date_perhaps(dpt: DatePerhapsTime) -> DateTime<Utc> {
    match dpt {
        DatePerhapsTime::Date(d) => {
            d.and_hms_opt(0,0,0).unwrap().and_local_timezone(Local).unwrap().to_utc()
        },
        DatePerhapsTime::DateTime(dt) => match dt {
            CalendarDateTime::Floating(cdt) => cdt.and_utc(),
            CalendarDateTime::Utc(cdt) => cdt,
            CalendarDateTime::WithTimezone { date_time, tzid } => {
                Utc.from_utc_datetime(
                    &FixedOffset::from_str(&tzid).unwrap()
                        .from_local_datetime(&date_time).unwrap().naive_utc()
                )
            }
        }
    }
}

/// temporary, non published freebusy event calculation scratch object
#[derive(Clone, Debug, Default)]
struct FBEvent {
    start: DateTime<Utc>,
    end: DateTime<Utc>,
}

/// given a list of calendars, find possible gaps between 
async fn find_availability(calendars: &[&str]) -> Result<Vec<Gap>> {
    // download all the calendars
    let cals = join_all(
        calendars
            .iter()
            .map(|x| async { load_ical_file(x).await })
    ).await.into_iter().collect::<Result<Vec<Calendar>>>()?;

    // read and coallese events
    let mut events: Vec<FBEvent> = vec![];
    cals.into_iter().for_each(|x| {
        x.components.into_iter().for_each(|y| {
            if let CalendarComponent::Event(e) = y {
                if let Some(start) = e.get_start() {
                    if let Some(end) = e.get_end() {
                        events.push(FBEvent {
                            start: resolve_date_perhaps(start),
                            end: resolve_date_perhaps(end)
                        });
                    }
                }
            }
        })
    });

    // we sort in reverse to be able to pop off the end of the stack
    events.sort_by(|a,b| b.start.cmp(&a.start));

    // we keep checking gaps and pushing them if the end of the
    // last event don't overlap with the start of the current one
    let mut res = vec![];
    let mut last = events.pop().unwrap();
    events.drain(..).for_each(|current: FBEvent| {
        if last.end.cmp(&current.start) == Ordering::Greater {
            res.push(Gap {
                start: current.end,
                end: Some(last.start)
            });
        }
        last = current;
    });
    res.reverse();

    // we finally create a gap that ends in never
    // i.e. gap forever into the future
    let last = match res.last() {
        Some(x) => x.end.unwrap(),
        None => Utc::now()
    };

    res.push(Gap { start: last, end: None } );

    Ok(res)
}

