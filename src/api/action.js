import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

import moment from "moment";
import { tick } from './ui';
import { getEvents } from "./events.js";

const workslots = createAsyncThunk(
    'action/events',

    async (_, { getState }) => {
        let state = getState();
        let tasks = state.tasks.db;
        let horizon = state.ui.horizon;
        let today = new Date(state.ui.clock);
        let dueSoonDays = state.ui.dueSoonDays;

        let workslots = [...Array(horizon+1).keys()].map(sel => {
            let selectionDate = new Date(today.getFullYear(),
                                         today.getMonth(),
                                         (today.getDate()+sel), 0,0,0);

            let tmp = state.events.entries.filter(x => {
                let d = new Date(x.start);
                return (d.getFullYear() == selectionDate.getFullYear() &&
                        d.getMonth() == selectionDate.getMonth() &&
                        d.getDate() == selectionDate.getDate() &&
                        !x.is_all_day
                       );
            }).map (x => {
                let start = moment(x.start);
                let end = moment(x.end);
                return {
                    start,
                    end,
                    duration: end.diff(start, "minutes", true),
                    type: "event",
                    name: x.name,
                    // to make the .key prop happy
                    id: Math.random()
                };
            });
            let seen = {};
            return tmp.filter(x => {
                if (seen[x.start+x.end+x.name]) {
                    return false;
                } else {
                    seen[x.start+x.end+x.name] = true;
                    return true;
                }
            });
        });


        return { workslots };
    });


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
        workslots: [],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(workslots.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(compute.rejected, (state, { error }) => {
                console.error(error);
            })
            .addCase(tick, (state, { payload, asyncDispatch }) => {
                asyncDispatch(compute());
            })
            .addCase(workslots.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                };
            })
            .addCase(compute.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    ...payload
                };
            })
            .addCase(getEvents.fulfilled, (state, { asyncDispatch, payload }) => {
                asyncDispatch(workslots());
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
export { compute, workslots };
export default actionSlice.reducer;

