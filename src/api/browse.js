import { createSlice } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

export const browseSlice = createSlice({
    name: "browse",
    initialState: {
        searches: [{}],
        current: 0,
    },
    reducers: {
        set: (state, { payload }) => {
            state.searches[state.current] = payload;
        },
        view: (state, { payload }) => {
            if (payload < state.searches.length && payload >= 0) { 
                return {
                    ...state,
                    current: payload
                }
            }
        },
        grow: (state) => {
            return {
                ...state,
                searches: [...state.searches, {}],
                current: state.searches.length
            }
        },
        pop: (state) => {
            if (state.current > 0) {
                let scratch = state.searches.toSpliced(state.current, 1);
                return {
                    ...state,
                    searches: scratch,
                    current: state.current-1
                }
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(snapshot.fulfilled, (state, { payload } ) => {
                return {
                    ...state,
                    searches: payload.searches
                }
            })
            .addMatcher(
                (action) => (action.type.startsWith("browse") &&
                             ["grow", "pop", "set"].includes(action.type.split("/")[1])),
                (state, action) => {
                    invoke('upsert', { transaction: { Search: state.searches }});
                }
            )
    },
});

export const { set, view, grow, pop } = browseSlice.actions;
export default browseSlice.reducer;

