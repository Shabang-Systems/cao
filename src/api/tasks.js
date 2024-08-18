import { createSlice } from '@reduxjs/toolkit';

// this is where the entire database is dumped
export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        entries: [],
    },
    reducers: {
        abtib: (state, { payload }) => {
            console.log(payload);
        },
    },
});

export const { abtib } = tasksSlice.actions;
export default tasksSlice.reducer;

