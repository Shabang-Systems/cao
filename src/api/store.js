import { configureStore, combineReducers, createSlice } from '@reduxjs/toolkit'

import capture from "./capture.js";
import tasks from "./tasks.js";

import { snapshot } from "@api/utils.js";

// a basic UI reducer to manage global loading
const ui = createSlice({
    name: "ui",
    initialState: {
        ready: false
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(snapshot.pending, (state) => {
                return {
                    ready: false
                }
            })
            .addCase(snapshot.rejected, (state, {error}) => {
                return {
                    ready: error
                }
            })
            .addCase(snapshot.fulfilled, (state, {payload}) => {
                return {
                    ready: true
                }
            })
    },
});

export default configureStore({
    reducer: {
        capture,
        tasks,
        ui: ui.reducer 
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware()
})

