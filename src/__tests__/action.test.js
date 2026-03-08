import { describe, it, expect, vi } from 'vitest';
import actionReducer from '../api/action.js';

describe('action reducer', () => {
    const initialState = {
        entries: [],
        dueSoon: [],
        workslots: [],
    };

    it('should return initial state', () => {
        const state = actionReducer(undefined, { type: 'unknown' });
        expect(state).toEqual(initialState);
    });

    it('should not mutate state on unknown action', () => {
        const state = actionReducer(initialState, { type: 'foo/bar' });
        expect(state).toEqual(initialState);
    });
});
