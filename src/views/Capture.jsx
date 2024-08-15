import { useState, useEffect } from "react";

import Editor from "@components/editor.jsx";

export default function Capture() {
    const [ inboxText, setInboxText ] = useState("");
    const [ selectionText, setSelectionText ] = useState("");

    return (
        <div className="cursor-text w-full h-full">
            <Editor
                value={inboxText}
                onChange={setInboxText}
                onSelectionChange={(sel) =>
                    {if (sel) setSelectionText(sel[0]);
                     else setSelectionText("");}}
            />
            <div className="absolute font-bold" style={{bottom: "20px", zIndex: 20000}}>
                { selectionText }
            </div>
        </div>

    );
}
