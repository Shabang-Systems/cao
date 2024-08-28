import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Editor from '@components/editor.jsx';
import { edit, remove } from "@api/tasks.js";
import "./task.css";

import strings from "@strings";
import moment from "moment";

import { animated, useSpring } from '@react-spring/web';

import { useOutsideAlerter } from "./utils.js";

import TagBar from "@components/tagbar.jsx";

export default function Task( { task } ) {
    let dispatch = useDispatch();
    let [hasFocus, setHasFocus] = useState(false);
    const DEBUG = false;

    const springs = useSpring({
        height: hasFocus ? 30 : 0,
        opacity: hasFocus ? 1 : 0,
        paddingTop: hasFocus ? 10 : 0,
        marginBottom: hasFocus ? 3 : 0,
        from: { height: 0, opacity:0, paddingTop: 0, marginBottom: 0 },
        config: { mass: 1, friction: 35, tension: 300 }
    });

    const wrapperRef = useRef(null);
    useOutsideAlerter(wrapperRef, () => setHasFocus(false));


    return (
        <div className="task" ref={wrapperRef}>
            <div className="task-cm">
                <Editor
                    value={task.content}
                    onFocusChange={(x) => { if (x && !hasFocus) setHasFocus(true); }}
                    onChange={(x) =>
                        dispatch(edit({id: task.id, content: x}))
                    }
                />
                <animated.div className={"task-actions"} style={{...springs}}>
                    <div className="task-action" data-tooltip-id={hasFocus? "rootp" : "notp"}  data-tooltip-content={strings.TOOLTIPS.COMPLETE} data-tooltip-place={"bottom"}>
                        <i className="task-action fa-solid fa-check" style={{transform: "translateY(0.5px)"}} />
                    </div>
                    <div className="task-action" data-tooltip-id={hasFocus? "rootp" : "notp"}  data-tooltip-content={strings.TOOLTIPS.SCHEDULED} data-tooltip-place={"bottom"}>
                        {task.schedule ? moment.utc(task.schedule).fromNow() : strings.COMPONENTS__TASK__TAP_TO_SCHEDULE}
                    </div>
                    <div className="task-divider-outer"><div className="task-divider-inner">&nbsp;</div></div>
                    <div className="flex">
                        <div className="task-action"  data-tooltip-id={hasFocus? "rootp" : "notp"}  data-tooltip-content={strings.TOOLTIPS.START} data-tooltip-place={"bottom"}>
                            {"no start date"}
                        </div>
                        <div className="task-action nohover cursor-default">
                            <i className="fa-solid fa-arrow-right-long" style={{padding: "0 3px", transform: "translateY(0.7px)"}}/>
                        </div>
                        <div className="task-action" data-tooltip-id={hasFocus? "rootp" : "notp"}  data-tooltip-content={strings.TOOLTIPS.DUE} data-tooltip-place={"bottom"}>
                            {"no due date"}
                        </div>
                    </div>
                    <div className="task-divider-outer"><div className="task-divider-inner">&nbsp;</div></div>
                    <div className="flex-grow">
                        <div className="task-tag-bar task-action nohover cursor-default w-full">
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
                    <div className="task-action right" data-tooltip-id={hasFocus? "rootp" : "notp"} data-tooltip-content={strings.TOOLTIPS.DELETE} data-tooltip-place={"bottom"} onClick={() => dispatch(remove({id: task.id}))}>
                        <i className="task-action fa-solid fa-trash" />
                    </div>
                </animated.div>
            </div>
        </div>
    );
}

