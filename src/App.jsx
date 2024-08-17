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
import Process from "@views/Process.jsx";
import ErrorBoundary from "@components/error.jsx";

import "./theme.css";
import "./app.css";
import { globalShortcut } from "@tauri-apps/api";

import { useSelector } from 'react-redux';

import { useNavigate } from 'react-router-dom';

function GlobalErrorModal({error}) {
    const navigate = useNavigate();
    
    return (
        <div
            id="error-modal"
            className="w-full h-full flex items-center justify-center absolute" style={{zIndex: 1000}}>
            <div className="w-8/12 overflow-y-scroll" style={{maxHeight: "89vh"}}>
                <h1 className="block font-bold text-xl">Aw crap!</h1>
                You have broken cao; bad job. :/ <div className="button inline-block" onClick={() => {
                    window.location.href = "/";
                }}>Travel to Safety</div>
                <br />

                <pre style={{whiteSpace: "pre-wrap", wordWrap: "break-word", fontSize: 10, margin: "20px 0"}}>
                    {error}
                </pre>

            </div>
        </div>
    );
}

const router = createBrowserRouter([
    {
        path: "/",
        element: (
            <ErrorBoundary fallback={(error) =>
                <GlobalErrorModal error={JSON.stringify(error,
                                                        Object.getOwnPropertyNames(error), 4)}/>}>
                <Capture/>
            </ErrorBoundary>
        ),
    },
    {
        path: "/process",
        element: (
            <ErrorBoundary fallback={(error) =>
                <GlobalErrorModal error={JSON.stringify(error,
                                                        Object.getOwnPropertyNames(error), 4)}/>}>
                <Process/>
            </ErrorBoundary>
        ),
    }
]);


function RoutableMain() {
    return (
        <div className={"global w-screen h-screen"}>
            <div id="top-hide"></div>
            <RouterProvider router={router}/>
        </div>

    );

}

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
                    <RoutableMain />
                </div>
            </ThemeContext.Provider>
        </Provider>
    );
}

export default App;
