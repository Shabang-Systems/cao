import { useState, useEffect, useContext, useRef } from "react";

import { EditorView } from 'codemirror';
import { placeholder, ViewPlugin, Decoration, WidgetType } from '@codemirror/view';
import { StateEffect, StateField } from '@codemirror/state';
import CodeMirror, {useCodeMirror} from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentUnit } from "@codemirror/language";
import { snippetCompletion } from "@codemirror/autocomplete";
import { githubLight } from '@uiw/codemirror-theme-github';
import ReactDOM from "react-dom/client";
import * as events from '@uiw/codemirror-extensions-events';

import { ThemeContext } from "@contexts";

import "./editor.css";
import strings from "@strings";

// god I'm so bad at life
// we have this because codemirror doesn't
// play well with react state refreshes. while
// the proper way to do this (which, TODO) is to add
// extra state fields to the mirror, that's so much more work
// than just having one of these nice global buffers
var lineBuffer = [];

export default function Editor( { onChange, onSelectionChange, defaultValue, value, chunkMode, bindChunckCallback, onFocusChange } ) {
    const [code, setCode] = useState(value ? value : defaultValue);
    const [selection, setSelection] = useState(null);
    const { dark } = useContext(ThemeContext);
    const cm = useRef(null);

    useEffect(() => {
        lineBuffer = [];
    }, []);

    useEffect(() => {
        if (!chunkMode) {
            lineBuffer = [];
        }

        if (typeof bindChunckCallback == "function") {
            bindChunckCallback(() => {
                // compute substrings based on where the lines were sitting
                // we perform a "zip" from pairs of the lineBuffers
                // such that we get each substring; hopefully indexing
                // rules like python wheer its inclusive first one exclusive
                // second one
                let substrings = [0, ...lineBuffer, code.length];
                let offsets = substrings.slice(1);
                // we map with offsets because its the correct length to
                // capture the last thing but not "over"
                return offsets.map((end, i) => {
                    let start = substrings[i];
                    return code.substring(start, end).trim();
                });
            });
        }
    }, [chunkMode]);


    class SimpleWidget extends WidgetType {
        constructor(line) {
            super();
            this.line = line;
            this.active = lineBuffer.includes(this.line);
        }

        toDOM() {
            const element = document.createElement('div');
            element.className = 'task-divider'+(this.active ? " focused" : "");
            let l = this.line;
            function modify(e) {
                if (element.className.includes("focused")) {
                    element.className = "task-divider";
                    lineBuffer = lineBuffer.filter(x => x != l);
                } else {
                    element.className = "task-divider focused";
                    lineBuffer = lineBuffer.concat([l]);
                }
            }
            element.onclick = modify;
            const line = document.createElement('div');
            line.className = 'task-divider-line';
            element.appendChild(line);
            return element;
        }
    }

    useEffect(() => {
        setCode(value);
    }, [value]);

    useEffect(() => {
        if (typeof onSelectionChange == "function") {
            onSelectionChange(selection);
        }
    }, [selection]);

    return (
        <div className="cm-mountpoint" onClick={() => { if (cm.current) {
            cm.current.editor.focus();
        }}}>
            <CodeMirror
                ref={cm}
                editable={!chunkMode}
                value={value ? value : code}
                theme={dark ? "dark" : "light"}
                basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false
                }}
                onChange={(value, _) => {
                    if (typeof onChange == "function" ) onChange(value);
                    setCode(value);
                }}
                onStatistics={({selection: sel, selections, selectedText}) => {
                    if (!selectedText && selection && selection[0]) {
                        setSelection(null);
                    } else if (selectedText && (!selection ||
                                                selections[0] != selection[0])) {
                        setSelection([selections[0], sel.ranges[0]]);
                    } 
                }}
                extensions={[
                    EditorView.lineWrapping,
                    indentUnit.of("    "),
                    markdown({ base: markdownLanguage,
                               codeLanguages: languages }),
                    placeholder(strings.COMPONENTS__EDITOR__CM_PLACEHOLDER),
                    events.content({
                        focus: (evn) => {
                            if (typeof onFocusChange == "function") {
                                onFocusChange(true);
                            }
                        },
                        blur: (evn) => {
                            if (typeof onFocusChange == "function") {
                                onFocusChange(false);
                            }
                        },
                    })
                ].concat(dark ? [] : [ githubLight ])
                            .concat(chunkMode ? [StateField.define({
                                create(state) {
                                    return Decoration.set([
                                    ]);
                                },
                                update(value, tr) {
                                    let starts = [...Array(tr.newDoc.lines).keys()]
                                        .map(x => tr.newDoc.line(x+1))
                                        .filter(x => x.from != 0)
                                    ;
                                    return Decoration.set(starts.map(x =>
                                        Decoration.widget({
                                            block: true,
                                            widget: new SimpleWidget(x.from)
                                        }).range(x.from)
                                    ));
                                },
                                provide: f => EditorView.decorations.from(f)
                            })]: [])} />
            <div className="paragraph-hint" style={{display: chunkMode ? "block": "none"}}>
                {strings.COMPONENTS__EDITOR__PARAGRAPH_HINT} <i className="fa-solid fa-arrow-turn-up"></i>
            </div>
        </div>
    );
}
