import { useState, useEffect } from "react";

import Editor from "./components/editor.jsx";

import "./App.css";


function App() {
    const WORLD =  {
        node: useState("# light it up"),
        left: null,
        right: {
            node: useState("# light it up further"),
            left: null,
            right: null,
            up: null,
            down: null
        },
        up: null,
        down: {
            left: null,
            right: null,
            up: null,
            down: null
        }
    };

    return (
        <div className="global w-screen h-screen">
            <div id="top-hide"></div>
            <div className="cursor-text w-full h-full">
                <Editor value={WORLD.node[0]} onChange={WORLD.node[1]} />
            </div>
        </div>
    );
}

export default App;
