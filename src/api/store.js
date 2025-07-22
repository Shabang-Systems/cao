import { configureStore, combineReducers, createSlice, createAsyncThunk } from '@reduxjs/toolkit';

import capture from "./capture.js";
import tasks from "./tasks.js";
import browse from "./browse.js";
import action from "./action.js";
import events from "./events.js";
import ui from "./ui.js";

import { invoke } from '@tauri-apps/api/tauri';

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

export default configureStore({
    reducer: {
        capture,
        tasks,
        ui,
        browse,
        action,
        events
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({serializableCheck: false}).concat([asyncDispatchMiddleware])
});

