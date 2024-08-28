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

export default function TagBar( { defaultValue, onNewTags } ) {
    const [text, setText] = useState((defaultValue && defaultValue.length > 0) ?
                                     defaultValue.join(",")+"," : "");
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
                        onNewTags(value.split(",").filter((x)=> x.trim().length > 0));
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
