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

import { setHorizon as sh, now } from "@api/ui.js";

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
    const today = useSelector(now);

    const [tasksMode, setTasksMode] = useState(true);
    const nextDays = [...Array(horizon).keys()].concat([-1]);
    const [selection, setSelection] = useState(0);

    const free = useRef(strings.VIEWS__ACTION_FREE[
        Math.floor(Math.random() *
                   strings.VIEWS__ACTION_FREE.length)]);

    const selectionDate = new Date(today.getFullYear(),
                                   today.getMonth(),
                                   (today.getDate()+selection), 0,0,0);
    
    const allDayEvents = useSelector(createSelector(
        [(state) => state.events.entries],
        (res) => {
            let tmp = res.filter(x => {
                let d = new Date(x.start);
                return (d.getFullYear() == selectionDate.getFullYear() &&
                        d.getMonth() == selectionDate.getMonth() &&
                        d.getDate() == selectionDate.getDate() &&
                        x.is_all_day
                    );
            }).map (x => x.name);
            return tmp;
        }
    ));

    const workslots = useSelector(createSelector(
        [(state) => state.action.workslots],
        (res) => {
            return res.length == horizon+1 ? res : [...Array(horizon+1).keys()].map(_ => []);
        }
    ));

    const {dueSoonDays, workHours, blockSize} = useContext(ConfigContext);

    const [hours, setHours] = useState([...Array(horizon+1).keys()].map(_ => workHours));
    useEffect(() => {
        setHours(workslots.map(x => x.map(y => y.duration).reduce((x,y)=>x+y, 0)).map(x => workHours-x/60));
    }, [workslots]);

    const dispatch = useDispatch();
    const setHorizon = useCallback((i) => {
        setSelection(0);
        dispatch(sh(i));
    });
    const dueSoon = useSelector(createSelector(
        [(state) => state.action.dueSoon],
        (res) => {
            return res.length == horizon+1 ? res : [...Array(horizon+1).keys()].map(_ => []);
        }
    ));
    const entries = useSelector(createSelector(
        [(state) => state.action.entries],
        (res) => {
            return res.length == horizon+1 ? res : [...Array(horizon+1).keys()].map(_ => []);
        }
    ));


    const display = entries[selection].concat((selection < horizon && !tasksMode) ? workslots[selection] : []).sort((a,b) => {
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
        dispatch(compute());
        dispatch(getEvents());

        let ca = setInterval(() => {
            dispatch(getEvents());
        }, 5000);

        return () => {
            clearInterval(ca);
        };
    }, []);

    const events_str = (() => {
        if (allDayEvents.length == 0 || tasksMode) return ""; 
        if (allDayEvents.length == 1) return ". " + strings.VIEWS__ACTION_TODAY_IS + " " + allDayEvents[0];
        if (allDayEvents.length > 1)  return ". " + strings.VIEWS__ACTION_TODAY_IS + " " + allDayEvents.slice(0, -1).join(", ") + " and " + allDayEvents[allDayEvents.length-1];
        return "";
    })();
    
    return (
        <div>
            <div className="action-main">
                <div className="greeting">
                    <div className="greeting-head">{getGreeting(today)},</div>
                    {(selection == 0) ?
                     <div className="greeting-subhead">{strings.VIEWS__ACTION}{moment(today).format(strings.DATETIME_FORMAT_LONG)}{events_str}</div>:
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
                             style={{height: x.duration*1.5}}>
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
                            let hl;
                            if (hours[i] > 0) {
                                hl = ((entries[i].map(x => x.effort).reduce((a,b) => a+b, 0)+
                                       dueSoon[i].map(x => x.effort).reduce((a,b) => a+b, 0))*blockSize)/hours[i];
                            } else {
                                hl = 1;
                            }

                            return (
                                <div
                                    data-tooltip-id={i < horizon ? "rootp" : "nootp"}
                                    data-tooltip-content={moment(today).add(x, "days").format(strings.DATE_FORMAT_SHORT)}

                                    key={x}
                                    className={"action-datelabel " + (
                                        i == selection ? "active" : ""
                                    ) + (
                                        i != horizon && dueSoon[i].length > 0 ? " ds" : ""
                                    )}
                                    onClick={() => setSelection(i)}
                                >
                                    <div style={{textAlign: "right", maxWidth: "50px",
                                                 direction: "rtl", marginRight: 15, transform:"translateY(-5px)"}}>
                                        {(i < horizon) ?
                                         <div className="bar-outer"><div  className="bar-inner"
                                                                         style={{maxHeight: `${hl*20}px`}}></div></div>
                                         :<></>}
                                        <span className="action-left">{x >= 0 ? strings.DAYS_OF_WEEK_SHORT[(x+today.getDay())%7] : "Future"}</span>
                                        <span className="action-right">{(entries[i].length+dueSoon[i].length)}</span>

                                    </div>
                                </div>
                            );
                        })
                    }
                </ul> 
                <div className="horizon-switch">
                    <div className={"button"+((!tasksMode) ? " disabled" : "")} onClick={() => {
                        setTasksMode(true);
                    }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.TASKS_MODE}>
                        <i className="fa-solid fa-list-check"></i>
                    </div>
                    <div
                        className={"button"+(tasksMode ? " disabled" : "")} onClick={() => {
                            setTasksMode(false);
                    }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.CALENDAR_MODE}>
                        <i className="fa-regular fa-calendar"></i>
                    </div>

                </div>

            </div>
            <br />
        </div>
    );
}

