import { useEffect, useState, useCallback, useRef } from 'react';

import "./datepicker.css";
import strings from "@strings";

import { hydrateCalendar } from "@api/utils/date";

import * as chrono from 'chrono-node';
import moment from "moment";
import { fromCodePoint } from '@uiw/react-codemirror';

export default function DatePicker({ onDate, onDone, focus, initialDate }) {
    // TODO will this break during day changes (i.e. 12am?)
    // probably best to have useSelector(today) eventually
    let [ref, setRef] = useState(initialDate ? initialDate : new Date());
    let [date, setDate] = useState(initialDate);
    let [timeString, setTimeString] = useState(initialDate?moment(initialDate).format(strings.TIME_FORMAT):"");
    let dateSeries = hydrateCalendar(ref.getFullYear(), ref.getMonth());
    let dateField = useRef(null);

    useEffect(() => {
        setRef(initialDate ? initialDate : new Date());
        setDate(initialDate);
        setTimeString(initialDate?moment(initialDate).format(strings.TIME_FORMAT):"");
    }, [initialDate]);


    const today = new Date();

    const parseDate = useCallback((text) => {
        try {
            let parsed = chrono.parse(text, new Date(), { forwardDate: true });
            let nd = parsed[0].start;

            let nd_dateobj = nd.date();
            let formatted = moment(nd_dateobj).format(strings.TIME_FORMAT);
            setTimeString(formatted);

            let new_date;

            // don't store date if the date is entirely implied
            if (nd.impliedValues.day &&
                nd.impliedValues.month &&
                nd.impliedValues.year &&
                !nd.knownValues.weekday) {
                let d = date ? date : ref;
                new_date = new Date(
                    d.getFullYear(),
                    d.getMonth(),
                    d.getDate(),
                    nd_dateobj.getHours(),
                    nd_dateobj.getMinutes(),
                    nd_dateobj.getSeconds(),
                );
            } else {
                new_date = nd_dateobj;
                setRef(new Date(nd_dateobj.getFullYear(), nd_dateobj.getMonth(), 1));
            }
            let d = date ? date : ref;
            if (new_date.getTime() == d.getTime()) {
                onDone(new_date);
            }
            setDate(new_date);
        } catch (e) {
            console.error(e);
            let formatted = moment(date ? date : ref).format(strings.TIME_FORMAT);
            setTimeString(formatted);
        }
    });

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
        if (oldDate.current != date && date != initialDate) {
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
                    {moment(ref).format(strings.YEARMONTH_FORMAT)}
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
                             setTimeString(moment(res).format(strings.TIME_FORMAT));
                             setDate(res);
                         }}
                         className={"dategrid-cell" +
                                    (date && (ref.getFullYear() == date.getFullYear() &&
                                              ref.getMonth() == date.getMonth() &&
                                              x == date.getDate()) ? " active" : "") +
                                    ((ref.getFullYear() == (today).getFullYear() &&
                                      ref.getMonth() == (today).getMonth() &&
                                      x == (today).getDate()) ? " today" : "")}>
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
                    placeholder={date ?
                                 strings.COMPONENTS__DATEPICKER__PICK_TIME :
                                 strings.COMPONENTS__DATEPICKER__PICK_DT}
                    value={timeString}
                    onChange={(e) => setTimeString(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            parseDate(e.target.value);
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
                       if (typeof onDate == "function") onDate(null);
                   }} />
                <i className="fa-solid fa-check datepicker-symbol"
                   style={{transform: "translateY(-0.5px)"}}
                   data-tooltip-id={"rootp"}
                   data-tooltip-content={strings.TOOLTIPS.DONE}
                   onClick={() => {
                       if (typeof onDone == "function") {
                           if (dateField.current) {
                                parseDate(dateField.current.value);
                           }
                           onDone(date);
                       }
                }} />


            </div>
        </div>
    );
}
