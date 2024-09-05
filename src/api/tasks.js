import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from "@reduxjs/toolkit";
import { invoke } from '@tauri-apps/api/tauri';

import { snapshot } from "@api/utils.js";

// each of the thunks will do their usual job, and
// also recompute the current query to update the current view
// (if applicable); this could be entually smartert to only
// recompute entries when its reasonably in scope
const abtib = createAsyncThunk(
    'tasks/abtib',

    async (tasks, { getState }) => {
        let state = getState();
        let results = await invoke('parse_tasks', { captured: tasks });
        await Promise.all(results.map(async (i) =>
            await invoke('upsert', { transaction: { Task: i }})));

        return {
            db: state.tasks.db.concat(results)
        };
    },
);

// each of the thunks will do their usual job, and
// also recompute the current query to update the current view
// (if applicable); this could be entually smartert to only
// recompute entries when its reasonably in scope
const insert = createAsyncThunk(
    'tasks/insert',

    async (task, { getState }) => {
        let res = await invoke('insert', { task });
        
        return res;
    },
);

const edit = createAsyncThunk(
    'tasks/edit',

    async (payload, { getState }) => {
        let state = getState();
        let db = [...state.tasks.db];
        let idx = db
            .map((x,i) => [x,i])
            .filter(x => payload.id == x[0].id)[0][1];
        db[idx] = {
            ...db[idx],
            ...payload
        };
        await invoke('upsert', { transaction: { Task: db[idx] }});
        return {
            db
        };
    },
);

const remove = createAsyncThunk(
    'tasks/remove',

    async (payload, { getState }) => {
        let state = getState();
        let db = state.tasks.db
            .filter(x => payload.id != x.id);
        await invoke('delete', { transaction: { Task: payload.id }});
        return {
            db,
        };
    },
);

// this is where the entire database is dumped
export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        db: [],
        loading: true
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(edit.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(remove.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(abtib.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(insert.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(edit.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch({type: "global/reindex"});
                return {
                    ...state,
                    ...payload
                };
            })
            .addCase(remove.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch({type: "global/reindex"});
                return {
                    ...state,
                    ...payload
                };
            })
            .addCase(abtib.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch({type: "global/reindex"});
                return {
                    ...state,
                    ...payload
                };
            })
            .addCase(insert.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch({type: "global/reindex"});
                return {
                    ...state,
                    db: state.db.concat([payload])
                };
            })
            .addCase(snapshot.fulfilled, (state, { payload } ) => {
                return {
                    ...state,
                    db: payload.tasks
                };
            });
    },
});

export { abtib, edit, remove, insert };
export default tasksSlice.reducer;

