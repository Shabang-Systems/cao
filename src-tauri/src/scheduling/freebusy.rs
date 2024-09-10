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

use rrule::{RRuleError, RRuleSet, Tz as RTz};
use super::zone_mapping::ZONE_MAPPINGS;


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
                let tz: Tz = match tzid.parse().ok() {
                    Some(n) => n,
                    None => localzone::win_zone_to_iana(&tzid, None).unwrap().parse().unwrap()
                };
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
                if let Some(start @ DatePerhapsTime::DateTime(_)) = e.get_start() {
                    if let Some(end @ DatePerhapsTime::DateTime(_)) = e.get_end() {
                        let stringified = e.try_into_string().unwrap();
                        let split = stringified.split("\n");
                        let filtered = split.filter(|&x| x.split([';', ':'])
                                                    .next().map_or(false, |x|
                                                                   x == "EXDATE" ||
                                                                   x == "RRULE" ||
                                                                   x == "EXRULE" ||
                                                                   x == "DTSTART"))
                            .map(|x| x.trim())
                            .collect::<Vec<_>>();
                        
                        let mut filtered_string = filtered.join("\n").to_string();
                        ZONE_MAPPINGS.iter().for_each(|x| {
                            filtered_string = filtered_string.replace(x.windows, x.iana[0]);
                        });

                        let rrule:Result<RRuleSet, RRuleError> = filtered_string.parse();

                        let start_res = resolve_date_perhaps(start);
                        let end_res = resolve_date_perhaps(end);
                        let duration = start_res - end_res;

                        match rrule.ok() {
                            Some(x) => {
                                let now = Utc::now().naive_utc();
                                let cast = RTz::UTC.from_local_datetime(&now).unwrap();
                                x.after(cast).all(100).dates.iter().for_each(|d| {
                                    let true_start = d;
                                    let true_end = d.checked_sub_signed(duration).unwrap();
                                    events.push(Event {
                                        start: true_start.to_utc(),
                                        end: true_end.to_utc(),
                                        name: e.get_summary().unwrap_or("").to_string()
                                    })
                                });
                            },
                            None => events.push(Event {
                                start: start_res,
                                end: end_res,
                                name: e.get_summary().unwrap_or("").to_string()
                            })
                        };
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

