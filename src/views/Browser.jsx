import { useSelector, useDispatch } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';

import { abtib } from "@api/tasks.js";
import { insert } from "@api/tasks.js";

import Task from "@components/task.jsx";

import strings from "@strings";

import { set, pop, grow, view } from "@api/browse.js";

import "./Browser.css";
import "./Capture.css";
import { useEffect, useState, useCallback } from 'react';

export default function Browser() {
    let entries = useSelector((s) => s.browse.entries);
    const dispatch = useDispatch();
    const isLoading = useSelector((s) => s.tasks.loading);
    const currentQuery = useSelector(createSelector(
        [(state) => state.browse.searches[state.browse.current]],
        (res) => res?res:{},
        {devModeChecks: {identityFunctionCheck: 'never'}}
    ));
    const length = useSelector((state) =>
        state.browse.searches.length
    );
    const searches = useSelector((state) =>
        state.browse.searches
    );

    const captureID = useSelector((state) =>
        state.browse.current
    );

    const [searchValue, setSearchValue] = useState("");

    const contextualDispatch = useCallback(() => {
        let tags = [];
        if (currentQuery.tags) {
            tags = currentQuery.tags.map(x => x.trim());
        }
        let text = "";
        if (currentQuery.query_regexp) {
            text = currentQuery.query_regexp.trim();
        }
        dispatch(insert({
            tags: tags,
            content: text,
            completed: currentQuery.availability == "Done"
        }));
    });

    const executeQuery = useCallback((e) => {
        let text = e.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
        setSearchValue(text);
        let orig = text.repeat(1);

        let matches = text.match(/@([\w-_]+|"[\w -_]+")/g);
        let tags = matches ? matches.map(x => x.replace("@", "").replaceAll('"', "")) : [];

        // deep copy the string
        let rest = text.repeat(1);
        if (matches) {
            matches.forEach((e) => {
                rest = rest.replaceAll(e, "").trim();
            });
        }
        
        let newQuery = {
            ...currentQuery,
            query_regexp: rest,
            query_text: orig,
            tags
        };

        dispatch(set(newQuery));
    });

    const [availability, setAvailbility] = useState(currentQuery.availability ? currentQuery.availability : "Incomplete");
    useEffect(() => {
        let newQuery = {
            ...currentQuery,
            availability
        };
        dispatch(set(newQuery));
    }, [availability]);
    const [order, setOrder] = useState(currentQuery.order && currentQuery.order.order ? currentQuery.order.order : "Captured");
    const [ascending, setAscending] = useState(currentQuery.order && currentQuery.order.ascending ? currentQuery.order.ascending : false);
    useEffect(() => {
        let newQuery = {
            ...currentQuery,
            order: { order, ascending }
        };
        dispatch(set(newQuery));
    }, [order, ascending]);

    useEffect(() => {
        setSearchValue(currentQuery.query_text ? currentQuery.query_text : "");
        setOrder(currentQuery.order && currentQuery.order.order ? currentQuery.order.order : "Captured");
        setAvailbility(currentQuery.availability ? currentQuery.availability : "Incomplete");
        setAscending(currentQuery.order && currentQuery.order.ascending ? currentQuery.order.ascending : false);
    }, [currentQuery]);


    // if we just abtib'd, we should set the initial focus of
    // the first element as True because we want it to open extended
    let [justAbtibd, setJustAbtibd] = useState(false);

    return (
        <div className="m-12">
            <div className="mr-8">
                <div className="capture-cm">
                    <input
                        value={searchValue}
                        onChange={(e) => executeQuery(e.target.value)}
                        className="capture-cm-box"
                        placeholder={strings.VIEWS__BROWSER}
                        autoCorrect="off" />
                </div>
                <div className="capture-options">
                    <div className="capture-options-wrapper">
                        <i className="fa-solid fa-filter" />
                        <select className="capture-options-select"
                                value={availability}
                                onChange={(v) => setAvailbility(v.target.value)}>
                            <option className="capture-options-option" value="Incomplete">Incomplete</option>
                            <option className="capture-options-option" value="Available">Available</option>
                            <option className="capture-options-option" value="Done">Completed</option>
                            <option className="capture-options-option" value="All">All Tasks</option>
                        </select>
                    </div>
                    <div className="capture-options-wrapper">
                        <i className="fa-solid fa-arrow-down-short-wide" />
                        <select
                            value={order}
                            onChange={(v) => setOrder(v.target.value)}
                            className="capture-options-select">
                            <option className="capture-options-option" value="Due">Due Date</option>
                            <option className="capture-options-option" value="Start">Start Date</option>
                            <option className="capture-options-option" value="Captured">Creation</option>
                            <option className="capture-options-option" value="Scheduled">Scheduled</option>
                        </select>
                    </div>
                    <div className="capture-options-wrapper">
                        <i className="fa-solid fa-sort" />
                        <select
                            onChange={(v) => setAscending(v.target.value == "ascending")}
                            value={ascending ? "ascending" : "descending"}
                            className="capture-options-select">
                            <option className="capture-options-option" value="descending">Descending</option>
                            <option className="capture-options-option" value="ascending">Ascending</option>
                        </select>
                    </div>
                </div>
                <div>
                    <div className="task-divider"
                         style={{padding: "0 0 10px 0"}}
                         onClick={() => {
                        setJustAbtibd(true);
                        contextualDispatch();
                    }}><div className="task-divider-line"></div></div>

                    {entries.map((x, indx) => (
                        <div key={x.id}>
                            <Task
                                task={x}
                                initialFocus={justAbtibd && indx == 0}
                                onFocusChange={(x) => {if (!x) setJustAbtibd(false);}}
                            />
                            {indx != (entries.length-1) ?
                             <div className="task-divider focused cursor-default"><div className="task-divider-line"></div></div> : <></>
                            }
                        </div>
                    ))}
                    <div className="task-divider"
                        style={{padding: "10px 0 0 0"}}
                         onClick={() => {
                        setJustAbtibd(true);
                        contextualDispatch();
                    }}><div className="task-divider-line"></div></div>

                </div>
            </div>
            <div className="absolute captureid-outer" style={{top: "10px", right: "10px",
                                                              zIndex: 20000,
                                                              paddingTop: 20, paddingRight: 5}}>
                <div className="mb-3">
                    <div className="button" onClick={() => {
                        if (!currentQuery.query_text) {
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


                </div>
                <ul className="captureid-wrapper">
                    {
                        [...Array(length).keys()].map((x, i) => {
                            return (
                                <li data-tooltip-id="rootp" onClick={() => {
                                    if (!currentQuery.query_text && captureID == length-1) {
                                        dispatch(pop());
                                    } 
                                    dispatch(view(i));
                                }} data-tooltip-content={searches[i].query_text} data-tooltip-place="left" key={x} className={"cursor-pointer captureid-dot " + (
                                    x == captureID ? "active" : ""
                                )}></li>
                            );
                        })
                    }
                </ul> 

            </div>


        </div>
    );
}
