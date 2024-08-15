// utiltiies
import { useState, useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";

// routing
import {
    createBrowserRouter,
    RouterProvider,
    Route,
    Link,
} from "react-router-dom";

// globals
import { ThemeContext } from "./contexts.js";
import store from "@api/store.js";
import { Provider } from 'react-redux';

import Capture from "@views/Capture.jsx";

import "./theme.css";
import "./app.css";

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <Capture/>
        ),
    },
]);

function App() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        appWindow.theme().then((x) => {
            setIsDark(x == "dark");
        });
        const unlistenFuture = appWindow.onThemeChanged(({ payload: theme }) => {
            setIsDark(theme == "dark");
        });

        return () => {
            unlistenFuture.then((x) => x());
        };
    }, []);

    return (
        <Provider store={store}>
            <ThemeContext.Provider value={{
                dark: isDark
            }}>
                <div id="theme-box" className={isDark ? "dark" : ""}>
                    <div className={"global w-screen h-screen"}>
                        <div id="top-hide"></div>
                        <RouterProvider router={router}/>
                    </div>
                </div>
            </ThemeContext.Provider>
        </Provider>
    );
}

export default App;
