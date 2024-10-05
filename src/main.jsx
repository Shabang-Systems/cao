/*    
 *    
 *     ██  ██  ██     ██  ██████  █████   ██████  
 *    ████████ ██    ██  ██      ██   ██ ██    ██ 
 *     ██  ██  ██   ██   ██      ███████ ██    ██ 
 *    ████████     ██    ██      ██   ██ ██    ██ 
 *     ██  ██  ██ ██      ██████ ██   ██  ██████  
 *    
 *    (c) Shabang Systems, LLC.
 *
 *    This Source Code Form is subject to the terms of the Mozilla Public
 *    License, v. 2.0. If a copy of the MPL was not distributed with this
 *    file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 */
 
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import 'react-tooltip/dist/react-tooltip.css';
const appWindow = getCurrentWebviewWindow()

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
            <App />
    </React.StrictMode>
);
