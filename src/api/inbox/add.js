import { createSlice } from '@reduxjs/toolkit';

export const addSlice = createSlice({
    name: "add",
    initialState: {
        // raw unedited capture result
        captured: [],
        // pending tasks waiting to be siphoned
        pending: [],
        // whether we are in the middle of a capture
        inCapture: false,
    },
    reducers: {
        capture: (state, { payload }) => {
            return {
                captured: payload,
                inCapture: true
            }
        },
        finish: (state) => {
            return {
                inCapture: false,
                pending: state.pending.concat(state.captured),
                captured: []
            }
        }
    }
});

export const { capture, finish } = addSlice.actions;
export default addSlice.reducer;

