import { useState, useEffect } from "react";
import Editor from "@components/editor.jsx";

import { useSelector, useDispatch } from 'react-redux';
import { set, select, pop, grow, view } from "@api/capture.js";

import "./Capture.css";

export default function Capture() {
    const scratchpad = useSelector((state) =>
        state.capture.scratchpads[state.capture.current]
    );

    const length = useSelector((state) =>
        state.capture.scratchpads.length
    );

    const captureID = useSelector((state) =>
        state.capture.current
    );

    const selectionText = useSelector((state) =>
        state.capture.selection ? state.capture.selection : ""
    );

    const dispatch = useDispatch();


    return (
        <div className="cursor-text w-full h-full">
            <Editor
                value={scratchpad}
                onChange={(x) => dispatch(set(x))}
                onSelectionChange={(sel) => {
                    if(sel != null) dispatch(select(sel[0]));
                    else dispatch(select(sel));
                }}
            />
            <div className="absolute captureid-outer" style={{top: "10px", right: "10px",
                                                              zIndex: 20000,
                                                              paddingTop: 20, paddingRight: 5}}>
                <div className="mb-3">
                    <div className="button" onClick={() => {
                        if (scratchpad == "") {
                            dispatch(pop());
                        } else {
                            dispatch(view(captureID-1));
                        }
                    }}>
                        <i className="fa-solid fa-chevron-up"></i>
                    </div>
                    <div className="button" onClick={() => {
                        if (captureID == length - 1 ) {
                            dispatch(grow());
                        } else {
                            dispatch(view(captureID+1));
                        }
                    }}>
                        <i className="fa-solid fa-chevron-down"></i>
                    </div>
                </div>
                <ul className="captureid-wrapper">
                    {
                        [...Array(length).keys()].map((x) => {
                            return (
                                <li key={x} className={"captureid-dot " + (
                                    x == captureID ? "active" : ""
                                )}></li>
                            );
                        })
                    }
                </ul> 

            </div>

            <div className="absolute font-bold" style={{bottom: "20px", zIndex: 20000}}>
                {/* {scratchpads[captureID]} */}
            </div>
        </div>

    );
}
