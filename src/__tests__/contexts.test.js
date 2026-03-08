import { describe, it, expect } from 'vitest';
import { ThemeContext, ConfigContext, LogoutContext, EditingContext } from '../contexts.js';

describe('contexts', () => {
    it('should export ThemeContext', () => {
        expect(ThemeContext).toBeDefined();
    });

    it('should export ConfigContext', () => {
        expect(ConfigContext).toBeDefined();
    });

    it('should export LogoutContext', () => {
        expect(LogoutContext).toBeDefined();
    });

    it('should export EditingContext', () => {
        expect(EditingContext).toBeDefined();
    });

    it('EditingContext should have default methods', () => {
        const defaults = EditingContext._currentValue;
        expect(typeof defaults.onFocus).toBe('function');
        expect(typeof defaults.onBlur).toBe('function');
        expect(typeof defaults.isEditing).toBe('function');
        expect(defaults.isEditing()).toBe(false);
    });
});
