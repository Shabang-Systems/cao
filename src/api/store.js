import { configureStore, combineReducers } from '@reduxjs/toolkit'

import capture from "./capture.js";
import add from "./inbox/add.js";
import tasks from "./inbox/tasks.js";

export default configureStore({
    reducer: {
        capture,
        inbox: combineReducers({
            add,
            tasks
        })
    },
})
