import { useState, useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { ThemeContext } from "./contexts.js";
import Capture from "@views/Capture.jsx";

import "./theme.css";
import "./app.css";

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
        <ThemeContext.Provider value={{
            dark: isDark
        }}>
            <div id="theme-box" className={isDark ? "dark" : ""}>
                <div className={"global w-screen h-screen"}>
                    <div id="top-hide"></div>
                    <Capture/>
                </div>
            </div>
        </ThemeContext.Provider>
    );
}

export default App;
