import { createSlice } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

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
                };
            } else return state;
        },
        grow: (state) => {
            return {
                ...state,
                scratchpads: [...state.scratchpads, ""],
                current: state.scratchpads.length
            };
        },
        pop: (state) => {
            if (state.current > 0) {
                let scratch = state.scratchpads.toSpliced(state.current, 1);
                return {
                    ...state,
                    scratchpads: scratch,
                    current: state.current-1
                };
            } else return state;
        },
        select: (state, { payload: text }) => {
            return {
                ...state,
                selection: text
            };
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(snapshot.fulfilled, (state, { payload } ) => {
                return {
                    ...state,
                    scratchpads: payload.scratchpads
                };
            })
            .addMatcher(
                (action) => (action.type.startsWith("capture") &&
                             ["grow", "pop", "set"].includes(action.type.split("/")[1])),
                (state, action) => {
                    invoke('upsert', { transaction: { Board: state.scratchpads }});
                }
            );
    },
});

export const {set, view, grow, pop, select} = captureSlice.actions;
export default captureSlice.reducer;

