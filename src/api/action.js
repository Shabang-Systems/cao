import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { snapshot } from "@api/utils.js";
import { invoke } from '@tauri-apps/api/tauri';

const compute = createAsyncThunk(
    'action/dispatch',

    async (thunkAPI) => {
        return await invoke(
            'index', { query: {
                availability: "Available",
                order: {
                    order: "Scheduled",
                    ascending: true
                }
            }});
    },
);

export const actionSlice = createSlice({
    name: "action",
    initialState: {
        entries: [],
    },
    reducers: {
    },
    extraReducers: (builder) => {
        builder
            .addCase(compute.fulfilled, (state, { payload }) => {
                return {
                    ...state,
                    entries: payload
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

