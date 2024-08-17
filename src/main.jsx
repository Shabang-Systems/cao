/*    
 *    
 *     ██  ██  ██     ██  ██████  █████   ██████  
 *    ████████ ██    ██  ██      ██   ██ ██    ██ 
 *     ██  ██  ██   ██   ██      ███████ ██    ██ 
 *    ████████     ██    ██      ██   ██ ██    ██ 
 *     ██  ██  ██ ██      ██████ ██   ██  ██████  
 *    
 *    (c) Shabang Systems, LLC.
 *    All rights reserved except where prohibited by applicable law.
 *
 */
 
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./index.css";
import { appWindow } from "@tauri-apps/api/window";
import 'react-tooltip/dist/react-tooltip.css';

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
            <App />
    </React.StrictMode>
);
