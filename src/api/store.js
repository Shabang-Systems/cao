import { configureStore, combineReducers } from '@reduxjs/toolkit'

import capture from "./capture.js";
import tasks from "./tasks.js";

export default configureStore({
    reducer: {
        capture,
        tasks
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
})
