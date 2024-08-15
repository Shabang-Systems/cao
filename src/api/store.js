import { configureStore } from '@reduxjs/toolkit'
import capture from "./capture.js";

export default configureStore({
    reducer: {
        capture
    },
})
