import { createSlice } from '@reduxjs/toolkit';

export const captureSlice = createSlice({
    name: "capture",
    initialState: {
        scratchpads: [""],
        selection: null
    },
    reducers: {
        set: (state, { payload: { idx, text } }) => {
            state.scratchpads[idx] = text;
        },
        grow: (state) => {
            state.scratchpads.push("")
        },
        pop: (state, { payload: { idx } }) => {
            state.scratchpads = state.scratchpads.splice(idx, 1);
        },
        select: (state, { payload: text }) => {
            return {
                scratchpads: state.scratchpads,
                selection: text
            }
        },
    }
});

export const {set, grow, pop, select} = captureSlice.actions;
export default captureSlice.reducer;

