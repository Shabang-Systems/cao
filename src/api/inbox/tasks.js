import { createSlice } from '@reduxjs/toolkit';

// this is where the entire database is dumped
export const tasksSlice = createSlice({
    name: "tasks",
    initialState: {
        tasks: [],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase("inbox/add/finish", (state, action) => {
                console.log(state);
            })
    }
});

export const { } = tasksSlice.actions;
export default tasksSlice.reducer;

