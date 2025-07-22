import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from "@reduxjs/toolkit";
import { invoke } from '@tauri-apps/api/tauri';

import { snapshot } from "@api/utils.js";
import * as chrono from 'chrono-node';

// each of the thunks will do their usual job, and
// also recompute the current query to update the current view
// (if applicable); this could be entually smartert to only
// recompute entries when its reasonably in scope
const abtib = createAsyncThunk(
    'tasks/abtib',

    async (tasks, { getState }) => {
        let times = tasks.map((x) => {
            let parsed = chrono.parse(x)[0];
            if (parsed) {
                return {
                    start: (parsed.start && parsed.end) ? parsed.start.date().getTime() : null,
                    end: parsed.end ? parsed.end.date().getTime() : (
                        (parsed.start) ? parsed.start.date().getTime() : null)
                };
            } else {
                return {start: null, end: null};
            }
            
        });
        let state = getState();
        let results = await invoke('parse_tasks', {
            captured: tasks,
            dates: times
        });
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

const complete = createAsyncThunk(
    'tasks/complete',

    async (payload, { getState }) => {
        let state = getState();
        let db = state.tasks.db
            .filter(x => payload.id != x.id);
        let r = await invoke('complete', { id: payload.id });
        db.push(r);
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
            .addCase(complete.rejected, (state, { error }) => {
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
            .addCase(complete.fulfilled, (state, { payload, asyncDispatch }) => {
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

export { abtib, edit, remove, insert, complete };
export default tasksSlice.reducer;

