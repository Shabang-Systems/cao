import { useState, useRef, forwardRef } from "react";

import "./datemodal.css";
import DatePicker from "./datepicker.jsx";

import { useOutsideAlerter } from "./utils.js";

export default forwardRef(function DateModal({ onDate, initialDate, onClose }, ref) {
    let [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    if (ref) {
        ref.current = {
            setOpen
        };
    }

    useOutsideAlerter(wrapperRef, () => {
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

