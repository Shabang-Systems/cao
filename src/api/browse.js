import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

import { edit, remove, abtib } from "@api/tasks.js";

const query = createAsyncThunk(
    'browse/query',

    async (query, thunkAPI) => {
        let entries = await invoke('index', { query });
        // console.log(entries);
        return entries;
    },
);

// I'm sorry but I don't know how to get around an unwrapped proxy
const unroll = (x) => JSON.parse(JSON.stringify(x));

export const browseSlice = createSlice({
    name: "browse",
    initialState: {
        searches: [{}],
        entries: [],
        current: 0,
    },
    reducers: {
        set: (state, { payload, asyncDispatch }) => {
            state.searches[state.current] = payload;
            asyncDispatch(query(payload));
        },
        view: (state, { payload, asyncDispatch }) => {
            if (payload < state.searches.length && payload >= 0) { 
                return {
                    ...state,
                    current: payload
                };
            } else return {...state};
        },
        grow: (state, { asyncDispatch }) => {
            asyncDispatch(query({}));

            return {
                ...state,
                searches: [...state.searches, {}],
                current: state.searches.length
            };
        },
        pop: (state, { asyncDispatch }) => {
            if (state.current > 0) {
                asyncDispatch(query(unroll(state.searches[state.current-1])));

                let scratch = state.searches.toSpliced(state.current, 1);
                return {
                    ...state,
                    searches: scratch,
                    current: state.current-1
                };
            } else return { ...state };
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(query.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    entries: payload
                };
            })
            .addCase(query.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(snapshot.fulfilled, (state, { payload, asyncDispatch } ) => {
                asyncDispatch(query(unroll(payload.searches[state.current])));
                return {
                    ...state,
                    searches: payload.searches
                };
            })
            .addCase(edit.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch(query(unroll(state.searches[state.current])));
            })
            .addCase(abtib.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch(query(unroll(state.searches[state.current])));
            })
            .addCase(remove.fulfilled, (state, { payload, asyncDispatch }) => {
                asyncDispatch(query(unroll(state.searches[state.current])));
            })
            .addMatcher(
                (action) => {
                    return (action.type.startsWith("browse") &&
                            ["grow", "pop", "set"].includes(action.type.split("/")[1]));
                },
                (state, action) => {
                    invoke('upsert', { transaction: { Search: state.searches }});
                }
            );
    },
});

export const { set, view, grow, pop } = browseSlice.actions;
export default browseSlice.reducer;

