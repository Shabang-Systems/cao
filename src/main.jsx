import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import { appWindow } from "@tauri-apps/api/window";


ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
            <App />
    </React.StrictMode>
);
