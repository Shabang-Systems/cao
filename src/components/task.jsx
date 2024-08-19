import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import Editor from '@components/editor.jsx';

import { edit } from "@api/tasks.js";

import "./task.css";

export default function Task( { task } ) {
    let dispatch = useDispatch();

    return (
        <div className="task">
            <div className="task-cm">
                <Editor
                    value={task.content}
                    onChange={(x) =>
                        dispatch(edit({id: task.id, content: x}))
                    }
                />
            </div>
        </div>
    );
}

