//// utiltiies ////
import { useState, useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";

//// routing ////
import {
    createBrowserRouter,
    RouterProvider,
    Route,
    Link,
    Outlet,
    useLocation
} from "react-router-dom";

//// view controlling ////
import { Provider } from 'react-redux';
import { ThemeContext } from "./contexts.js";
import store from "@api/store.js";

//// views ////
import Capture from "@views/Capture.jsx";
import Browser from "@views/Browser.jsx";

//// components ////
import { Tooltip } from 'react-tooltip';
import { ErrorBoundary, GlobalErrorModal } from "@components/error.jsx";

//// styles ////
import "./theme.css";
import "./app.css";

function RoutableMain() {
    const loc = useLocation();

    return (
        <div id="routable-main">
            <Tooltip id="rootp" />
            <div className="bottom-nav absolute" style={{bottom: "10px", left: "10px",
                                                         zIndex: 20000}}>
                <Link to={"/"}>
                    <div className={"bottom-nav-button"+(loc.pathname == "/executor" ? " active" : "")}>
                        <i className="fa-solid fa-person-running"></i>
                    </div>
                </Link>
                <Link to={"/"} data-tooltip-id="rootp" data-tooltip-content="Capture">
                    <div className={"bottom-nav-button"+(loc.pathname == "/" ? " active" : "")}>
                        <i className="fa-solid fa-inbox"></i>
                    </div>
                </Link>
                <Link to={"/browse"} data-tooltip-id="rootp" data-tooltip-content="Browse">
                    <div className={"bottom-nav-button"+(loc.pathname == "/browse" ? " active" : "")}>
                        <i className="fa-solid fa-layer-group"></i>
                    </div>
                </Link>
            </div>
            <Outlet />
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
                <RoutableMain/>
            </ErrorBoundary>
        ),
        children: [
            {
                path: "/",
                element: <Capture/>
            },
            {
                path: "/browse",
                element: <Browser/>
            },
        ]
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
