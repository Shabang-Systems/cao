import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initReindex, debouncedReindex } from '../api/reindex.js';

describe('debouncedReindex', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should not dispatch if store is not initialized', () => {
        // No store init, should not throw
        debouncedReindex();
    });

    it('should dispatch global/reindex after delay', () => {
        const dispatch = vi.fn();
        initReindex({ dispatch });

        debouncedReindex(100);

        // Should not have dispatched yet
        expect(dispatch).not.toHaveBeenCalled();

        // Fast forward
        vi.advanceTimersByTime(100);
        expect(dispatch).toHaveBeenCalledWith({ type: 'global/reindex' });
    });

    it('should debounce multiple calls', () => {
        const dispatch = vi.fn();
        initReindex({ dispatch });

        debouncedReindex(100);
        debouncedReindex(100);
        debouncedReindex(100);

        vi.advanceTimersByTime(100);
        expect(dispatch).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on each call', () => {
        const dispatch = vi.fn();
        initReindex({ dispatch });

        debouncedReindex(100);
        vi.advanceTimersByTime(50);
        debouncedReindex(100);
        vi.advanceTimersByTime(50);

        // Should not have fired yet (second call reset the timer)
        expect(dispatch).not.toHaveBeenCalled();

        vi.advanceTimersByTime(50);
        expect(dispatch).toHaveBeenCalledTimes(1);
    });
});
