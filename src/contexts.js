import { createContext } from 'react';

const ThemeContext = createContext({
    "dark": false
});

const ConfigContext = createContext({
    "dueSoonDays": 1
});


export { ThemeContext, ConfigContext };


