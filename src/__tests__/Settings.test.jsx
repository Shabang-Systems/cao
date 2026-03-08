import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LogoutContext } from '../contexts.js';
import Settings from '../views/Settings.jsx';

// Mock Tauri plugin-fs (imported transitively)
vi.mock('@tauri-apps/plugin-fs', () => ({}));

function makeStore(overrides = {}) {
    return configureStore({
        reducer: {
            ui: () => ({ horizon: 8, ...overrides.ui }),
            events: () => ({
                entries: [],
                calendars: ['https://example.com/cal.ics'],
                ...overrides.events,
            }),
        },
    });
}

function renderSettings(storeOverrides = {}) {
    const store = makeStore(storeOverrides);
    return render(
        <Provider store={store}>
            <LogoutContext.Provider value={{ logout: vi.fn() }}>
                <Settings />
            </LogoutContext.Provider>
        </Provider>
    );
}

describe('Settings', () => {
    it('renders settings heading', () => {
        renderSettings();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('renders horizon input with value from store', () => {
        renderSettings();
        const input = screen.getByDisplayValue('8');
        expect(input).toBeInTheDocument();
    });

    it('renders calendar input', () => {
        renderSettings();
        const input = screen.getByDisplayValue('https://example.com/cal.ics');
        expect(input).toBeInTheDocument();
    });

    it('renders calendar refresh button', () => {
        renderSettings();
        // The refresh button has fa-rotate icon
        const refreshIcon = document.querySelector('.fa-rotate');
        expect(refreshIcon).not.toBeNull();
    });

    it('renders logout button', () => {
        renderSettings();
        expect(screen.getByText(/Logout/)).toBeInTheDocument();
    });

    it('renders version info', () => {
        renderSettings();
        // Multiple elements match #!/ (#!/cao and #!/Shabang), so use getAllByText
        const elements = screen.getAllByText(/#!/);
        expect(elements.length).toBeGreaterThan(0);
    });
});
