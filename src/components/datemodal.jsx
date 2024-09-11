import { useState, useRef, forwardRef } from "react";

import "./datemodal.css";
import DatePicker from "./datepicker.jsx";

import { useDetectClickOutside } from 'react-detect-click-outside';

export default forwardRef(function DateModal({ onDate, initialDate, onClose }, ref) {
    let [open, setOpen] = useState(false);

    if (ref) {
        ref.current = {
            setOpen
        };
    }

    const wrapperRef = useDetectClickOutside(() => {
        if (!open) {
            if (typeof onClose == "function") {
                onClose();
            }
            setOpen(false);
        }
    });

    return (
        <div className="datemodal" style={{display: open ? "block": "none" }}  ref={wrapperRef}>
            <DatePicker
                initialDate={initialDate}
                onDate={(d) => (typeof onDate == "function") ? onDate(d) : null}
                onDone={(d) => {
                    if (typeof onDate == "function") {
                        onDate(d);
                    }
                    if (typeof onClose == "function") {
                        onClose();
                    }
                    setOpen(false);
                }} focus={open} />
        </div>
    );
});

