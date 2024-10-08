import { useState, useEffect, useCallback, useRef } from "react";
import Editor from "@components/editor.jsx";

import { useSelector, useDispatch } from 'react-redux';
import { set, select, pop, grow, view } from "@api/capture.js";
import { abtib } from "@api/tasks.js";
import { useNavigate } from 'react-router-dom';

import strings from '@strings';

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
    const navigate = useNavigate();

    const [isCapturing, setIsCapturing] = useState(false);
    const chunkCallback = useRef(() => {});


    return (
        <div className="cursor-text w-full h-full">
            <Editor
                capture={true}
                value={scratchpad}
                onChange={(x) => dispatch(set(x))}
                chunkMode={isCapturing}
                onSelectionChange={(sel) => {
                    if(sel != null) dispatch(select(sel[0]));
                    else dispatch(select(sel));
                }}
                bindChunckCallback={(x) => {
                    chunkCallback.current = x;
                }}
            />
            <div className="absolute captureid-outer" style={{top: "10px", right: "10px",
                                                              zIndex: 20000,
                                                              paddingTop: 20, paddingRight: 5}}>
                <div className="mb-3">
                    <div className={"button " + ((scratchpad == "") ? "disabled cursor-default" : "cursor")} onClick={() => {
                        if (!isCapturing && (scratchpad != "")) {
                            setIsCapturing(true);
                        } else {
                            if (chunkCallback.current) {
                                dispatch(abtib(chunkCallback.current()));
                                dispatch(set(""));
                                dispatch(pop());
                                setIsCapturing(false);
                            }
                        }
                    }} data-tooltip-id={((scratchpad == "") ? "notp": "rootp")} data-tooltip-content={strings.TOOLTIPS.SUBMIT} data-tooltip-place="left">
                        <i className="fa-solid fa-arrow-right-to-bracket"></i>
                    </div>
                    {!isCapturing ?
                        <div className="divider-box">
                            <div className="divider"></div>
                        </div>
                        :
                        <div className="button pointer" onClick={() => {
                            setIsCapturing(false);
                        }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.CANCEL} data-tooltip-place="left">
                        <i className="fa-solid fa-xmark" style={{paddingLeft: 1.8}} />
                        </div>
                    }
                    {!isCapturing ?
                     <>
                         <div className="button" onClick={() => {
                             if (scratchpad == "") {
                                 dispatch(pop());
                             } else {
                                 dispatch(view(captureID-1));
                             }
                         }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.PREVIOUS_SHEET} data-tooltip-place="left">
                             <i className="fa-solid fa-chevron-up"></i>
                         </div>
                         <div className="button" onClick={() => {
                             if (captureID == length - 1 ) {
                                 dispatch(grow());
                             } else {
                                 dispatch(view(captureID+1));
                             }
                         }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.NEXT_SHEET} data-tooltip-place="left">
                             <i className="fa-solid fa-chevron-down"></i>
                         </div>


                     </>: <></>
                    }
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
            </div>
        </div>

    );
}
