import { useContext, useEffect, useRef, useState } from "react";
import "./Action.css";
import "./Capture.css";
import { ConfigContext } from "../contexts.js";

import { compute } from "@api/action.js";
import { insert } from "@api/tasks.js";

import moment from "moment";
import { createSelector } from '@reduxjs/toolkit';

import strings from "@strings";
import { useDispatch, useSelector } from "react-redux";
import "../components/task.css";

import Task from "@components/task.jsx";

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
    const [today, setToday] = useState(new Date());
    const nextDays = [...Array(8).keys()].concat([-1]);
    const [selection, setSelection] = useState(0);

    const free = useRef(strings.VIEWS__ACTION_FREE[
        Math.floor(Math.random() *
                   strings.VIEWS__ACTION_FREE.length)]);

    const selectionDate = new Date(today.getFullYear(),
                                   today.getMonth(),
                                   (today.getDate()+selection), 0,0,0);
    const dueSoonDays = useContext(ConfigContext).dueSoonDays;

    const dispatch = useDispatch();
    const dueSoon = useSelector(createSelector(
        [(state) => state.tasks.db],
        (res) => res.filter(x => {
            if (!x.due) return false;
            if (x.completed) return false;
            if (new Date(x.start) > today) return false;
            
            if (selection == 0) {
                return (moment(x.due) <= 
                        new Date(today.getFullYear(),
                                 today.getMonth(),
                                 (today.getDate()+dueSoonDays), 0,0,0));
            } else if (selection < 8) {
                if (x.schedule) return false;
                // otherwise its not due soon but due "on"
                let due = new Date(x.due);
                return (due.getFullYear() == selectionDate.getFullYear() &&
                        due.getMonth() == selectionDate.getMonth() &&
                        due.getDate() == selectionDate.getDate());
            } else {
                if (x.schedule) return false;
                return (moment(x.due) >= selectionDate);
            }
        }).sort((a,b) => new Date(a.due).getTime() - new Date(b.due).getTime()))
    );
    const dueSoonIDs = dueSoon.map(x => x.id);
    const entries = useSelector(createSelector(
        [(state) => state.action.entries],
        (res) => {
            let filtered = res.filter(x => {
                if (!x.schedule) return false;
                if (dueSoonIDs.includes(x.id)) return false;
                return true;
            });
            return [...Array(9).keys()].map(sel => {
                return filtered.filter(x => {
                    if (sel <= 8) {
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
                                         (today.getDate()+8), 0,0,0));
                    }
                });
            });
        },
        {devModeChecks: {identityFunctionCheck: 'never'}}
    ));
    let [justAbtibd, setJustAbtibd] = useState(false);
    useEffect(() => {
        let ci = setInterval(() => {
            setToday(new Date());
        }, 5000);
        dispatch(compute());

        return () => clearInterval(ci);
    }, []);
    
    return (
        <div>
            <div className="action-main">
                <div className="greeting">
                    <div className="greeting-head">{getGreeting(today)},</div>
                    {(selection == 0) ?
                     <div className="greeting-subhead">{strings.VIEWS__ACTION}{moment(today).format(strings.DATETIME_FORMAT_LONG)}</div>:
                     <div className="subgreeting">{strings.VIEWS__ACTION_YOUR_SCHEDULE}{selection < 8 ? moment(selectionDate).format(strings.DATE_FORMAT_LONG): strings.VIEWS__ACTION_THE_FUTURE}</div>}
                </div>
                <div style={{marginRight: "60px", marginLeft: "-6px", marginTop: "20px"}}>
                    <div className="due-soon-box"
                         style={{display: (dueSoon.length > 0) ? "block" : "none"}}>
        <div className="due-soon-header" style={{paddingTop: 0}}>{(selection == 0) ? strings.VIEWS__DUE_SOON:strings.VIEWS__DUE_ON_DATE }</div>
                        {
                            (dueSoon.length > 0) ? dueSoon.map((x, indx) => (
                                <div key={x.id}>
                                    <Task
                                        task={x}
                                    />
                                    <div style={{paddingBottom: "15px"}}></div>
                                </div>
                            )): <></>
                        }
                        <div className="due-soon-header">{strings.VIEWS__SCHEDULED}</div>
                    </div>
                    {(entries[selection].length > 0) ? entries[selection].map((x, indx) => (
                        <div key={x.id}>
                            <Task
                                task={x}
                                initialFocus={justAbtibd && indx == entries[selection].length-1}
                                onFocusChange={(x) => {if (!x) setJustAbtibd(false);}}
                            />
                            <div style={{paddingBottom: "15px"}}></div>
                        </div>
                    )): <div className="free-day">
                                                   {free.current}
                                               </div>}
                </div>
                <div className="action-abtib" onClick={() => { 
                    if (entries[selection].length > 0) {
                        dispatch(insert({schedule:new Date(entries[selection][entries[selection].length-1].schedule).getTime(),
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


            <div className="absolute captureid-outer" style={{top: "10px", right: "10px",
                                                              zIndex: 20000,
                                                              paddingTop: 20, paddingRight: 5}}>
                <div className="mb-3">
                    <div className="button" onClick={() => {
                        setSelection((selection != 0) ? selection - 1 : 0);
                    }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.PREVIOUS_DAY} data-tooltip-place="left">
                        <i className="fa-solid fa-chevron-up"></i>
                    </div>
                    <div className="button" onClick={() => {
                        setSelection((selection != 8) ? selection + 1 : 8);
                    }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.NEXT_DAY} data-tooltip-place="left">
                        <i className="fa-solid fa-chevron-down"></i>
                    </div>


                </div>
                <ul className="captureid-wrapper cursor-pointer">
                    {
                        nextDays.map((x, i) => {
                            return (
                                <div
                                    key={x}
                                    className={"action-datelabel " + (
                                        i == selection ? "active" : ""
                                    )}
                                    onClick={() => setSelection(i)}
                                >
                                    <div style={{textAlign: "right", maxWidth: "20px", direction: "rtl"}}>
                                        <span className="action-left">{x >= 0 ? strings.DAYS_OF_WEEK_SHORT[(x+today.getDay())%7] : "Future"}</span>
                                        <span className="action-right">{entries[i].length}</span>

                                    </div>
                                </div>
                            );
                        })
                    }
                </ul> 

            </div>
        </div>
    );
}

