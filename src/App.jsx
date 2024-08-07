import { useState, useEffect } from "react";

import Editor from "./components/editor.jsx";


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
        <div className="w-screen h-screen cursor-text">
            <Editor value={WORLD.node[0]} onChange={WORLD.node[1]} />
        </div>
    );
}

export default App;
