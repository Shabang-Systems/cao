import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

import moment from "moment";
import { tick } from './ui';

const compute = createAsyncThunk(
    'action/dispatch',

    async (_, { getState }) => {
        let state = getState();
        let tasks = state.tasks.db;
        let horizon = state.ui.horizon;
        let today = new Date(state.ui.clock);
        let dueSoonDays = state.ui.dueSoonDays;

        let filtered = tasks.filter(x => {
            if (!x.due) return false;
            if (x.completed) return false;
            if (new Date(x.start) > today) return false;
            return true;
        });

        let dueSoon = [...Array(horizon+1).keys()].map(sel => {
            return filtered.filter(x => {
                let sd = new Date(today.getFullYear(),
                                  today.getMonth(),
                                  (today.getDate()+sel), 0,0,0);

                if (sel == 0) {
                    return (moment(x.due) <= 
                            new Date(today.getFullYear(),
                                     today.getMonth(),
                                     (today.getDate()+dueSoonDays), today.getHours(),today.getMinutes(),today.getSeconds()));
                } else if (sel < horizon) {

                    if (x.schedule) return false;
                    // otherwise its not due soon but due "on"
                    let due = new Date(x.due);
                    return (due.getFullYear() == sd.getFullYear() &&
                            due.getMonth() == sd.getMonth() &&
                            due.getDate() == sd.getDate());
                } else {
                    if (x.schedule) return false;
                    return (moment(x.due) >= sd);
                }
            }).sort((a,b) => new Date(a.due).getTime() -
                    new Date(b.due).getTime());
        });

        const dueSoonIDs = dueSoon[0].map(x => x.id);
        let entries = await invoke(
            'index', { query: {
                availability: "Available",
                order: {
                    order: "Scheduled",
                    ascending: true
                }
            }});

        filtered = entries.filter(x => {
            if (!x.schedule) return false;
            if (dueSoonIDs.includes(x.id)) return false;
            return true;
        });

        let finalEntries = [...Array(horizon+1).keys()].map(sel => {
            return filtered.filter(x => {
                if (sel == 0) {
                    return (moment(x.schedule) <
                            new Date(today.getFullYear(),
                                     today.getMonth(),
                                     (today.getDate())+1, 0,0,0));

                } else if (sel < horizon) {
                    return (moment(x.schedule) >=
                            new Date(today.getFullYear(),
                                     today.getMonth(),
                                     (today.getDate()+sel), 0,0,0)) &&
                        (moment(x.schedule) <
                         new Date(today.getFullYear(),
                                  today.getMonth(),
                                  (today.getDate()+sel)+1, 0,0,0));
                } else {
                    return (moment(x.schedule) >=
                            new Date(today.getFullYear(),
                                     today.getMonth(),
                                     (today.getDate()+horizon), 0,0,0));
                }
            }).map((x) => ({...x, type: "task"}));
        });

        return {
            entries: finalEntries,
            dueSoon
        }
    },
);

export const actionSlice = createSlice({
    name: "action",
    initialState: {
        entries: [],
        dueSoon: [],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(compute.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(tick, (state, { payload, asyncDispatch }) => {
                asyncDispatch(compute());
            })
            .addCase(compute.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                };
            })
            .addMatcher(
                (action) => (action.type == "global/reindex"),
                (state, action) => {
                    action.asyncDispatch(compute());
                }
            );
    },
});

export const { } = actionSlice.actions;
export { compute };
export default actionSlice.reducer;

