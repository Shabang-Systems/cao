import "./Settings.css";
import strings from "@strings";

import { setHorizon } from "@api/store.js";
import { setCalendars } from "@api/events.js";
import { useDispatch, useSelector } from "react-redux";

import { LogoutContext }  from "../contexts.js";
import { useContext } from "react";

export default function Settings({}) {
    const dispatch = useDispatch();
    const horizon = useSelector((state) => state.ui.horizon);
    const calendars = useSelector((state) => state.events.calendars.join(","));
    const logout = useContext(LogoutContext).logout;

    return (
        <div className="settings-main">
            <div className="settings-inner">
                <h1 className="callout">{strings.VIEWS__SETTINGS_SETTINGS}</h1>
                <div className="settings-entry"><span>{strings.VIEWS__SETTINGS_HORIZON}</span>
                    <input value={horizon} onChange={(e) => {
                        let n = Number(e.target.value);
                        // check if its nan
                        if (n == n && n >= 1) {
                            dispatch(setHorizon(n));
                        }
                    }}></input></div>
                <div className="settings-entry"><span>{strings.VIEWS__SETTINGS_CALENDARS}</span><input style={{fontFamily: "monospace"}} value={calendars} onChange={(e) => {
                    dispatch(setCalendars(e.target.value.split(",").map(x => x.trim()).filter(x => x!="")));
                }}></input></div>
                <div className="button inline-block logout cursor-pointer" onClick={logout}><i className="fa-solid fa-person-through-window icon" /> &nbsp;{strings.VIEWS__SETTINGS_LOGOUT}</div>
                <br />
                <br />
                <br />
                <span className="settings-bottom">#!/cao &nbsp;&nbsp; | &nbsp;&nbsp; ©{(new Date()).getFullYear()} Shabang Systems, LLC. All rights reserved except where prohibited by applicable law.</span>
            </div>
        </div>
    );
}

