import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from "@reduxjs/toolkit";
import { invoke } from '@tauri-apps/api/tauri';

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
            invoke('upsert', { transaction: { Task: state.entries[idx] }});
        },
        remove: (state, { payload }) => {
            let entries = state.entries
                .filter(x => payload.id != x.id);
            invoke('delete', { transaction: { Task: payload.id }});

            return {
                ...state,
                entries
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(abtib.fulfilled, (state, { payload }) => {
                payload.forEach((i) => invoke('upsert', { transaction: { Task: i }}));
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
export const { edit, remove } = tasksSlice.actions;
export default tasksSlice.reducer;

