import { useSelector, useDispatch } from 'react-redux';
import { allIncompleteTasksSelector } from '@api/tasks.js';

import { abtib } from "@api/tasks.js";

import Task from "@components/task.jsx";

import "./Browser.css";
import { useState } from 'react';

export default function Browser() {
    let entries = useSelector(allIncompleteTasksSelector);
    const dispatch = useDispatch();

    // if we just abtib'd, we should set the initial focus of
    // the first element as True because we want it to open extended
    let [justAbtibd, setJustAbtibd] = useState(false);

    return (
        <div className="m-12">
            <div className="capture-cm">
                <input className="capture-cm-box" placeholder="you can filter by tags @likeso" autoCorrect="off" />
            </div>

            <div>
                <div className="task-divider" onClick={() => {
                    setJustAbtibd(true);
                    dispatch(abtib([""]));
                }}><div className="task-divider-line"></div></div>
                {entries.map((x, indx) => (
                    <div key={x.id}>
                        <Task
                            task={x}
                            initialFocus={justAbtibd && indx == 0}
                            onFocusChange={(x) => {if (!x) setJustAbtibd(false);}}
                        />
                        <div className="task-divider focused cursor-default"><div className="task-divider-line"></div></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
