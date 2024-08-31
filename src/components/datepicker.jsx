import { useEffect, useState, useCallback, useRef } from 'react';

import "./datepicker.css";
import strings from "@strings";

import { hydrateCalendar } from "@api/utils/date";

import Sugar from "sugar-date";

export default function DatePicker({ onDate, onDone, focus, initialDate }) {
    // TODO will this break during day changes (i.e. 12am?)
    // probably best to have useSelector(today) eventually
    let [ref, setRef] = useState(initialDate ? initialDate : new Date());
    let [date, setDate] = useState(initialDate);
    let [timeString, setTimeString] = useState(initialDate?Sugar.Date.format(initialDate, "%I:%M %p"):"");
    let dateSeries = hydrateCalendar(ref.getFullYear(), ref.getMonth());
    let dateField = useRef(null);

    useEffect(() => {
        if (focus && dateField.current) {
            dateField.current.focus();
        }
    }, [focus]);

    const forward = useCallback(() => {
        setRef(new Date(ref.getFullYear(), ref.getMonth()+1, 1));
    });
    const backward = useCallback(() => {
        setRef(new Date(ref.getFullYear(), ref.getMonth(), 0));
    });

    const oldDate = useRef(null);

    useEffect(() => {
        if (oldDate.current != date) {
            if (typeof onDate == "function")  {
                onDate(date);
                oldDate.current = date;
            }
        }
    }, [date]);

    return (
        <div className="datepicker">
            <div className="datepicker-header">
                <div onClick={backward}
                     style={{padding: 0, margin: 0}}
                     className="dategrid-cell prefix">
                    <div
                        style={{padding: 0, margin: 0}}
                        className="dategrid-cell-text">
                        <i className="fa-solid fa-angle-left" />
                    </div>
                </div>
                <div
                    onClick={() => setRef(new Date())}
                    className="datepicker-header-text cursor-pointer">
                    {Sugar.Date.format(Sugar.Date.create(ref), "%B %Y")}
                </div>
                <div onClick={forward}
                     style={{padding: 0, margin: 0}}
                     className="dategrid-cell prefix">
                    <div
                        style={{padding: 0, margin: 0}}
                        className="dategrid-cell-text">
                        <i className="fa-solid fa-angle-right" />
                    </div>
                </div>
            </div>
            <div className="dategrid">
                {[...Array(7).keys()].map(x =>
                    <div key={x} className="dategrid-annotation">
                        <div className="dategrid-annotation-text">{strings.DAYS_OF_WEEK_SHORT[x]}</div>
                    </div>
                )}
                {dateSeries[0].map(x =>
                    <div key={x+"pref"}
                         onClick={backward}
                         className="dategrid-cell diminished prefix">
                        <div className="dategrid-cell-text">{x}</div>
                    </div>
                )}
                {dateSeries[1].map(x =>
                    <div key={x}
                         onClick={() => {
                             let nd = date ? date : ref;
                             let res = new Date(ref.getFullYear(),
                                                ref.getMonth(),
                                                x,
                                                nd.getHours(),
                                                nd.getMinutes(),
                                                nd.getSeconds());
                             let formatted = Sugar.Date.format(res, "%I:%M %p");
                             setTimeString(formatted);
                             setDate(res);
                         }}
                         className={"dategrid-cell" +
                                    (date && (ref.getFullYear() == date.getFullYear() &&
                                              ref.getMonth() == date.getMonth() &&
                                              x == date.getDate()) ? " active" : "")}>
                        <div className="dategrid-cell-text">{x}</div>
                    </div>
                )}
                {dateSeries[2].map(x =>
                    <div key={x+"suf"}
                         onClick={forward}
                         className="dategrid-cell diminished suffix">
                        <div className="dategrid-cell-text">{x}</div>
                    </div>
                )}
            </div>
            <div className="datepicker-time">
                <input
                    ref={dateField}
                    placeholder={strings.COMPONENTS__DATEPICKER__PICK_TIME}
                    value={timeString}
                    onChange={(e) => setTimeString(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            try {
                                let nd = Sugar.Date.create(e.target.value);
                                let formatted = Sugar.Date.format(nd, "%I:%M %p");
                                let d = date ? date : ref;
                                setTimeString(formatted);
                                setDate(new Date(
                                    d.getFullYear(),
                                    d.getMonth(),
                                    d.getDate(),
                                    nd.getHours(),
                                    nd.getMinutes(),
                                    nd.getSeconds(),
                                ));
                            } catch (e) {
                                console.log(e);
                                setTimeString(Sugar.Date.format(date ? date : ref, "%I:%M %p"));
                            }
                        } else if (e.key === "Escape") {
                            onDone(date);
                        }
                    }}
                    className="datepicker-time-input" />
                <i className="fa-solid fa-xmark datepicker-symbol"
                   data-tooltip-id={"rootp"}
                   data-tooltip-content={strings.TOOLTIPS.RESET}
                   onClick={() => {
                    setTimeString("");
                    setDate(null);
                }} />
                <i className="fa-solid fa-check datepicker-symbol"
                   style={{transform: "translateY(-0.5px)"}}
                   data-tooltip-id={"rootp"}
                   data-tooltip-content={strings.TOOLTIPS.DONE}
                   onClick={() => {
                       if (typeof onDone == "function") {
                           onDone(date);
                       }
                }} />


            </div>
        </div>
    );
}
