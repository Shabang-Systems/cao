import { invoke } from '@tauri-apps/api/core';
import { createAsyncThunk } from '@reduxjs/toolkit';

const snapshot = createAsyncThunk(
    'snapshot',

    async (_, thunkAPI) => {
        return await invoke('snapshot');
    },
)

export { snapshot } ;

