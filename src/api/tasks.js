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
            entries: await invoke('index', { query: state.tasks.query }),
            db: state.tasks.db.concat(results)
        }
    },
)

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
        }
        await invoke('upsert', { transaction: { Task: db[idx] }});
        return {
            entries: await invoke('index', { query: state.tasks.query }),
            db
        }
    },
)

const remove = createAsyncThunk(
    'tasks/remove',

    async (payload, { getState }) => {
        let state = getState();
        let db = state.tasks.db
            .filter(x => payload.id != x.id);
        await invoke('delete', { transaction: { Task: payload.id }});
        return {
            db,
            entries: await invoke('index', { query: state.tasks.query })
        }
    },
)

const query = createAsyncThunk(
    'tasks/query',

    async (query, thunkAPI) => {
        let entries = await invoke('index', { query });
        return {
            entries,
            query
        }
    },
)

// this is where the entire database is dumped
export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        entries: [],
        db: [],
        query: {},
        loading: true
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(edit.rejected, (state, { error }) => {
                console.error(error)
            })
            .addCase(remove.rejected, (state, { error }) => {
                console.error(error)
            })
            .addCase(query.rejected, (state, { error }) => {
                console.error(error)
            })
            .addCase(edit.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                }
            })
            .addCase(remove.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                }
            })
            .addCase(abtib.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                }
            })
            .addCase(query.pending, (state) => {
                return {
                    ...state,
                    loading: true
                }
            })
            .addCase(query.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    loading: false,
                    ...payload
                }
            })
            .addCase(snapshot.fulfilled, (state, { payload } ) => {
                return {
                    ...state,
                    db: payload.tasks
                }
            })
    },
});

export { abtib, query, edit, remove };
export default tasksSlice.reducer;

