import strings from "@strings";
import "./Auth.css";

import { open, save, message } from '@tauri-apps/api/dialog';
import { exists, BaseDirectory } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';

import moment from 'moment';
import { useCallback } from "react";

function getGreeting() {
    let time = new Date();
    if (time.getHours() < 12) {
        return strings.TEMPORAL_GREETINGS[0];
    } else if (time.getHours() < 19) {
        return strings.TEMPORAL_GREETINGS[1];
    } else  {
        return strings.TEMPORAL_GREETINGS[2];
    }
}

export default function Auth( { onAuth } ) {
    const greeting = getGreeting();

    const openCao = useCallback(async () => {
        let res = await open({
            filters: [{
                name: "cao",
                extensions: ['cao']
            }],
            multiple: false,
        });
        let success = await invoke("load", {path: res});

        if (res) {
            if (success) {
                onAuth(res);
            } else {
                await message(strings.VIEWS__AUTH_MALFORM_SUBHEAD, {
                    title: strings.VIEWS__AUTH_MALFORM_HEAD, type: 'error'
                });
            }
        }
    });

    const bootstrapCao = useCallback(async () => {
        let res = await save({
            filters: [{
                name: "cao",
                extensions: ['cao']
            }],
            multiple: false,
        });
        if (res) {
            await invoke("bootstrap", {path: res});
            console.log(res);
            onAuth(res);
        }
    });


    return (
        <div className="flex items-center justify-center h-full w-full">
            <div className="header-callout">
                <div className="header-head"><span>{greeting}</span>{strings.VIEWS__AUTH_WELCOME}</div>
                <br />
                <div className="header-subhead">{strings.VIEWS__AUTH_HAPPY}</div>
                <div className="header-subhead">{strings.VIEWS__AUTH_PLEASE}
                    <div onClick={openCao} className="button inline">{strings.VIEWS__AUTH_SELECT}</div> or <div onClick={bootstrapCao} className="button inline">{strings.VIEWS__AUTH_CREATE}</div>
                    {strings.VIEWS__AUTH_WORKSPACE}.</div>
                <div className="header-subhead data">{strings.VIEWS__AUTH_DATA}</div>
                <br />
                <div className="copyright">
                    ©{(new Date()).getFullYear()} Shabang Systems, LLC. All rights reserved except where prohibited by applicable law.</div>
            </div>
        </div>
    );
}
