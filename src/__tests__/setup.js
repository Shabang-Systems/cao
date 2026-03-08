import '@testing-library/jest-dom';

// Mock Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@tauri-apps/api/event', () => ({
    listen: vi.fn(() => Promise.resolve(() => {})),
}));

vi.mock('@tauri-apps/api/webviewWindow', () => ({
    getCurrentWebviewWindow: () => ({
        theme: () => Promise.resolve('dark'),
        onThemeChanged: () => Promise.resolve(() => {}),
    }),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
    confirm: vi.fn(() => Promise.resolve(false)),
    open: vi.fn(() => Promise.resolve(null)),
    save: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@tauri-apps/api/app', () => ({
    getVersion: vi.fn(() => Promise.resolve('0.0.0')),
    getTauriVersion: vi.fn(() => Promise.resolve('2.0.0')),
}));
