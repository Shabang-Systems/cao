import { useSelector, useDispatch } from 'react-redux';
import { allIncompleteTasksSelector } from '@api/tasks.js';

import Task from "@components/task.jsx";

import "./Browser.css";

export default function Browser() {
    let entries = useSelector(allIncompleteTasksSelector);

    return (
        <div className="m-12">
            <div className="capture-cm">
                <input className="capture-cm-box" placeholder="you can filter by tags @likeso" autoCorrect="off" />
            </div>

            {entries.map((x) => (
                <div key={x.id}>
                    <Task task={x}/>
                    <div className="task-divider focused cursor-default"><div className="task-divider-line"></div></div>
                </div>
            ))}
        </div>
    );
}
