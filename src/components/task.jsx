import { useState, useRef, useEffect, useContext, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Editor from '@components/editor.jsx';
import { edit, remove } from "@api/tasks.js";
import "./task.css";

import { useDetectClickOutside } from 'react-detect-click-outside';
import { ConfigContext } from "../contexts.js";

import strings from "@strings";
import moment from "moment";

import { animated, useSpring } from '@react-spring/web';

import { useOutsideClick } from "./utils.js";

import TagBar from "@components/tagbar.jsx";

import DateModal from "@components/datemodal.jsx";

export default function Task( { task, initialFocus, onFocusChange } ) {
    let dispatch = useDispatch();
    let [hasFocus, setHasFocus] = useState(initialFocus);


    const springs = useSpring({
        maxHeight: hasFocus ? 80 : 0,
        opacity: hasFocus ? 1 : 0,
        paddingTop: hasFocus ? 10 : 0,
        marginBottom: hasFocus ? 5 : 0,
        pointerEvents: hasFocus ? "initial": "none",
        from: { maxHeight: 0, opacity:0, paddingTop: 0, marginBottom: 0, pointerEvents: "initial" },
        config: { mass: 1, friction: 35, tension: 300 }
    });

    const cm = useRef(null);
    const focus = useRef(hasFocus);

    const wrapperRef = useDetectClickOutside({ onTriggered: () => {
        if (hasFocus) {
            setHasFocus(false);
        }
    }});

    useEffect(() => {
        if (typeof onFocusChange == "function") onFocusChange(hasFocus);
    }, [hasFocus]);

    const dueRef = useRef(null);
    const [dueOpen, setDueOpen] = useState(false);
    useEffect(() => {
        if (dueRef.current) {
            dueRef.current.setOpen(dueOpen);
        }
    }, [dueOpen]);
    const deferRef = useRef(null);
    const [deferOpen, setDeferOpen] = useState(false);
    useEffect(() => {
        if (deferRef.current) {
            deferRef.current.setOpen(deferOpen);
        }
    }, [deferOpen]);
    const scheduleRef = useRef(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);
    useEffect(() => {
        if (scheduleRef.current) {
            scheduleRef.current.setOpen(scheduleOpen);
        }
    }, [scheduleOpen]);

    const [today, setToday] = useState(new Date());

    useEffect(() => {
        let ci = setInterval(() => {
            setToday(new Date());
        }, 5000);

        return () => clearInterval(ci);
    }, []);

    const dueSoonDays = useContext(ConfigContext).dueSoonDays;
    let dueSoon =  (moment(task.due) <= 
                    new Date(today.getFullYear(),
                             today.getMonth(),
                             (today.getDate()+dueSoonDays), today.getHours(),today.getMinutes(),today.getSeconds()));
    let overdue =  (moment(task.due) <= today);

    const deffered = (task.start && new Date(task.start) > today);

    return (
        <div className="task group" ref={wrapperRef}>
            <DateModal
                initialDate={task.schedule ? new Date(task.schedule) : null}
                onDate={(d) => {
                    dispatch(edit({id: task.id,
                                   locked: d?true:false, // how to actually cast to bool?
                                   schedule: d?d.getTime():null}));
                }}
                onClose={() => setScheduleOpen(false)}
                ref={scheduleRef} />
            <DateModal
                initialDate={task.due ? new Date(task.due) : null}
                onDate={(d) => {
                    dispatch(edit({id: task.id, due: d?d.getTime():null}));
                }}
                onClose={() => setDueOpen(false)}
                ref={dueRef} />
            <DateModal
                initialDate={task.start ? new Date(task.start) : null}
                // this slices away the Z for timezone, because the backend expends a *NO TIMEZONE*
                onDate={(d) => {
                    dispatch(edit({id: task.id, start: d?d.getTime():null}));
                }}
                onClose={() => setDeferOpen(false)}
                ref={deferRef} />

            <div className={`task-action cursor-pointer floating-task-action ${hasFocus ? "opacity-1" : "opacity-0" } group-hover:opacity-100 transition-opacity` }
                 style={{cursor: "pointer !important", zIndex: 100000}}
                    onClick={() => {
                        // TODO completing tasks is a bit of a thing so
                        // TODO supporting repeating tasks, etc.
                        dispatch(edit({id: task.id, completed: !task.completed}));
                        setHasFocus(false);
                    }}
            >
                <i className={task.completed ? "task-action fa-solid fa-circle-check" : "task-action fa-solid fa-check" } style={{transform: "translateY(-4px)"}} />
            </div>

            <div className="h-full w-[25px] absolute translate-x-[-25px] opacity-0 pointer-events-none"> </div>

            
            <div className={"task-cm"+(task.start && deffered ? " deferred" : "")+(task.completed ? " completed" : "")+(dueSoon && !overdue ? " due-soon" : "")+(overdue ? " overdue" : "")}>
                <Editor
                    strike={task.completed}
                    ref={cm}
                    value={task.content}
                    onFocusChange={(x) => { if (x && !hasFocus) setHasFocus(true); }}
                    onChange={(x) =>
                        dispatch(edit({id: task.id, content: x}))
                    }
                    focus={initialFocus}
                />

                <animated.div className={"task-actions"} style={{...springs}}>
                    <div className={"task-action pr-5" + (scheduleOpen ? " accent": "")}
                         onClick={() => setScheduleOpen(true)}
                         data-tooltip-id={hasFocus? "rootp" : "notp"}
                         data-tooltip-content={task.schedule ? moment.utc(task.schedule).format(strings.DATETIME_FORMAT) :
                                               strings.TOOLTIPS.SCHEDULED}
                         data-tooltip-place={"bottom"}>
                        {task.schedule ?
                         moment.utc(task.schedule).fromNow() : strings.COMPONENTS__TASK__TAP_TO_SCHEDULE}
                    </div>
                    {/* <div className="task-divider-outer"></div> */}
                    <div className="flex pr-5">
                        <div className={"task-action" + (deferOpen ? " accent": "")}
                             onClick={() => setDeferOpen(true)}
                             data-tooltip-id={hasFocus? "rootp" : "notp"}
                             data-tooltip-content={task.start ? moment.utc(task.start).fromNow() :
                                                   strings.TOOLTIPS.START}
                             data-tooltip-place={"bottom"}>
                            {task.start ?
                             moment(task.start).format(strings.DATETIME_FORMAT) :
                             strings.COMPONENTS__TASK__NO_START_DATE}
                        </div>
                        <div className="task-action nohover cursor-default">
                            <i className="fa-solid fa-arrow-right-long" style={{padding: "0 3px", transform: "translateY(0.7px)"}}/>
                        </div>
                        <div className={"task-action" + (dueOpen ? " accent": "")}
                             onClick={() => setDueOpen(true)}
                             data-tooltip-id={hasFocus? "rootp" : "notp"}
                             data-tooltip-content={task.due ? moment.utc(task.due).fromNow() :
                                                   strings.TOOLTIPS.DUE}
                             data-tooltip-place={"bottom"}>
                            {task.due ?
                             moment(task.due).format(strings.DATETIME_FORMAT) :
                             strings.COMPONENTS__TASK__NO_DUE_DATE}
                        </div>
                    </div>
                    {/* <div className="task-divider-outer"></div>  */}
                    <div className="flex-grow">
                        <div
                            style={{paddingTop: "2px", transform: "translateY(0.5px)"}}
                            className="task-tag-bar task-action nohover cursor-default w-full">
                            <i className="fa-solid fa-tag"
                                style={{
                                    paddingRight: "5px",
                                    transform: "translateY(1.5px)"
                                }}
                            / >
                            <TagBar
                                defaultValue={task.tags}
                                onNewTags={(t) => {
                                    dispatch(edit({id: task.id, tags: t}));
                                }}
                            />
                        </div> 
                    </div>
                    <div className="task-action right" data-tooltip-id={hasFocus? "rootp" : "notp"} data-tooltip-content={strings.TOOLTIPS.DELETE} data-tooltip-place={"bottom"} onClick={() => {
                        dispatch(remove({id: task.id}));
                    }}>
                        <i className="task-action fa-solid fa-trash" />
                    </div>
                </animated.div>
            </div>
        </div>
    );
}

