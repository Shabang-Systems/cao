import { configureStore, combineReducers, createSlice } from '@reduxjs/toolkit';

import capture from "./capture.js";
import tasks from "./tasks.js";
import browse from "./browse.js";
import action from "./action.js";

import { snapshot } from "@api/utils.js";

// This middleware will just add the property "async dispatch" to all actions
// https://stackoverflow.com/questions/36730793/can-i-dispatch-an-action-in-reducer
const asyncDispatchMiddleware = store => next => action => {
    let syncActivityFinished = false;
    let actionQueue = [];

    function flushQueue() {
        actionQueue.forEach(a => store.dispatch(a)); // flush queue
        actionQueue = [];
    }

    function asyncDispatch(asyncAction) {
        actionQueue = actionQueue.concat([asyncAction]);

        if (syncActivityFinished) {
            flushQueue();
        }
    }

    const actionWithAsyncDispatch =
          Object.assign({}, action, { asyncDispatch });

    const res = next(actionWithAsyncDispatch);

    syncActivityFinished = true;
    flushQueue();

    return res;
};

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
                };
            })
            .addCase(snapshot.rejected, (state, {error}) => {
                return {
                    ready: error
                };
            })
            .addCase(snapshot.fulfilled, (state, {payload}) => {
                return {
                    ready: true
                };
            });
    },
});

export default configureStore({
    reducer: {
        capture,
        tasks,
        ui: ui.reducer,
        browse,
        action
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat([asyncDispatchMiddleware])
});

