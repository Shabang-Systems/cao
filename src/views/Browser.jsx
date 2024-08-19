import { useSelector, useDispatch } from 'react-redux';
import { allIncompleteTasksSelector } from '@api/tasks.js';

import Task from "@components/task.jsx";

export default function Browser() {
    let entries = useSelector(allIncompleteTasksSelector);

    return (
        <div className="m-12">
            {entries.map((x) => (
                <Task key={x.id} task={x}/>
            ))}
        </div>
    );
}
