import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import { appWindow } from "@tauri-apps/api/window";

import store from "@api/store.js";
import { Provider } from 'react-redux';


ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <Provider store={store}>
            <App />
        </Provider>
    </React.StrictMode>,
);
