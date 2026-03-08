import { configureStore, combineReducers, createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/core';

import { createSelector } from '@reduxjs/toolkit';

const setHorizon = createAsyncThunk(
    'ui/setHorizon',

    async (horizon, { getState }) => {
        let res = await invoke('upsert', { transaction: {Horizon: horizon } });

        return horizon;
    },
);

const now = createSelector(
    [(state) => {
        return state.ui.clock;
    }],
    (res) => {
        return new Date(res)
    }
);


// a basic UI reducer to manage global loading
const ui = createSlice({
    name: "ui",
    initialState: {
        ready: false,
        horizon: 8,
        dueSoonDays: 1,
        clock: (new Date()).getTime(),
        tasksMode: true
    },
    reducers: {
        tick: (state, {payload}) => {
            return {
                ...state,
                clock: (new Date()).getTime(),
                dueSoonDays: payload
            }
        },
        setTasksMode: (state, {payload}) => {
            return {
                ...state,
                tasksMode: payload
            }
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(setHorizon.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    horizon: payload
                };
            })
            .addCase(snapshot.rejected, (state, {error}) => {
                return {
                    ...state,
                    ready: error
                };
            })
            .addCase(snapshot.fulfilled, (state, {payload}) => {
                return {
                    ...state,
                    ready: true,
                    horizon: payload.horizon
                };
            });
    },
});

export { setHorizon, now };
export const { tick, setTasksMode } = ui.actions;
export default ui.reducer;
