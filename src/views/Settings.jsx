import "./Settings.css";
import "./Action.css";

import strings from "@strings";

import { setHorizon } from "@api/ui.js";
import { setCalendars } from "@api/events.js";
import { useDispatch, useSelector } from "react-redux";

import { LogoutContext }  from "../contexts.js";
import { useContext, useEffect, useState } from "react";
import { getVersion, getTauriVersion } from '@tauri-apps/api/app';

export default function Settings({}) {
    const [version, setVersion] = useState("");
    const [tauriVersion, setTauriVersion] = useState("");

    useEffect(() => {
        (async () => {
            let tauriVersion = await getTauriVersion();
            let version = await getVersion();
            setVersion(version);
            setTauriVersion(tauriVersion);
        })();
    });

    const dispatch = useDispatch();
    const horizon = useSelector((state) => state.ui.horizon);
    const calendars = useSelector((state) => state.events.calendars);
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
                <div className="settings-entry"><span>{strings.VIEWS__SETTINGS_CALENDARS}</span>
                    {calendars.map((x,i) =>
                        <input style={{fontFamily: "monospace", width: "100%", marginTop: 5}} key={x} value={x} onChange={(e) => {
                            let copy = calendars.concat([]);
                            copy[i] = e.target.value;
                            copy = copy.map(x => x.trim()).filter(x => x!="");
                            dispatch(setCalendars([...new Set(copy)]));
                        }}></input>
                    )}
                    <div className="horizon-switch" style={{paddingLeft: 7, paddingTop: 6}}>
                        <div className="button" onClick={() => {
                            let copy = calendars.concat([]);
                            if (copy.length > 0) {
                                copy.pop();
                                dispatch(setCalendars(copy));
                            }
                        }} data-tooltip-id="rootp" data-tooltip-content={strings.TOOLTIPS.DECREASE_CAL}>
                            <i className="fa-solid fa-minus"></i>
                        </div>
                        <div
                            className="button" onClick={() => {
                                dispatch(setCalendars(calendars.concat([""])));
                            }} data-tooltip-id="rootp"  data-tooltip-content={strings.TOOLTIPS.INCREASE_CAL}>
                            <i className="fa-solid fa-plus"></i>
                        </div>

                    </div>


                </div>
                <div className="button inline-block logout cursor-pointer" onClick={logout}><i className="fa-solid fa-person-through-window icon" /> &nbsp;{strings.VIEWS__SETTINGS_LOGOUT}</div>
                <br />
                <br />
                <br />
                <span className="settings-bottom">
                    <span style={{float: "left"}}>#!/cao | build {version} | tauri {tauriVersion}</span><span style={{float: "right"}}>#!/Shabang</span></span>
            </div>
        </div>
    );
}

