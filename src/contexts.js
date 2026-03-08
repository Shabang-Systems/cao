import { createContext } from 'react';

const ThemeContext = createContext({
    "dark": false
});

const ConfigContext = createContext({
    "dueSoonDays": 1,
    "workHours": 15,
    "blockSize": 2
});


const LogoutContext = createContext({logout: () => {}});

const EditingContext = createContext({
    onFocus: () => {},
    onBlur: () => {},
    isEditing: () => false
});

export { ThemeContext, ConfigContext, LogoutContext, EditingContext };


