import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

const getEvents = createAsyncThunk(
    'events/get',

    async (thunkAPI) => {
        return await invoke('events', {});
    },
);
const setCalendars = createAsyncThunk(
    'events/set',

    async (payload, thunkAPI) => {
        await invoke('upsert', { transaction: { Calendars:  payload.map(x => x.trim()).filter(x => x!="") }});
        return payload;
    },
);

export const eventsSlice = createSlice({
    name: "events",
    initialState: {
        entries: [],
        calendars: [],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(setCalendars.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    calendars: payload
                };
            })
            .addCase(getEvents.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    entries: payload
                };
            })
            .addCase(snapshot.fulfilled, (state, { payload, asyncDispatch } ) => {
                asyncDispatch({ type: "events/set" });
                return {
                    ...state,
                    entries: payload.work_slots,
                    calendars: payload.calendars
                };
            });
    },
});

export const { } = eventsSlice.actions;
export { getEvents, setCalendars };
export default eventsSlice.reducer;

