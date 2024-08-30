import { useEffect, useState, useCallback } from 'react';

import "./datepicker.css";
import strings from "@strings";

import { hydrateCalendar } from "@api/utils/date";

import moment from "moment";

export default function DatePicker({}) {
    // TODO will this break during day changes (i.e. 12am?)
    // probably best to have useSelector(today) eventually
    let [ref, setRef] = useState(new Date());
    let [date, setDate] = useState(new Date());
    let dateSeries = hydrateCalendar(ref.getFullYear(), ref.getMonth());

    const forward = useCallback(() => {
        setRef(new Date(ref.getFullYear(), ref.getMonth()+1, 1));
    });
    const backward = useCallback(() => {
        setRef(new Date(ref.getFullYear(), ref.getMonth(), 0));
    });


    useEffect(() => {
        // console.log(hydrateCalendar(2023, 8));
    }, []);

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
                <div className="datepicker-header-text">
                    {moment(ref).format("MMMM yyyy")}
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
                         onClick={() => setDate(new Date(ref.getFullYear(),
                                                         ref.getMonth(),
                                                         x))}
                         className={"dategrid-cell" +
                                    ((ref.getFullYear() == date.getFullYear() &&
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
        </div>
    );
}
