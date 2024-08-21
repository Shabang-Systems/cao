import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from "@reduxjs/toolkit";
import { invoke } from '@tauri-apps/api/tauri'

import { snapshot } from "@api/utils.js";

const abtib = createAsyncThunk(
    'tasks/abtib',

    async (tasks, thunkAPI) => {
        return await invoke('parse_tasks', { captured: tasks });
    },
)


// this is where the entire database is dumped
export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        entries: [
        ],
    },
    reducers: {
        edit: (state, { payload }) => {
            let idx = state.entries
                .map((x,i) => [x,i])
                .filter(x => payload.id == x[0].id)[0][1];
            state.entries[idx] = {
                ...state.entries[idx],
                ...payload
            }
            invoke('upsert', { task: state.entries[idx] });
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(abtib.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    entries: state.entries.concat(payload)
                }
            })
            .addCase(snapshot.fulfilled, (state, { payload } ) => {
                return {
                    ...state,
                    entries: payload.tasks
                }
            })
    },
});

let allIncompleteTasksSelector = createSelector(
    [(state) => state.tasks.entries],
    (res) => {
        res = res.filter((x) => !x.completed);
        res.sort((a,b) => new Date(b.captured).getTime() -
                 new Date(a.captured).getTime());
        return res;
    }
);

export { abtib, allIncompleteTasksSelector };
export const { edit } = tasksSlice.actions;
export default tasksSlice.reducer;

