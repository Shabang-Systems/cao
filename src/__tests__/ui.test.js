import { describe, it, expect, vi } from 'vitest';
import uiReducer, { tick, setTasksMode } from '../api/ui.js';

describe('ui reducer', () => {
    const initialState = {
        ready: false,
        horizon: 8,
        dueSoonDays: 1,
        clock: 0,
        tasksMode: true,
    };

    it('should return initial state', () => {
        const state = uiReducer(undefined, { type: 'unknown' });
        expect(state.ready).toBe(false);
        expect(state.horizon).toBe(8);
        expect(state.tasksMode).toBe(true);
    });

    it('should handle tick', () => {
        const before = Date.now();
        const state = uiReducer(initialState, tick(2));
        expect(state.dueSoonDays).toBe(2);
        expect(state.clock).toBeGreaterThanOrEqual(before);
    });

    it('should handle setTasksMode', () => {
        const state = uiReducer(initialState, setTasksMode(false));
        expect(state.tasksMode).toBe(false);
    });

    it('should toggle tasksMode', () => {
        const state1 = uiReducer(initialState, setTasksMode(false));
        expect(state1.tasksMode).toBe(false);
        const state2 = uiReducer(state1, setTasksMode(true));
        expect(state2.tasksMode).toBe(true);
    });

    it('should preserve other state on tick', () => {
        const state = uiReducer({ ...initialState, horizon: 5 }, tick(3));
        expect(state.horizon).toBe(5);
        expect(state.dueSoonDays).toBe(3);
    });
});
