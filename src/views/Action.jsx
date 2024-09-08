import { useCallback, useContext, useEffect, useRef, useState } from "react";
import "./Action.css";
import "./Capture.css";
import { ConfigContext } from "../contexts.js";

import { compute } from "@api/action.js";
import { insert } from "@api/tasks.js";
import { getEvents } from "@api/events.js";

import moment from "moment";
import { createSelector } from '@reduxjs/toolkit';

import strings from "@strings";
import { useDispatch, useSelector } from "react-redux";
import "../components/task.css";

import Task from "@components/task.jsx";

import { setHorizon as sh } from "@api/store.js";

function getGreeting(time) {
    if (time.getHours() < 12) {
        return strings.TEMPORAL_GREETINGS[0];
    } else if (time.getHours() < 19) {
        return strings.TEMPORAL_GREETINGS[1];
    } else  {
        return strings.TEMPORAL_GREETINGS[2];
    }
}

export default function Action({}) {
    const horizon = useSelector((state) => state.ui.horizon);

    const [today, setToday] = useState(new Date());
    const nextDays = [...Array(horizon).keys()].concat([-1]);
    const [selection, setSelection] = useState(0);

    const free = useRef(strings.VIEWS__ACTION_FREE[
        Math.floor(Math.random() *
                   strings.VIEWS__ACTION_FREE.length)]);

    const selectionDate = new Date(today.getFullYear(),
                                   today.getMonth(),
                                   (today.getDate()+selection), 0,0,0);

    const workslots = useSelector(createSelector(
        [(state) => state.events.entries],
        (res) => {
            return res.filter(x => {
                let d = new Date(x.start);
                return (d.getFullYear() == selectionDate.getFullYear() &&
                        d.getMonth() == selectionDate.getMonth() &&
                        d.getDate() == selectionDate.getDate());
            }).map (x => {
                let start = moment(x.start);
                let end = moment(x.end);
                return {
                    start,
                    end,
                    duration: end.diff(start, "minutes", true),
                    type: "event",
                    name: x.name,
                    // to make the .key prop happy
                    id: Math.random()
                };
            });
        }
    ));

    const dueSoonDays = useContext(ConfigContext).dueSoonDays;

    const dispatch = useDispatch();
    const setHorizon = useCallback((i) => {
        setSelection(0);
        dispatch(sh(i));
    });
    const dueSoon = useSelector(createSelector(
        [(state) => state.tasks.db],
        (res) => {
            let filtered = res.filter(x => {
                if (!x.due) return false;
                if (x.completed) return false;
                if (new Date(x.start) > today) return false;
                return true;
            });

            return [...Array(horizon+1).keys()].map(sel => {
                return filtered.filter(x => {
                    let sd = new Date(today.getFullYear(),
                                      today.getMonth(),
                                      (today.getDate()+sel), 0,0,0);

                    if (sel == 0) {
                        return (moment(x.due) <= 
                                new Date(today.getFullYear(),
                                         today.getMonth(),
                                         (today.getDate()+dueSoonDays), 0,0,0));
                    } else if (sel < horizon) {

                        if (x.schedule) return false;
                        // otherwise its not due soon but due "on"
                        let due = new Date(x.due);
                        return (due.getFullYear() == sd.getFullYear() &&
                                due.getMonth() == sd.getMonth() &&
                                due.getDate() == sd.getDate());
                    } else {
                        if (x.schedule) return false;
                        return (moment(x.due) >= sd);
                    }
                }).sort((a,b) => new Date(a.due).getTime() -
                        new Date(b.due).getTime());
            });
        }));
    const dueSoonIDs = dueSoon[0].map(x => x.id);
    const entries = useSelector(createSelector(
        [(state) => state.action.entries],
        (res) => {
            let filtered = res.filter(x => {
                if (!x.schedule) return false;
                if (dueSoonIDs.includes(x.id)) return false;
                return true;
            });
            return [...Array(horizon+1).keys()].map(sel => {
                return filtered.filter(x => {
                    if (sel == 0) {
                        return (moment(x.schedule) <
                             new Date(today.getFullYear(),
                                      today.getMonth(),
                                      (today.getDate())+1, 0,0,0));

                    } else if (sel < horizon) {
                        return (moment(x.schedule) >=
                                new Date(today.getFullYear(),
                                         today.getMonth(),
                                         (today.getDate()+sel), 0,0,0)) &&
                            (moment(x.schedule) <
                             new Date(today.getFullYear(),
                                      today.getMonth(),
                                      (today.getDate()+sel)+1, 0,0,0));
                    } else {
                        return (moment(x.schedule) >=
                                new Date(today.getFullYear(),
                                         today.getMonth(),
                                         (today.getDate()+horizon), 0,0,0));
                    }
                }).map((x) => ({...x, type: "task"}));
            });
        },
        {devModeChecks: {identityFunctionCheck: 'never'}}
    ));


    const display = entries[selection].concat(workslots).sort((a,b) => {
        let aTime = null;
        let bTime = null;

        if (a.type == "task") {
            aTime = new Date(a.schedule).getTime();
        } else {
            aTime = new Date(a.start).getTime();
        }

        if (b.type == "task") {
            bTime = new Date(b.schedule).getTime();
        } else {
            bTime = new Date(b.start).getTime();
        }

        return aTime-bTime;
    });


    let [justAbtibd, setJustAbtibd] = useState(false);
    useEffect(() => {
        let ci = setInterval(() => {
            setToday(new Date());
        }, 5000);
        dispatch(compute());

        let ca = setInterval(() => {
            dispatch(getEvents());
        }, 2500);

        return () => {
            clearInterval(ci);
            clearInterval(ca);
        };
    }, []);
    
    return (
        <div>
            <div className="action-main">
                <div className="greeting">
                    <div className="greeting-head">{getGreeting(today)},</div>
                    {(selection == 0) ?
                     <div className="greeting-subhead">{strings.VIEWS__ACTION}{moment(today).format(strings.DATETIME_FORMAT_LONG)}</div>:
                     <div className="subgreeting">{strings.VIEWS__ACTION_YOUR_SCHEDULE}{selection < horizon ? moment(selectionDate).format(strings.DATE_FORMAT_LONG): strings.VIEWS__ACTION_THE_FUTURE}</div>}
                </div>
                <div style={{marginRight: "60px", marginLeft: "-6px", marginTop: "20px"}}>
                    <div className="due-soon-box"
                         style={{display: (dueSoon[selection].length > 0) ? "block" : "none"}}>
                        <div className={"due-soon-header top"+(selection !=0 ? " ds" : "")} style={{paddingTop: 0}}>{(selection == 0) ? strings.VIEWS__DUE_SOON:strings.VIEWS__DUE_ON_DATE }</div>
                        {
                            (dueSoon[selection].length > 0) ? dueSoon[selection].map((x, indx) => (
                                <div key={x.id} className="task-holder">
                                    <Task
                                        task={x}
                                    />
                                    {/* <div style={{paddingBottom: "10px"}}></div> */}
                                </div>
                            )): <></>
                        }
                        <div className="due-soon-header">{strings.VIEWS__SCHEDULED}</div>
                    </div>
                    {(display.length > 0) ? display.map((x, indx) => (
                        x.type == "task" ?
                        <div key={x.id} className="task-holder">
                            <Task
                                task={x}
                                initialFocus={justAbtibd && (x.id == entries[selection][entries[selection].length-1].id)}
                                onFocusChange={(x) => {if (!x) setJustAbtibd(false);}}
                            />
                            {/* <div style={{paddingBottom: "2px"}}></div> */}
                        </div>:
                        <div key={x.id} className="calendar-entry"
                             style={{height: x.duration}}>
                            <div className="calendar-time top">{moment(x.start).format(strings.TIME_FORMAT)} - {moment(x.end).format(strings.TIME_FORMAT)}</div>
                            <div className="calendar-description">{x.name}</div>
                        </div>
                    )): <div className="free-day">
                                                   {free.current}
                                               </div>}
                </div>
                <div className="action-abtib" onClick={() => { 
                    if (display.length > 0) {
                        dispatch(insert({schedule:
                                         display[display.length-1].type == "task" ?
                                         new Date(entries[selection][entries[selection].length-1].schedule).getTime() : new Date(display[display.length-1].end).getTime(),
                                         content: ""}));
                    } else {
                        dispatch(insert({schedule: selectionDate.getTime(),
                                         content: ""}));

                    }
                    setJustAbtibd(true);
                }}>
                    <i className="fa-solid fa-plus" />
                </div>
                

            </div>


            <div className="absolute captureid-outer" style={{top: "10px", right: "-4px",
                                                              zIndex: 20000,
                                                              paddingTop: 20, paddingRight: 5}}>
                <div className="mb-3">
                    <div className="button" onClick={() => {
                        setSelection((selection != 0) ? selection - 1 : 0);
                    }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.PREVIOUS_DAY} data-tooltip-place="left">
                        <i className="fa-solid fa-chevron-up"></i>
                    </div>
                    <div className="button" onClick={() => {
                        setSelection((selection != horizon) ? selection + 1 : horizon);
                    }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.NEXT_DAY} data-tooltip-place="left">
                        <i className="fa-solid fa-chevron-down"></i>
                    </div>


                </div>
                <ul className="captureid-wrapper cursor-pointer">
                    {
                        nextDays.map((x, i) => {
                            return (
                                <div
                                    data-tooltip-id={i < horizon ? "rootp" : "nootp"}
                                    data-tooltip-content={moment(today).add(x, "days").format(strings.DATE_FORMAT_SHORT)}

                                    key={x}
                                    className={"action-datelabel " + (
                                        i == selection ? "active" : ""
                                    ) + (
                                        dueSoon[i].length > 0 ? " ds" : ""
                                    )}
                                    onClick={() => setSelection(i)}
                                >
                                    <div style={{textAlign: "right", maxWidth: "20px", direction: "rtl"}}>
                                        <span className="action-left">{x >= 0 ? strings.DAYS_OF_WEEK_SHORT[(x+today.getDay())%7] : "Future"}</span>
                                        <span className="action-right">{entries[i].length+dueSoon[i].length}</span>

                                    </div>
                                </div>
                            );
                        })
                    }
                </ul> 
                <div className="horizon-switch">
                    <div className="button" onClick={() => {
                        setHorizon(horizon <= 1 ? 1 : horizon -1);
                    }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.DECREASE_HORIZON}>
                        <i className="fa-solid fa-minus"></i>
                    </div>
                    <div
                        className="button" onClick={() => {
                        setHorizon(horizon+1);
                    }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.INCREASE_HORIZON}>
                        <i className="fa-solid fa-plus"></i>
                    </div>

                </div>

            </div>
        </div>
    );
}

