import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { invoke } from '@tauri-apps/api/tauri'

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
            {
                id: "a6fee358-d6ee-46f0-8981-fc10e79162c9",
                capture: "5a874ef5-ebcd-4e87-8640-fcf9123482d4",
                content: "boom clap the sound of my heart",
                tags: ["nacc"],
                rrule: null,
                priority: 0, // [0, +∞)
                effort: 1, // hours
                start: null,
                due: null,
                schedule: null,
                captured: new Date().toString(),
                locked: false,
            },
            {
                id: "08a4d57a-884a-4d59-b6ce-acd7537c63fe",
                capture: "5a874ef5-ebcd-4e87-8640-fcf9123482d4",
                content: "the beat goes on and on",
                rrule: "FREQ=MONTHLY;BYMONTHDAY=17",
                tags: ["nacc"],
                priority: 0,
                effort: 4, // hours
                start: null,
                due: null,
                schedule: null,
                captured: new Date().toString(),
                locked: false,
            }
        ],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder.addCase(abtib.fulfilled, (state, action) => {
            return {
                ...state,
                entries: state.entries.concat(action.payload)
            }
        })
    },
});

export { abtib };
export default tasksSlice.reducer;

