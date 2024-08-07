import { useState, useEffect, useContext } from "react";

import { EditorView } from 'codemirror';
import { placeholder } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentUnit } from "@codemirror/language";
import { snippetCompletion } from "@codemirror/autocomplete";
import { githubLight } from '@uiw/codemirror-theme-github';

import { ThemeContext } from "../contexts.js";

import "./editor.css";
import strings from "../strings.js";

export default function Editor( { onChange, onSelectChange, defaultValue, value } ) {
    const [code, setCode] = useState(value ? value : defaultValue);
    const [selection, setSelection] = useState(null);
    const { dark } = useContext(ThemeContext);

    useEffect(() => {
        if (typeof onSelectChange == "function") {
            onSelectChange(selection);
        }
    }, [selection]);

    return (
        <div className="cm-mountpoint">
            <CodeMirror
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
                    placeholder(strings.COMPONENTS__EDITOR__CM_PLACEHOLDER)
                ].concat(dark ? [] : [ githubLight ])} />
        </div>
    );
}
