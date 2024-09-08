//! Read Freebusy Information
use super::core::{Gap, Event};
use std::{cmp::Ordering};
use chrono::{Local, DateTime, TimeZone, Utc};
use icalendar::{Calendar, CalendarComponent, CalendarDateTime,
                Component, DatePerhapsTime};
use reqwest;

use anyhow::{Result, anyhow};
use futures::future::join_all;
use chrono_tz::Tz;


#[allow(dead_code)]
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
                // TODO this is WRONG but I didn't know how to parse timezones
                let tz: Tz = tzid.parse().unwrap();
                Utc.from_utc_datetime(
                    &tz.from_local_datetime(&date_time).unwrap().naive_utc()
                )
            }
        }
    }
}

/// given a list of calendars, find possible gaps between 
#[allow(dead_code)]
pub async fn find_events(calendars: &[String]) -> Result<Vec<Event>> {
    // download all the calendars
    let cals = join_all(
        calendars
            .iter()
            .map(|x| async { load_ical_file(x).await })
    ).await.into_iter().collect::<Result<Vec<Calendar>>>()?;

    // read and coallese events
    let mut events: Vec<Event> = vec![];
    cals.into_iter().for_each(|x| {
        x.components.into_iter().for_each(|y| {
            if let CalendarComponent::Event(e) = y {
                if let Some(start) = e.get_start() {
                    if let Some(end) = e.get_end() {
                        events.push(Event {
                            start: resolve_date_perhaps(start),
                            end: resolve_date_perhaps(end),
                            name: e.get_summary().unwrap_or("").to_string()
                        });
                    }
                }
            }
        })
    });

    // we sort in reverse to be able to pop off the end of the stack
    events.sort_by(|a,b| a.start.cmp(&b.start));

    Ok(events)
}

/// given a list of calendars, find possible gaps between 
#[allow(dead_code)]
pub async fn find_availability(calendars: &[String]) -> Result<Vec<Gap>> {
    // download all the events
    let mut events = find_events(calendars).await?;
    events.reverse();

    // we keep checking gaps and pushing them if the end of the
    // last event don't overlap with the start of the current one
    let mut res = vec![];
    let mut last = events.pop().ok_or(anyhow!("empty calendar!"))?;
    events.drain(..).for_each(|current: Event| {
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

