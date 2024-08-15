import { useState, useEffect } from "react";
import Editor from "@components/editor.jsx";

import { useSelector, useDispatch } from 'react-redux';
import { set, select } from "@api/capture.js";

import "./Capture.css";

export default function Capture() {
    const [ captureID, setCaptureID ] = useState(0);

    const count = useSelector((state) =>
        state.capture.scratchpads.length
    );

    const inboxText = useSelector((state) =>
        state.capture.scratchpads[captureID]
    );

    const selectionText = useSelector((state) =>
        state.capture.selection ? state.capture.selection : ""
    );

    const dispatch = useDispatch();


    return (
        <div className="cursor-text w-full h-full">
            <Editor
                value={inboxText}
                onChange={(x) => dispatch(set({idx: captureID,
                                               text: x}))}
                onSelectionChange={(sel) => {
                    if(sel != null) dispatch(select(sel[0]));
                    else dispatch(select(sel));
                }}
            />
            <div className="absolute" style={{top: "10px", right: "20px",
                                              zIndex: 20000,
                                              paddingTop: 20, paddingRight: 5}}>
                <ul className="captureid-wrapper">
                    {
                        [...Array(count).keys()].map((x) => {
                            return (
                                <li className={"captureid-dot " + (
                                    x == captureID ? "active" : ""
                                )}></li>
                            );
                        })
                    }
                </ul> 
                <div>
                </div>
            </div>

            <div className="absolute font-bold" style={{bottom: "20px", zIndex: 20000}}>
                { selectionText }
            </div>
        </div>

    );
}
