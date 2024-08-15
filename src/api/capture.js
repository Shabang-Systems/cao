import { createSlice } from '@reduxjs/toolkit';

export const captureSlice = createSlice({
    name: "capture",
    initialState: {
        scratchpads: [""],
        current: 0,
        selection: null
    },
    reducers: {
        set: (state, { payload }) => {
            state.scratchpads[state.current] = payload;
        },
        view: (state, { payload }) => {
            if (payload < state.scratchpads.length && payload >= 0) { 
                return {
                    ...state,
                    current: payload
                }
            }
        },
        grow: (state) => {
            return {
                ...state,
                scratchpads: [...state.scratchpads, ""],
                current: state.scratchpads.length
            }
        },
        pop: (state) => {
            if (state.current > 0) {
                let scratch = state.scratchpads.toSpliced(state.current, 1);
                return {
                    ...state,
                    scratchpads: scratch,
                    current: state.current-1
                }
            }
        },
        select: (state, { payload: text }) => {
            return {
                ...state,
                selection: text
            }
        },
    }
});

export const {set, view, grow, pop, select} = captureSlice.actions;
export default captureSlice.reducer;

