import { createContext } from 'react';

const ThemeContext = createContext({
    "dark": false
});

const ConfigContext = createContext({
    "dueSoonDays": 1,
    "workHours": 16
});


const LogoutContext = createContext({logout: () => {}});

export { ThemeContext, ConfigContext, LogoutContext };


