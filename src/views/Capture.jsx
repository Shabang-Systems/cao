import { useState } from "react";

import Editor from "../components/editor.jsx";

export default function Capture() {
    const [ inboxText, setInboxText ] = useState("");

    return (
        <div className="cursor-text w-full h-full">
            <Editor value={inboxText} onChange={setInboxText} />
            <div className="absolute font-bold" style={{bottom: "20px", zIndex: 20000}}>
            </div>
        </div>

    );
}
