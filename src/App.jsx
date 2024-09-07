//// utiltiies ////
import { useState, useEffect, useCallback, useContext, createContext } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { confirm } from '@tauri-apps/api/dialog';

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
import { Provider, useSelector, useDispatch } from 'react-redux';
import { ThemeContext, ConfigContext } from "./contexts.js";
import store from "@api/store.js";
import { snapshot } from "@api/utils.js";

//// views ////
import Capture from "@views/Capture.jsx";
import Browser from "@views/Browser.jsx";
import Auth from "@views/Auth.jsx";
import Action from "@views/Action.jsx";

//// components ////
import Load from "@components/load.jsx";
import { Tooltip } from 'react-tooltip';
import { ErrorBoundary, GlobalErrorModal } from "@components/error.jsx";

//// styles ////
import "./theme.css";
import "./app.css";

//// text ////
import strings from "@strings";

//// native ////
import { invoke } from '@tauri-apps/api/tauri';

const LogoutContext = createContext({logout: () => {}});


function RoutableMain() {
    const logout = useContext(LogoutContext).logout;
    const loc = useLocation();

    const ready = useSelector((state) => {
        return state.ui.ready;
    });
    const dispatch = useDispatch();

    // generate the initial snapshot
    useEffect(() => {
        dispatch(snapshot());
        // we also want to update all queries every minute
        // in order to make sure due days/alerts/etc. stay accurate
        let ci = setInterval(() => {
            dispatch({type: "global/reindex"});
        }, 60000);

        return () => clearInterval(ci);
    }, []);

    return (
        ready == true ?
            <div id="routable-main" className="h-full">
                <div className="bottom-nav absolute" style={{bottom: "10px", left: "10px",
                                                             zIndex: 20000}}>
                    <Link to={"/"} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.ACTION}>
                        <div className={"bottom-nav-button"+(loc.pathname == "/" ? " active" : "")}>
                            <i className="fa-solid fa-person-running"></i>
                        </div>
                    </Link>
                    <Link to={"/capture"} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.CAPTURE}>
                        <div className={"bottom-nav-button"+(loc.pathname == "/capture" ? " active" : "")}>
                            <i className="fa-solid fa-inbox"></i>
                        </div>
                    </Link>
                    <Link to={"/browse"} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.BROWSE}>
                        <div className={"bottom-nav-button"+(loc.pathname == "/browse" ? " active" : "")}>
                            <i className="fa-solid fa-layer-group"></i>
                        </div>
                    </Link>
                    <div  data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.LOGOUT} onClick={logout}>
                        <div className={"bottom-nav-button"}>
                            <i className="fa-solid fa-person-through-window" />
                        </div>
                    </div>

                </div>
                <Outlet />
            </div> : (ready == false ? <Load /> :
                      <GlobalErrorModal error={JSON.stringify(ready,
                                                              Object.getOwnPropertyNames(ready),
                                                              4)}/>)
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
                element: <Action/>
            },
            {
                path: "/capture",
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
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        appWindow.theme().then((x) => {
            setIsDark(x == "dark");
        });
        const unlistenFuture = appWindow.onThemeChanged(({ payload: theme }) => {
            setIsDark(theme == "dark");
        });

        let workspace = localStorage.getItem("cao__workspace");
        if (workspace) {
            (async () => {
                let success = await invoke("load", {path: workspace});
                if (success) {
                    setIsReady(true);
                }
            })();
        }

        return () => {
            unlistenFuture.then((x) => x());
        };
    }, []);

    let auth = useCallback((path) => {
        localStorage.setItem("cao__workspace", path);
        setIsReady(true);
    });



    return (
        <Provider store={store}>
            <ThemeContext.Provider value={{
                dark: isDark
            }}>
                <LogoutContext.Provider value={{logout: async () => {
                    const confirmed = await confirm('', 'Do you want to logout?');
                    if (confirmed) {
                        setIsReady(false);
                        localStorage.removeItem("cao__workspace");
                    }
                }}}>
                    <ConfigContext.Provider value={{
                        dueSoonDays: 1
                    }}>
                        <Tooltip id="rootp" />
                        <div id="theme-box" className={isDark ? "dark" : ""}>
                            <div className={"global w-screen h-screen"}>
                                <div id="top-hide"></div>
                                {
                                    isReady ?
                                        <RouterProvider router={router}/> :
                                    <Auth onAuth={auth} />
                                }
                            </div>

                        </div>
                    </ConfigContext.Provider>
                </LogoutContext.Provider>
            </ThemeContext.Provider>
        </Provider>
    );
}

export default App;
