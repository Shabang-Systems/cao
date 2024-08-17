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

import { ThemeContext } from "@contexts";

import "./editor.css";
import strings from "@strings";



export default function Editor( { onChange, onSelectionChange, defaultValue, value } ) {
    const [code, setCode] = useState(value ? value : defaultValue);
    const [selection, setSelection] = useState(null);
    const { dark } = useContext(ThemeContext);
    const cm = useRef(null);

    class SimpleWidget extends WidgetType {
        toDOM() {
            const element = document.createElement('div');
            element.className = 'task-divider';
            function modify(e) {
                if (element.className.includes("focused")) {
                    element.className = "task-divider";
                } else {
                    element.className = "task-divider focused";
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
        <div className="cm-mountpoint">
            <CodeMirror
                ref={cm}
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
                    StateField.define({
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
                                    widget: new SimpleWidget()
                                }).range(x.from)
                            ));
                        },
                        provide: f => EditorView.decorations.from(f)
                    })
                ].concat(dark ? [] : [ githubLight ])} />
        </div>
    );
}
