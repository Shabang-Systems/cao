import { describe, it, expect } from 'vitest';
import strings from '../strings.js';

describe('strings', () => {
    it('should have temporal greetings for all time periods', () => {
        expect(strings.TEMPORAL_GREETINGS).toHaveLength(3);
    });

    it('should have days of week short for all 7 days', () => {
        const days = strings.DAYS_OF_WEEK_SHORT;
        expect(Object.keys(days)).toHaveLength(7);
        for (let i = 0; i < 7; i++) {
            expect(days[i]).toBeDefined();
        }
    });

    it('should have REFRESH_CAL tooltip', () => {
        expect(strings.TOOLTIPS.REFRESH_CAL).toBeDefined();
    });

    it('should have all required view strings', () => {
        expect(strings.VIEWS__ACTION).toBeDefined();
        expect(strings.VIEWS__BROWSER).toBeDefined();
        expect(strings.VIEWS__SETTINGS_SETTINGS).toBeDefined();
        expect(strings.VIEWS__DUE_SOON).toBeDefined();
        expect(strings.VIEWS__SCHEDULED).toBeDefined();
    });

    it('should have all tooltip entries', () => {
        const tooltips = strings.TOOLTIPS;
        expect(tooltips.ACTION).toBeDefined();
        expect(tooltips.BROWSE).toBeDefined();
        expect(tooltips.SETTINGS).toBeDefined();
        expect(tooltips.TASKS_MODE).toBeDefined();
        expect(tooltips.CALENDAR_MODE).toBeDefined();
        expect(tooltips.PREVIOUS_DAY).toBeDefined();
        expect(tooltips.NEXT_DAY).toBeDefined();
    });

    it('should have date format strings', () => {
        expect(strings.DATETIME_FORMAT).toBeDefined();
        expect(strings.DATETIME_FORMAT_LONG).toBeDefined();
        expect(strings.DATE_FORMAT_LONG).toBeDefined();
        expect(strings.DATE_FORMAT_SHORT).toBeDefined();
        expect(strings.TIME_FORMAT).toBeDefined();
    });

    it('should have free day messages', () => {
        expect(strings.VIEWS__ACTION_FREE.length).toBeGreaterThan(0);
    });
});
