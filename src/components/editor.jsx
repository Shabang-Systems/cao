import { useState, useEffect } from "react";

import { EditorView } from 'codemirror';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentUnit } from "@codemirror/language";
import { snippetCompletion } from "@codemirror/autocomplete";

import "./editor.css";

export default function Editor( { onChange, defaultValue, value } ) {
    let [code, setCode] = useState(value ? value : defaultValue);

    return (
        <div className="cm-mountpoint">
            <CodeMirror
                value={value ? value : code}
                basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false
                }}
                onChange={(value, _) => {
                    setCode(value);
                    onChange(value);
                }}
                extensions={[
                    EditorView.lineWrapping,
                    indentUnit.of("    "),
                    markdown({ base: markdownLanguage,
                               codeLanguages: languages }),
                ]} />
        </div>
    );
}
