import { useState, useRef, forwardRef, useEffect, useCallback } from "react";
import "./datemodal.css";
import "./rrule.css";
import { useDetectClickOutside } from 'react-detect-click-outside';
import { RRule } from 'rrule';

import strings from "@strings";

export default forwardRef(function RRuleModal({ onClose, onRRule, initialRrule }, ref) {
    let [open, setOpen] = useState(false);
    let [textValue, setText] = useState(initialRrule ? RRule.fromString(initialRrule).toText() : "");
    let [rrule, setRRule] = useState(initialRrule ? RRule.fromString(initialRrule) : null);


    let rrulify = useCallback((text) => {
        try {
            if (!text || text.trim() == "") {
                setRRule(null);
                if (typeof onRRule == "function") {
                    onRRule(null);
                }
            } else {
                let rule = RRule.fromText(text.trim());
                setRRule(rule);
                if (typeof onRRule == "function") {
                    onRRule(rule.toString());
                }
            }
        } catch (_) {
            setRRule(null);
            if (typeof onRRule == "function") {
                onRRule(null);
            }
        }
    });

    if (ref) {
        ref.current = {
            setOpen
        };
    }

    const rruleBox = useRef(null);

    useEffect(() => {
        if (open && rruleBox.current) {
            rruleBox.current.focus();
        }
    }, [open]);

    const wrapperRef = useDetectClickOutside({ onTriggered: () => {
        if (open) {
            if (typeof onClose == "function") {
                onClose();
            }
            setOpen(false);
        }
    }});
    const changeTimeout = useRef(null);

    return (
        <div className="datemodal rrule-modal" style={{display: open ? "block": "none" }}  ref={wrapperRef}>
            <div className="header">{strings.COMPONENTS__RRULEMODAL_REPEAT}</div>
            <input ref={rruleBox} autoCorrect="off" className="input" placeholder={strings.COMPONENTS__RRULEMODAL_EVERY} value={textValue}

                   onKeyDown={(e) => {
                       if (e.key === "Enter") {
                           setOpen(false);
                           onClose();
                       } else if (e.key === "Escape") {
                           setOpen(false);
                       }
                   }}

                   onChange={(e) => {
                setText(e.target.value);
                if (changeTimeout.current) {
                    clearTimeout(changeTimeout.current);
                    changeTimeout.current = null;
                }
                changeTimeout.current = setTimeout(() => {
                    let lc = e.target.value.trim().toLowerCase();
                    if (!lc.trim().startsWith("every")) {
                        rrulify("every " + lc.trim());
                    } else {
                        rrulify(lc.trim());
                    }
                }, 100);
            }} /> 
            <div className="hint">{rrule ? rrule.toText() : strings.COMPONENTS__RRULEMODAL_NONE}</div>
        </div>
    );
});

