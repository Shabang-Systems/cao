import { configureStore, combineReducers } from '@reduxjs/toolkit'

import capture from "./capture.js";
import tasks from "../../../../../.saves/!Users!houjun!Documents!Projects!cao!src!api!tasks.js~";

export default configureStore({
    reducer: {
        capture,
        tasks
    },
})
