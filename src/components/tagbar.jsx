import { useState, useEffect, useContext, useRef } from "react";

import { EditorView } from 'codemirror';
import { placeholder, ViewPlugin,
         Decoration, WidgetType, keymap } from '@codemirror/view';
import { StateEffect, StateField, Prec } from '@codemirror/state';
import CodeMirror, {useCodeMirror} from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { indentUnit } from "@codemirror/language";
import { snippetCompletion } from "@codemirror/autocomplete";
import { githubLight } from '@uiw/codemirror-theme-github';
import ReactDOM from "react-dom/client";
import * as events from '@uiw/codemirror-extensions-events';

import { ThemeContext } from "@contexts";

import { MatchDecorator } from "@codemirror/view";


import "./tagbar.css";
import strings from "@strings";


class TagWidget extends WidgetType {
    constructor(text) {
        super();
        this.text = text;
    }

    toDOM() {
        let wrap = document.createElement("span");
        wrap.className = "tagbar-tag";
        let box = wrap.appendChild(document.createElement("span"));
        box.innerText = this.text;
        box.className = "tagbar-tag-text";
        return wrap;
    }

    ignoreEvent() {
        return false;
    }
}


const tagMatcher = new MatchDecorator({
    regexp: /(?: ?)(.*?) *(?:[,\R])/g,
    decoration: match => Decoration.replace({
        widget: new TagWidget(match[1]),
    })
});

const tag = ViewPlugin.fromClass(class {
    constructor(view) {
        this.tags = tagMatcher.createDeco(view);
    }

    update(update) {
        this.tags = tagMatcher.updateDeco(update, this.tags);
    }
}, {
    decorations: instance => instance.tags,
    provide: plugin => EditorView.atomicRanges.of(view => {
        return view.plugin(plugin)?.tags || Decoration.none;
    })
});


const FontSizeTheme = EditorView.theme({
    "&": {
        fontSize: "13px"
    }
});

// https://stackoverflow.com/questions/3115982/how-to-check-if-two-arrays-are-equal-with-javascript
const arraysEqual = (a, b) => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.

    for (var i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export default function TagBar( { defaultValue, onNewTags } ) {
    const [text, setText] = useState((defaultValue && defaultValue.length > 0) ?
                                     defaultValue.join(",")+"," : "");
    const oldTags = useRef(defaultValue);
    const { dark } = useContext(ThemeContext);
    const editor = useRef(null);

    return (
        <div className="tagbar-wrapper">
            <CodeMirror
                ref={editor}
                value={text}
                theme={dark ? "dark" : "light"}
                onChange={(value, _) => {
                    if (typeof onNewTags == "function" ) {
                        let tags = value.split(",").filter((x)=> x.trim().length > 0);
                        // if the training thing has no comma, we haven't "commited"
                        // the last tag yet (recalll that tags are comma end delimited)
                        if (value.trim()[value.trim().length-1] != ",") {
                            tags.pop();
                        }
                        // to make sure we don't eagerly prompt when the user's still editing
                        // and also apologies for the huxlytier engineering but WTF js
                        if (!arraysEqual(tags, oldTags.current)) {
                            onNewTags(tags);
                            oldTags.current = tags;
                        }
                    }
                    setText(value);
                }}
                basicSetup={{
                    lineNumbers: false,
                    foldGutter: false,
                    highlightActiveLine: false
                }}
                extensions={[
                    tag,
                    indentUnit.of("    "),
                    markdown({ base: markdownLanguage,
                               codeLanguages: languages }),
                    placeholder(strings.COMPONENTS__TAGBAR_EMPTY),
                    FontSizeTheme,
                    Prec.highest(
                        keymap.of([
                            {
                                key: "Enter",
                                run: (view) => {
                                    const cursor = view.state.selection.main.head;
                                    view.dispatch({
                                        changes:
                                        {
                                            from: cursor,
                                            insert: ","
                                        },
                                        selection: { anchor: cursor + 1 }
                                    });
                                    return true;
                                },
                            },
                        ])
                    )
                    
                ].concat(dark ? [] : [ githubLight ])}
            />
        </div>
    );
}
